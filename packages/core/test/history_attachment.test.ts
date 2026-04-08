import assert from 'node:assert/strict'
import test from 'node:test'
import { HumanMessage } from '@langchain/core/messages'

test('loaded history strips raw image payload kwargs and keeps only text plus fallback markers', async () => {
    const { sanitizeLoadedHistoryFields } = await import(
        new URL(
            '../src/llm-core/memory/message/history_attachment.ts',
            import.meta.url
        ).href
    )

    const result = sanitizeLoadedHistoryFields(
        [
            { type: 'text', text: '看下这张图' },
            {
                type: 'image_url',
                image_url: {
                    url: 'http://127.0.0.1:5140/chatluna-storage/temp/demo.png'
                }
            }
        ],
        {
            images: ['http://127.0.0.1:5140/chatluna-storage/temp/demo.png']
        }
    )

    assert.equal(result.content, '看下这张图\n[attachment kind=image]')
    assert.equal(result.additionalKwargs.images, undefined)
})

test('prepareMessageForHistory rewrites multimodal content into text plus attachment refs', async () => {
    const { prepareMessageForHistory } = await import(
        new URL(
            '../src/llm-core/memory/message/history_attachment.ts',
            import.meta.url
        ).href
    )

    const message = new HumanMessage({
        content: [
            { type: 'text', text: '刚才那张图你再看看' },
            {
                type: 'image_url',
                image_url: {
                    url: 'http://127.0.0.1:5140/chatluna-storage/temp/demo.png'
                }
            }
        ],
        additional_kwargs: {}
    })

    const prepared = await prepareMessageForHistory(
        {
            logger: {
                warn: () => undefined
            },
            qqbotAttachment: {
                archiveMessageAttachments: async () => [
                    {
                        refId: 'att_demo1234',
                        kind: 'image',
                        filename: 'demo.png',
                        storageUrl:
                            'http://127.0.0.1:5140/chatluna-storage/temp/demo.png'
                    }
                ]
            }
        } as any,
        'conv-history-attachment',
        message
    )

    assert.equal(
        prepared.content,
        '刚才那张图你再看看\n[attachment ref=att_demo1234 kind=image name="demo.png"]'
    )
    assert.deepEqual(prepared.additional_kwargs?.qqbot_attachment_refs, [
        {
            refId: 'att_demo1234',
            kind: 'image',
            filename: 'demo.png',
            mimeType: null,
            storageFileId: null,
            storageUrl:
                'http://127.0.0.1:5140/chatluna-storage/temp/demo.png',
            byteSize: null,
            hash: null,
            createdAt: null,
            senderId: null,
            senderName: null
        }
    ])
})
