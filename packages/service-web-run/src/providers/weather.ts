import type { Config } from '../config'
import { z } from 'zod'
import { webError } from '../error'
import type { WebFetch, WebResponse } from '../request'
import type { WeatherArtifact, WeatherOperation } from '../types'

const geocodingResponseSchema = z.object({
    results: z
        .array(
            z.object({
                name: z.string(),
                admin1: z.string().optional(),
                country: z.string().optional(),
                latitude: z.number(),
                longitude: z.number(),
                timezone: z.string()
            })
        )
        .optional()
})

const forecastResponseSchema = z.object({
    timezone: z.string(),
    current: z
        .object({
            time: z.string(),
            temperature_2m: z.number(),
            apparent_temperature: z.number(),
            precipitation: z.number(),
            weather_code: z.number(),
            wind_speed_10m: z.number()
        })
        .optional(),
    daily: z
        .object({
            time: z.array(z.string()),
            weather_code: z.array(z.number()),
            temperature_2m_max: z.array(z.number()),
            temperature_2m_min: z.array(z.number()),
            precipitation_probability_max: z.array(z.number())
        })
        .refine(
            (daily) =>
                [
                    daily.weather_code.length,
                    daily.temperature_2m_max.length,
                    daily.temperature_2m_min.length,
                    daily.precipitation_probability_max.length
                ].every((length) => length === daily.time.length),
            'Daily weather arrays must have equal lengths'
        )
})

export class OpenMeteoWeatherProvider {
    readonly name = 'open-meteo'

    constructor(
        private readonly config: Config,
        private readonly fetcher: WebFetch
    ) {}

    async weather(operation: WeatherOperation, locale: string) {
        const geocode = new URL(
            'https://geocoding-api.open-meteo.com/v1/search'
        )
        geocode.searchParams.set('name', operation.location)
        geocode.searchParams.set('count', '1')
        geocode.searchParams.set('language', locale.split(/[-_]/)[0])
        geocode.searchParams.set('format', 'json')

        const location = (
            await this.get(geocode, 'geocoding', geocodingResponseSchema)
        ).results?.[0]
        if (!location) {
            throw webError({
                operation: 'weather',
                stage: 'provider',
                code: 'location_not_found',
                message: `Weather location was not found: ${operation.location}`,
                provider: this.name
            })
        }

        const forecast = new URL('https://api.open-meteo.com/v1/forecast')
        forecast.searchParams.set('latitude', String(location.latitude))
        forecast.searchParams.set('longitude', String(location.longitude))
        forecast.searchParams.set(
            'current',
            [
                'temperature_2m',
                'apparent_temperature',
                'precipitation',
                'weather_code',
                'wind_speed_10m'
            ].join(',')
        )
        forecast.searchParams.set(
            'daily',
            [
                'weather_code',
                'temperature_2m_max',
                'temperature_2m_min',
                'precipitation_probability_max'
            ].join(',')
        )
        forecast.searchParams.set('timezone', location.timezone)
        forecast.searchParams.set(
            'forecast_days',
            String(operation.duration ?? 7)
        )
        if (operation.start) {
            const end = new Date(`${operation.start}T00:00:00Z`)
            end.setUTCDate(end.getUTCDate() + (operation.duration ?? 7) - 1)
            forecast.searchParams.set('start_date', operation.start)
            forecast.searchParams.set(
                'end_date',
                end.toISOString().slice(0, 10)
            )
        }

        const data = await this.get(
            forecast,
            'forecast',
            forecastResponseSchema
        )
        const resolvedLocation = [
            location.name,
            location.admin1,
            location.country
        ]
            .filter(Boolean)
            .join(', ')

        return {
            type: 'weather',
            location: operation.location,
            resolvedLocation,
            latitude: location.latitude,
            longitude: location.longitude,
            timezone: data.timezone,
            url: forecast.href,
            current:
                data.current == null
                    ? undefined
                    : {
                          time: data.current.time,
                          temperature: data.current.temperature_2m,
                          apparentTemperature:
                              data.current.apparent_temperature,
                          precipitation: data.current.precipitation,
                          weatherCode: data.current.weather_code,
                          windSpeed: data.current.wind_speed_10m
                      },
            daily: data.daily.time.map((date, index) => ({
                date,
                weatherCode: data.daily.weather_code[index],
                temperatureMax: data.daily.temperature_2m_max[index],
                temperatureMin: data.daily.temperature_2m_min[index],
                precipitationProbability:
                    data.daily.precipitation_probability_max[index]
            }))
        } satisfies Omit<
            WeatherArtifact,
            'refId' | 'requestId' | 'sessionId' | 'createdAt'
        >
    }

    private async get<T>(url: URL, code: string, schema: z.ZodType<T>) {
        let response: WebResponse
        try {
            response = await this.fetcher(url, {
                signal: AbortSignal.timeout(this.config.fetchTimeout),
                headers: { 'User-Agent': 'ChatLuna-WebRun/1.0' }
            })
        } catch (err) {
            throw webError({
                operation: 'weather',
                stage: 'provider',
                code: `${code}_request_failed`,
                message: `Open-Meteo ${code} request failed: ${String(err)}`,
                provider: this.name,
                retryable: true
            })
        }
        if (!response.ok) {
            throw webError({
                operation: 'weather',
                stage: 'provider',
                code: `${code}_http_error`,
                message: `Open-Meteo ${code} returned HTTP ${response.status}`,
                provider: this.name,
                httpStatus: response.status,
                retryable: response.status === 429 || response.status >= 500
            })
        }
        const parsed = schema.safeParse(
            await response.json().catch(() => undefined)
        )
        if (!parsed.success) {
            throw webError({
                operation: 'weather',
                stage: 'provider',
                code: `${code}_invalid_response`,
                message: `Open-Meteo ${code} returned an invalid payload`,
                provider: this.name,
                httpStatus: response.status,
                retryable: true
            })
        }
        return parsed.data
    }
}
