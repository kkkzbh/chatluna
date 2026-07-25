## koishi-plugin-chatluna-search-service

## [![npm](https://img.shields.io/npm/v/koishi-plugin-chatluna-search-service)](https://www.npmjs.com/package/koishi-plugin-chatluna-search-service) [![npm](https://img.shields.io/npm/dm/koishi-plugin-chatluna-search-service)](https://www.npmjs.com/package//koishi-plugin-chatluna-search-service)

> ChatLuna 的网络搜索服务插件，支持多源聚合搜索，包括 `Bing` | `Google` | `DuckDuckGo` | `Serper` | `Tavily` | `MediaWiki`

[联网查询插件文档](https://chatluna.chat/ecosystem/plugin/search-service.html)

### Preset V2 knowledge source

启用至少一个搜索 provider 后，本插件注册 `web-search` 作为
`knowledge.sources` 的生产 owner。每次模型请求使用当前用户输入进行查询，并将标题、
URL 与摘要转换为可追踪的 knowledge documents。

```yaml
knowledge:
  sources: [web-search]
```

未注册的 source、缺失的搜索 provider 和 provider 请求失败都会直接返回 typed
error，不会静默返回空结果或切换 provider。
