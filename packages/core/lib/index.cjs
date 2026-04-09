var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/locales/zh-CN.schema.yml
var require_zh_CN_schema = __commonJS({
  "src/locales/zh-CN.schema.yml"(exports2, module2) {
    module2.exports = { $inner: [{ $desc: "bot 配置", botNames: "设置 bot 的名称。(只有第一个名称是实际的 bot 名称，其他名称仅用于触发对话)", isNickname: "是否允许在开头匹配 bot 配置中的昵称来触发对话。", isNickNameWithContent: "是否允许在对话内容里任意匹配 bot 配置中的昵称来触发对话。" }, { $desc: "对话行为选项", allowPrivate: "是否允许在私聊中触发对话。", allowAtReply: "是否允许通过 @ bot 来触发对话。", allowQuoteReply: "是否允许通过引用 bot 的消息来触发对话。", privateChatWithoutCommand: "在私聊中是否允许无需命令直接与 bot 对话。", allowChatWithRoomName: "是否允许使用房间名前缀触发对话。注意：启用此选项可能会显著影响 ChatLuna 的性能，建议配合过滤器仅在特定群组中启用。", randomReplyFrequency: "设置随机回复的频率。", includeQuoteReply: "是否在向模型的请求内容中添加被引用的消息内容", attachForwardMsgIdToContext: "是否将合并转发聊天记录消息的 ID 附加到上下文中。启用后，检测到聊天记录会额外追加一条 [聊天记录] 消息。" }, { isForwardMsg: "是否以合并消息的形式发送 bot 的回复。", forwardMsgMinLength: "合并消息的最小应用长度。为 0 则总是应用。设置大于 0 时，只有发送的文本大于此长度才会转为合并消息。" }, { isReplyWithAt: "当 bot 回复时，是否引用原消息", replyQuoteThreshold: "引用原消息的最小响应时长。为 0 则总是应用。设置大于 0 时，只有响应耗时大于此时长才会引用原消息。" }, { $desc: "对话响应选项", sendThinkingMessage: "是否在请求处理过程中发送等待消息。", sendThinkingMessageTimeout: "设置在模型开始响应前，等待多少毫秒后发送等待消息。", thinkingMessage: "自定义等待消息的内容。", msgCooldown: "设置全局消息冷却时间（单位：秒），用于防止适配器被过于频繁地调用。", messageQueue: "设置是否启用消息队列。启用后当发送了多条消息，并且模型未响应初始消息时，会将将消息缓存合并成一条消息，并等待模型响应后再发送。", messageQueueDelay: "设置消息队列的延迟时间（单位：秒）。为 0 则不启用延迟。开启延迟后，会等待指定时间后才发送消息给模型，如果在此期间内存在未处理的消息，则将消息缓存合并成多条消息发送给模型。", showThoughtMessage: "在使用插件模式或思考模型时，是否显示思考过程。" }, { $desc: "消息渲染选项", outputMode: { $desc: "选择消息回复的渲染输出模式。" }, splitMessage: "是否启用消息分割发送。启用后，回复会被分割成多条消息发送，使其看起来更像普通用户的对话。注意：此选项不支持引用消息、原始模式和图片模式。在启用流式响应时，会进行更细化的消息分割。", censor: "是否启用文本审核服务（需要安装 censor 服务）。", rawOnCensor: "是否在 Post Handler 被触发时，将原始消息发送给模型。", streamResponse: "是否启用流式响应。启用后，bot 会在生成回复的过程中就开始发送消息，而不是等待完全生成后再发送。注意：启用此选项会导致渲染输出模式选项失效，且不支持插件模式。" }, { $desc: "黑名单选项", blackList: { $desc: "设置黑名单列表。请谨慎使用，只对需要拉黑的用户或群启用。1 表示启用黑名单，0 表示不启用黑名单。默认值为 0。" }, blockText: "设置对被拉黑用户的固定回复内容。" }, { $desc: "历史记录选项", infiniteContext: "启用「无限上下文」，当对话接近模型的上下文上限时自动压缩旧消息，保留关键话题和指令并丢弃无关内容。", infiniteContextThreshold: "设置无限上下文的触发阈值（百分比）。当对话历史的 token 数量达到模型上下文上限的该百分比时，将触发压缩。", autoDelete: "是否自动删除长期未使用的房间。", autoDeleteTimeout: "设置自动删除未使用房间的时间阈值（单位：秒）。" }, { $desc: "模型选项", defaultEmbeddings: "设置默认使用的嵌入模型。", defaultVectorStore: "设置默认使用的向量数据库。" }, { $desc: "模板房间选项", autoCreateRoomFromUser: "是否为每个用户自动创建专属房间。", defaultChatMode: "设置默认的聊天模式。", defaultModel: "设置默认使用的聊天模型。", defaultPreset: "设置默认使用的聊天预设。", autoUpdateRoomMode: { $desc: "自动更新房间配置模式。触发后，相关房间的配置将跟随模版房间的配置。", $inner: ["所有房间更新", "仅自动创建房间更新", "禁用更新"] } }, { $desc: "杂项", authSystem: { $desc: "是否启用配额组和用户权限系统（实验性功能）。启用后，各适配器设置的调用限额将失效。", $inner: [true] }, errorTemplate: "设置错误提示消息的模板（此设置在未来版本中可能会有变更）。", voiceSpeakId: "设置使用 vits 服务时的默认发音人 ID。", isLog: "是否启用调试模式。", isProxy: { $desc: "是否启用代理。启用后，ChatLuna 全家桶插件的网络请求将使用此代理。", $inner: [true] } }, [{ $desc: "代理选项", $inner: { proxyAddress: "网络请求的代理地址。填写后，ChatLuna 相关插件的网络服务将使用此代理地址。如不填写，将尝试使用 Koishi 全局配置中的代理设置。" } }], [{ $desc: "配额组选项", $inner: { authUserDefaultGroup: { $desc: "格式为 [权限等级, 初始余额, 授权组名称]。权限等级：0 为 guest，1 为 user，2 为 admin。如不了解，请勿配置。" } } }]] };
  }
});

// src/locales/en-US.schema.yml
var require_en_US_schema = __commonJS({
  "src/locales/en-US.schema.yml"(exports2, module2) {
    module2.exports = { $inner: [{ $desc: "Bot Configuration", botNames: "Set the bot's name. (Only the first name is the actual bot name; other names are only used to trigger conversations.)", isNickname: "Allow matching bot nickname at the beginning of a message to trigger a conversation.", isNickNameWithContent: "Allow matching bot nickname anywhere in the message content to trigger a conversation." }, { $desc: "Conversation Behavior", allowPrivate: "Enable private chat conversations.", allowAtReply: "Enable @mention triggering.", allowQuoteReply: "Enable quote triggering.", privateChatWithoutCommand: "Enable direct conversation in private chats without commands.", allowChatWithRoomName: "Enable room name prefix triggering. Note: May impact performance significantly. Recommended for use with filters in specific groups only.", randomReplyFrequency: "Set random reply frequency (0-100, where 0 means never and 100 means always).", includeQuoteReply: "Include quoted message content in requests sent to the model.", attachForwardMsgIdToContext: 'Attach forward message record IDs to context. When enabled, a "[聊天记录]" marker message will be appended if forward records are detected.' }, { isForwardMsg: "Send bot replies as forwarded messages.", forwardMsgMinLength: "Set minimum length of forwarded messages (characters)." }, { isReplyWithAt: "Quote the original message when the bot replies.", replyQuoteThreshold: "Minimum response time required to quote the original message. Set to 0 to always apply. When greater than 0, the original message will only be quoted if the response time exceeds this threshold." }, { $desc: "Response Options", sendThinkingMessage: "Send waiting message during processing.", sendThinkingMessageTimeout: "Set timeout (ms) for waiting message dispatch.", thinkingMessage: "Customize waiting message content.", msgCooldown: "Set global message cooldown (seconds) to limit adapter calls.", messageQueue: "Enable message queue. When enabled, if multiple messages are sent and the model has not responded to the initial message, the messages will be cached and merged into one message, and will be sent after waiting for the model response.", messageQueueDelay: "Set message queue delay time (seconds). Set to 0 to disable delay. When delay is enabled, the system will wait for the specified time before sending messages to the model. If there are unprocessed messages during this period, they will be cached and merged into multiple messages to send to the model.", showThoughtMessage: "Display thinking message in plugin mode or reasoner model." }, { $desc: "Message Rendering", outputMode: { $desc: "Select message reply rendering mode." }, splitMessage: "Enable message splitting. Splits replies into multiple messages for natural conversation flow. Note: Incompatible with quoted messages, raw mode, or image mode. Stream response enables finer-grained splitting.", censor: "Enable text moderation (requires censor service).", rawOnCensor: "Whether to send the raw message to the model when the Post Handler is triggered.", streamResponse: "Enable stream response. Initiates message sending during reply generation. Note: Disables rendering output mode and incompatible with plugin mode." }, { $desc: "Blacklist Management", blackList: "Configure blacklist. Use cautiously to avoid unintended blocking. The number 1 indicates enabled blacklist. Set to zero value to unenable blacklist.", blockText: "Set fixed reply for blacklisted users." }, { $desc: "History Management", infiniteContext: "Enable automatic Infinite Context compression when history nears the model limit. Preserves critical topics and instructions while discarding noise.", infiniteContextThreshold: "Set the threshold (percentage) for triggering Infinite Context compression. Compression will be triggered when the token count of conversation history reaches this percentage of the model's context limit.", autoDelete: "Enable automatic deletion of inactive rooms.", autoDeleteTimeout: "Set inactivity threshold for room deletion (seconds)." }, { $desc: "Model Configuration", defaultEmbeddings: "Set default embedding model.", defaultVectorStore: "Set default vector database." }, { $desc: "Template Room Configuration", autoCreateRoomFromUser: "Enable automatic room creation per user.", defaultChatMode: "Set default chat mode.", defaultModel: "Set default chat model.", defaultPreset: "Set default chat preset.", autoUpdateRoomMode: { $desc: "Automatic room configuration update mode. When triggered, room settings will follow template room configuration.", $inner: ["Update all rooms", "Update auto-created rooms only", "Disable updates"] } }, { $desc: "Miscellaneous", authSystem: { $desc: "Enable quota group and user permission system (experimental). Overrides adapter call limits.", $inner: [true] }, errorTemplate: "Set error prompt message template (subject to change).", voiceSpeakId: "Set default speaker ID for vits service.", isLog: "Enable debug mode.", isProxy: { $desc: "Enable proxy for ChatLuna family plugin network requests.", $inner: [true] } }, [{ $desc: "Proxy Configuration", $inner: { proxyAddress: "Set proxy address for network requests. Falls back to Koishi global proxy settings if empty." } }], [{ $desc: "Quota Group Configuration", $inner: { authUserDefaultGroup: { $desc: "Format: [permission level, initial balance, authorization group name]. Levels: 0 (guest), 1 (user), 2 (admin). Leave unconfigured if uncertain." } } }]] };
  }
});

// src/locales/zh-CN.yml
var require_zh_CN = __commonJS({
  "src/locales/zh-CN.yml"(exports2, module2) {
    module2.exports = { commands: { chatluna: { description: "ChatLuna 相关指令。", room: { description: "ChatLuna 房间管理。", create: { description: "创建一个新房间。", options: { name: "房间名字。", preset: "房间预设。", model: "房间模型。", chatMode: "房间聊天模式。", password: "房间密码。", visibility: "房间可见性。" }, messages: { confirm_create: "你目前已提供基础参数，是否直接创建房间？如需直接创建房间请回复 Y，如需进入交互式创建请回复 N，其他回复将视为取消。", timeout: "你超时未回复，已取消创建房间。", cancelled: "你已取消创建房间。", enter_name: "请输入你需要使用的房间名，如：我的房间，回复 Q 退出创建。", change_or_keep: "你已经{0}{1}：{2}，是否需要更换？如需更换请回复更换后的{1}，否则回复 N。回复 Q 退出创建。", enter_model: "请输入你需要使用的模型，如：openai/gpt-3.5-turbo，回复 Q 退出创建。", model_not_found: "无法找到模型：{0}，请重新输入。", enter_preset: "请输入你需要使用的预设，如：chatgpt。如果不输入预设请回复 N（则使用默认 chatgpt 预设）。否则回复你需要使用的预设。回复 Q 退出创建。", preset_not_found: "无法找到预设：{0}，请重新输入。", enter_visibility: "请输入你需要使用的可见性，如：private。如果不输入可见性请回复 N（则使用默认 private 可见性）。否则回复需要使用的可见性。(目支持 public, private)，回复 Q 退出创建。", visibility_not_recognized: "无法识别可见性：{0}，请重新输入。", enter_chat_mode: "请输入你需要使用的聊天模式，如：chat。如果不输入聊天模式请回复 N（则使用默认 chat 聊天模式）。否则回复你需要使用的聊天模式。回复 Q 退出创建。", enter_password: "请输入你需要使用的密码，如：123456。如果不输入密码请回复 N（则不设置密码）。否则回复你需要使用的密码。回复 Q 退出设置。", template_room_created: "模板房间创建成功。", room_created: "房间创建成功，房间号为：{0}，房间名为：{1}。", invalid_chat_mode: "无法识别聊天模式：{0}，目前可用的聊天模式有：{1}。请重新输入。回复 Q 退出创建。", action: { input: "输入", set: "设置", select: "选择" }, field: { name: "房间名", model: "模型", preset: "预设", visibility: "可见性", chat_mode: "聊天模式", password: "密码" } } }, delete: { description: "删除一个房间。", arguments: { room: "目标房间。" }, messages: { room_not_found: "未找到指定的房间。", not_room_master: "你不是房间的房主，无法删除房间。", confirm_delete: "你确定要删除房间 {0} 吗？这将会删除房间内的所有消息。并且成员也会被移除。如果你确定要删除，请输入 Y 来确认。", timeout: "操作超时未确认，已自动取消。", cancelled: "已为你取消操作。", success: "已删除房间 {0}。" } }, "auto-update": { description: "设置模版克隆房间的自动更新属性。", options: { room: "指定房间。" }, messages: { room_not_found: "未找到指定的房间。", not_template_clone: "该房间不是模板克隆房间，无法设置自动更新属性。", not_admin: "你不是房间的房主，无法设置自动更新房间。", success: "已设置房间 {0} 的自动更新属性为 {1}。", "invalid-status": "您输入的参数不合法，参数只能为 true 或者 false。" } }, kick: { description: "踢出某个人员在你当前的房间。", messages: { no_room_specified: "你没有在当前环境里指定房间。请使用 chatluna.room.switch 命令来切换房间", not_admin: "你不是房间 {0} 的管理员，无法踢出用户。", success: "已将以下用户踢出房间 {0}：{1}" } }, invite: { description: "邀请进入房间。", messages: { no_room_specified: "你没有在当前环境里指定房间。请使用 chatluna.room.switch 命令来切换房间", not_admin: "你不是房间 {0} 的管理员，无法邀请用户加入。", success: "已邀请用户 {0} 加入房间 {1}。" } }, join: { description: "加入某个房间。", arguments: { id: "房间 ID 或名称。" }, messages: { room_not_found: "未找到指定的房间。", not_in_group: "该房间不在当前群聊中。", private_no_password: "该房间为私密房间。房主未设置密码加入，只能由房主邀请进入，无法加入。", private_group_join: "该房间为私密房间。由于需要输入密码，你无法在群聊中加入。", enter_password: "请输入密码来加入房间 {0}。", timeout: "操作超时未确认，已自动取消。", wrong_password: "密码错误，已为你取消操作。", success: "已加入房间 {0}" } }, leave: { description: "离开当前房间。", arguments: { room: "目标房间。" }, messages: { room_not_found: "未找到指定的房间。", confirm_delete: "检测到你为房主，当你退出房间时，房间将会被删除。如果你确定要删除，请输入 Y 来确认。", timeout: "操作超时未确认，已自动取消。", cancelled: "已为你取消操作。", success: "已退出房间 {0}。您可能需要重新加入或者切换房间。" } }, clear: { description: "清除指定房间的聊天记录。", arguments: { room: "目标房间。" }, messages: { success: "已清除房间 {0} 的聊天记录。", "no-room": "未找到指定的房间。" } }, compress: { description: "手动压缩房间的聊天记录（使用无限上下文）。", arguments: { room: "目标房间。" }, messages: { success: "{0} -> {1}, {2}%", skipped: "未执行压缩。{0} -> {1}, {2}%", no_room: "未找到指定的房间。", failed: "压缩房间 {0} 的聊天记录失败：{1}" } }, set: { description: "设置房间的属性。", options: { name: "房间名字。", preset: "房间预设。", model: "房间模型。", chatMode: "房间聊天模式。", password: "房间密码。", visibility: "房间可见性。" }, messages: { room_not_found: "未找到指定的房间。", not_room_master: "你不是房间的房主，无法设置房间的属性。", confirm_update: "你目前已设置参数，是否直接更新房间属性？如需直接更新请回复 Y，如需进入交互式创建请回复 N，其他回复将视为取消。", timeout: "你超时未回复，已取消设置房间属性。", cancelled: "你已取消设置房间属性。", no_password_in_public: "你无法在非私有房间或群聊中设置密码。", change_or_keep: "你已经选择了{0}：{1}，是否需要更换？如无须更改请回复 N，否则回复更换后的{0}。回复 Q 退出设置。", model_not_found: "无法找到模型：{0}，请重新输入。回复 Q 退出设置。", preset_not_found: "无法找到预设：{0}，请重新输入。回复 Q 退出设置。", invalid_visibility: "无法识别可见性：{0}，请重新输入。回复 Q 退出设置。", enter_password: "请输入你需要使用的密码，如：123456。如果不输入密码请回复 N（则不设置密码）。否则回复你需要使用的密码。回复 Q 退出设置。", success_with_clear: "房间 {0} 已更新，聊天记录已被清空。", invalid_chat_mode: "无法识别聊天模式：{0}，目前可用的聊天模式有：{1}。请重新输入。", failed: "房间 {0} 更新失败。请检查你的设置并重新尝试。", success: "房间 {0} 已更新。", field: { name: "房间名", model: "模型", preset: "预设", visibility: "可见性", chat_mode: "聊天模式", password: "密码" } } }, list: { description: "列出所有你加入的房间。", options: { page: "页码。", limit: "每页数量。" }, messages: { header: "以下是查询到你加入的房间列表：", footer: "你可以使用 chatluna.room.switch [name/id] 来切换当前环境里你的默认房间。", pages: "当前为第 [page] / [total] 页", room_name: "房间名: {0}", room_id: "房间ID: {0}", room_preset: "房间预设: {0}", room_model: "房间模型: {0} \n模型是否可用：{1}", room_visibility: "房间可见性: {0}", room_chat_mode: "房间聊天模式: {0}", room_master_id: "房间创建者ID: {0}", room_availability: "房间可用性：{0}" } }, transfer: { description: "转移房间的房主。", messages: { room_not_found: "未找到指定的房间。", not_room_master: "你不是房间的房主，无法转移房间给他人。", confirm_transfer: "你确定要把房间 {0} 转移给用户 {1} 吗？转移后ta将成为房间的房主，你将失去房主权限。如果你确定要转移，请输入 Y 来确认。", timeout: "操作超时未确认，已自动取消。", cancelled: "已为你取消操作。", success: "已将房间 {0} 转移给用户 {1}。" } }, info: { description: "查看当前房间的信息。", arguments: { room: "目标房间。" }, messages: { room_not_found: "未找到指定的房间。", header: "以下是你目前所在的房间信息", room_name: "房间名: {0}", room_id: "房间ID: {0}", room_preset: "房间预设: {0}", room_model: "房间模型: {0} \n模型是否可用：{1}", room_visibility: "房间可见性: {0}", room_chat_mode: "房间聊天模式: {0}", room_master_id: "房间创建者ID: {0}" } }, switch: { description: "切换到你已经加入了的房间。", arguments: { name: "房间名称或 ID。" }, messages: { success: "已切换到房间 {0}。", room_not_found: "未找到指定的房间。" } }, permission: { description: "修改房间里某人的权限。", options: { room: "指定房间。", user: "目标用户。" }, messages: { room_not_found: "未找到指定的房间。", not_admin: "你不是房间的房主，无法为用户设置权限。", confirm_set: "你确定要为用户 {0} 设置房间 {1} 的权限吗？目前可以设置的权限为 member 和 admin。如果你确定要设置，请输入设置权限的值或首字母大写，其他输入均视为取消。", timeout: "操作超时未确认，已自动取消。", invalid_permission: "你输入的权限值不正确，已自动取消。", success: "已为用户 {0} 设置房间 {1} 的权限为 {2}" } }, mute: { description: "禁言某个用户，不让其发言。", options: { room: "指定房间。" }, messages: { room_not_found: "未找到指定的房间。", not_admin: "你不是房间 {0} 的管理员，无法禁言用户。", success: "已将用户 {0} 在房间 {1} 禁言或解除禁言。" } } }, chat: { description: "ChatLuna 对话相关指令。", text: { description: "与大语言模型进行文本对话。", options: { room: "指定对话的目标房间。", type: "设置消息的渲染类型。" }, examples: ["chatluna chat text -t text 你好，世界！", "chatluna chat text -t voice 你好，世界！", "chatluna chat text -r 原神 -t text 你好，世界！"], arguments: { message: "要发送的消息内容。" }, messages: { "invalid-render-type": "渲染类型无效。请使用有效的渲染类型，目前支持的类有 `text` 和 `voice`。" } }, rollback: { description: "重新生成上一次的对话内容。", options: { room: "指定要操作的房间。" }, arguments: { message: "新的消息内容。" }, messages: { room_not_found: "未找到指定的房间。", conversation_not_exist: "房间不存在。", no_chat_history: "找不到对话记录。", invalid_chat_history: "错误的聊天记录，请尝试清空聊天记录后重试。", rollback_success: "已成功回滚到 {0} 轮前的对话，请等待模型回复。" } }, stop: { description: "立即停止当前正在进行的对话。", options: { room: "指定要停止对话的房间。" }, messages: { room_not_found: "未找到指定的房间。", no_active_chat: "当前未在房间中对话。", stop_failed: "停止对话失败。", success: "已成功停止当前对话。" } }, compress: { description: "手动压缩聊天记录（使用无限上下文）。", options: { room: "指定要压缩的目标房间。" }, messages: { success: "{0} -> {1}, {2}%", skipped: "未执行压缩。{0} -> {1}, {2}%", no_room: "未找到指定的房间。", failed: "压缩房间 {0} 的聊天记录失败：{1}" } }, voice: { description: "与模型进行对话并将回复转换为语音输出。", options: { room: "指定对话的目标房间。", speaker: "设置语音服务使用目标角色 ID。" }, arguments: { message: "要发送的消息内容。" } } }, wipe: { description: "清空 ChatLuna 的所有使用数据（请谨慎使用）。", messages: { confirm_wipe: "您接下来将要操作的是清除 ChatLuna 的全部相关数据！这些数据包括：\n1. 所有会话数据\n2. 其他缓存在数据库的数据\n3. 本地向量数据库的相关数据\n\n请输入下列算式的结果以确认删除：{0}。\n", timeout: "删除超时，已取消删除", incorrect_input: "你的输入不正确，已取消删除。", success: "已删除相关数据，即将重启完成更改。" } }, restart: { description: "重启 ChatLuna 服务。", messages: { success: "已成功重启 ChatLuna。" } }, auth: { description: "ChatLuna 鉴权相关指令。", list: { description: "列出授权组。", options: { page: "页码。", limit: "每页显示的数量。", platform: "指定平台。" }, messages: { header: "以下是查询到目前可用的配额组列表：", footer: "你可以使用 chatluna.auth.add [name/id] 来加入某个配额组。", pages: "当前为第 [page] / [total] 页", name: "名称：{0}", platform: "适用模型平台：{0}", cost: "计费：{0} / 1000 token", priority: "优先级: {0}", support_models: "限制模型：{0}", limit_per_min: "并发限制每 {0} 条消息/分", limit_per_day: "并发限制每 {0} 条消息/天", general: "通用" } }, add: { description: "将用户加入到指定配额组。", usage: "使用方法：chatluna auth add [组名] -u @用户", options: { user: "目标用户。" }, messages: { permission_denied: "你的权限不足以执行此操作。", success: "已将用户 {0} 添加到配额组 {1}。" } }, kick: { description: "将用户从指定配额组中移除。", usage: "使用方法：chatluna auth kick [组名] -u @用户", options: { user: "目标用户。" }, messages: { permission_denied: "你的权限不足以执行此操作。", success: "已将用户 {0} 踢出配额组 {1}" } }, create: { description: "创建一个新的授权组。", options: { name: "授权组名称。", preMin: "每分钟请求限额。", preDay: "每日请求限额。", platform: "指定平台。", supportModels: "支持的模型列表。", priority: "优先级。", cost: "token 费用。" }, messages: { enter_name: "请输入你需要使用的配额组名，如：OpenAI配额组", name_exists: "你输入的配额组名已存在，请重新输入。", enter_limit_per_min: "请输入配额组每分钟的限额条数，要求为数字并且大于 0。", enter_limit_per_day: "请输入配额组每天的限额条数，要求为数字并且大于每分钟的限额次数。", enter_platform: "请输入对该配额组的模型平台标识符，如： openai。表示优先在使用该平台模型时使用该配额组，如不输入回复 N", enter_priority: "请输入配额组的优先级（数字，越大越优先）（这很重要，会决定配额组的使用顺序）。", enter_cost: "请输入配额组的 token 费用（数字，按一千 token 计费，实际扣除用户余额）。", enter_models: "请输入该配额组可使用的模型列表（白名单机制），用英文逗号分割，如（openai/gpt-3.5-turbo, openai/gpt-4）。如果不输入回复 N（则不设置型列表）。", invalid_input: "你输入的{0}有误，请重新输入。", confirm_create: "你目前已提供基础参数，是否直接创建配额组？如需直接创建配额组请回复 Y，如需进入交互式创建请回复 N，其他回复将视为取消。", timeout: "你超时未回复，已取消创建配额组。", cancelled: "你已取消创建配额组。", success: "配额组创建成功，配额组名为：{0}。", change_or_keep: "你已经{0}{1}：{2}，是否需要更换？如需更换请回复更换后的{1}，否则回复 N。", invalid_models: "模型组里有不支持的模型，请重新输入。", action: { input: "输入", set: "设置", select: "选择" }, field: { name: "配额组名", limit_per_min: "每分钟限额条数", limit_per_day: "每天限额条数", platform: "平台标识符", priority: "优先级", cost: "费用", models: "模型列表" } } }, set: { description: "修改现有授权组的参数。", options: { name: "授权组名称。", preMin: "每分钟请求限额。", preDay: "每日请求限额。", platform: "指定平台。", supportModels: "支持的模型列表。", priority: "优先级。", cost: "token 费用。" }, messages: { confirm_set: "你目前已提供基础参数，是否直接修改配额组？如需直接修改配额组请回复 Y，如需进入交互式创建请回复 N，其他回复将视为取消。", timeout: "你超时未回复，已取消修改配额组。", cancelled: "你已取消修改配额组。", enter_name: "请输入你需要使用的配额组名，如：OpenAI配额组。回复 Q 退出修改。", name_exists: "你输入的配额组名已存在，请重新输入。", enter_limit_per_min: "请输入配额组每分钟的限额条数，要求为数字并且大于 0。回复 Q 退出修改。", enter_limit_per_day: "请输入配额组每天的限额条数，要求为数字并且大于每分钟的限额次数。回复 Q 退出修改。", enter_platform: "请输入对该配额组的模型平台标识符，如： openai。表示会优先在使用该平台模型时使用该配额组，如不输入回复 N。回复 Q 退出修改。", enter_priority: "请输入配额组的优先级（数字，越大越优先）（这很重要，会决定配额组的使用顺序）。回复 Q 退出修改。", enter_cost: "请输入配额组的 token 费用（数字，按一千 token 计费，实际扣除用户余额）。回复 Q 退出修改。", enter_models: "请输入该配额组可使用的模型列表（白名单机制），用英文逗号分割，如（openai/gpt-3.5-turbo, openai/gpt-4）。如果不输入回复 N（则不设置模型列表）。回复 Q 退出修改。", invalid_input: "你输入的{0}有误，请重新输入。", change_or_keep: "你已经{0}{1}：{2}，是否需要更换？如需更换请回复更换后的{1}，否则回复 N。回复 Q 退出修改。", invalid_models: "模型组里有不支持的模型，请重新输入。", success: "配额组修改成功，新配额组名为：{0}。", action: { input: "输入", set: "设置", select: "选择" }, field: { name: "配额组名", limit_per_min: "每分钟限额条数", limit_per_day: "每天限额条数", platform: "平台标识符", priority: "优先级", cost: "费用", models: "模型列表" } } } }, balance: { description: "ChatLuna 余额相关指令。", clear: { description: "清除指定用户的余额。将用户的余额重置为0。", arguments: { user: "目标用户。" }, examples: ["chatluna balance clear --user @用户名"], messages: { success: "已将用户 {0} 账户余额修改为 {1}" } }, set: { description: "设置指定用户的余额。可以增加或减少用户的余额。", arguments: { user: "目标用户。", amount: "要设置的余额数量。" }, examples: ["chatluna balance set --user @用户名 --amount 1000"], messages: { success: "已将用户 {0} 账户余额修改为 {1}" } }, query: { description: "查询用户的当前余额。如果不指定用户，则查询自己的余额。", arguments: { user: "目标用户。如果不指定，则查询当前用户。" }, examples: ["chatluna balance query", "chatluna balance query --user @用户名"], messages: { success: "用户 {0} 当前的账户余额为 {1}" } } }, model: { description: "ChatLuna 模型相关指令。", list: { description: "列出所有可用的模型。", usage: "chatluna model list --page 1 --limit 10", options: { page: "页码。", limit: "每页显示的数量。" }, messages: { header: "以下是目前可用的模型列表：", footer: "你可以使用 chatluna.room.set -m [model] 来设置默认使用的模型", pages: "当前为第 [page] / [total] 页" } }, search: { description: "搜索可用的模型。", arguments: { query: "搜索关键词。" }, usage: "chatluna model search openai --page 1 --limit 10", options: { page: "页码。", limit: "每页显示的数量。" }, messages: { header: "以下是目前搜索到的模型列表：", footer: "你可以使用 chatluna.room.set -m [model] 来设置默认使用的模型", pages: "当前为第 [page] / [total] 页" } }, test: { description: "测试指定的模型或适配器是否可用。", arguments: { model: "模型名称（如 openai/gpt-3.5-turbo）或平台名称（如 openai）。" }, usage: "chatluna model test openai/gpt-3.5-turbo", messages: { platform_not_found: "未找到平台 {0}，请检查平台名称或确认平台适配器已安装。", platform_unavailable: "平台 {0} 不可用，请检查配置或等待平台加载。", model_not_found: "未找到模型 {0}，请检查模型名称是否正确。", invalid_model_format: "无效的模型格式：{0}。期望格式：平台/模型（如 openai/gpt-3.5-turbo）。", testing: "正在测试模型 {0}，请稍候...", test_success: "模型 {0} 测试成功！\n响应时间：{1}ms\n示例回复：{2}", test_success_no_content: "模型 {0} 测试成功！\n响应时间：{1}ms\n（模型未返回内容）", test_failed: "模型 {0} 测试失败！\n响应时间：{1}ms\n错误信息：{2}", test_error: "测试过程中发生错误：{0}" } } }, tool: { description: "ChatLuna 工具相关指令。", list: { description: "列出所有可用的工具。", usage: "chatluna tool list --page 1 --limit 10", options: { page: "页码。", limit: "每页显示的数量。" }, messages: { header: "以下是目前可用的工具列表：", footer: "你可以在对话中使用这些工具来增强模型的能力", pages: "当前为第 [page] / [total] 页" } } }, mcp: { description: "MCP 工具管理相关命令", list: { description: "列出所有 MCP 工具", options: { raw: "列出原始的 MCP 服务器配置" }, messages: { list_servers_header: "以下是当前配置的 MCP 服务器列表：", server_name: "服务器名称：{0}", server_config: "服务器配置：\\n{0}", empty_servers: "当前没有配置任何 MCP 服务器。", list_tools_header: "以下是当前可用的 MCP 工具列表：", tool_name: "工具名称：{0}", tool_enabled: "工具状态：{0}", tool_description: "工具描述：{0}", tool_selector: "选择器：{0}", no_selector: "无", no_description: "无描述", empty_tools: "当前没有注册任何 MCP 工具。", parse_error: "解析 MCP 服务器配置时出错，请检查配置格式。", list_error: "列出工具时出错：{0}", service_not_ready: "MCP 服务未准备就绪，请稍后再试。" } }, add: { description: "添加 MCP 服务器", arguments: { mcpConfig: "MCP 服务器配置（JSON 格式）" }, messages: { add_usage: '使用方法：chatluna.mcp.add <mcpConfig>\\n\\n示例：\\nchatluna.mcp.add {"mcpServers": {"server1": {"command": "node", "args": ["server.js"]}}}', add_conflict: "检测到以下服务器名称已存在：{0}", add_overwrite_confirm: "是否覆盖现有服务器配置？输入 Y 确认，其他任何输入取消。", add_cancelled: "已取消添加操作。", add_success: "成功添加了 {0} 个 MCP 服务器。", add_error: "添加 MCP 服务器时出错：{0}", restart_required: "请注意：需要重启后更改才会生效。" } }, remove: { description: "移除 MCP 服务器", arguments: { serverName: "服务器名称" }, messages: { remove_usage: "使用方法：chatluna.mcp.remove <serverName>\\n\\n示例：\\nchatluna.mcp.remove server1", server_not_found: "未找到名为 {0} 的服务器。", remove_success: "成功移除服务器 {0}。", remove_error: "移除服务器时出错：{0}", restart_required: "请注意：需要重启后更改才会生效。", empty_servers: "当前没有配置任何 MCP 服务器。" } }, enable: { description: "启用或禁用 MCP 工具", arguments: { toolName: "工具名称" }, messages: { enable_usage: "使用方法：chatluna.mcp.enable <toolName>\\n\\n示例：\\nchatluna.mcp.enable my_tool", tool_not_found: "未找到名为 {0} 的工具。", enable_success: "已将工具 {0} {1}。", enable_error: "切换工具状态时出错：{0}", service_not_ready: "MCP 服务未准备就绪，请稍后再试。", status_enabled: "启用", status_disabled: "禁用" } } }, memory: { description: "ChatLuna 记忆相关指令。", search: { description: "搜索记忆。", arguments: { query: "搜索关键词。" }, usage: 'chatluna memory search --query "你好" --page 1 --limit 10', options: { page: "页码。", limit: "每页显示的数量。", type: "记忆所属的预设。", view: "记忆所属的层级。" }, messages: { header: "以下是使用 {0} 关键词在 {1} 层级下搜索出的记忆列表：", footer: "", document_content: "记忆内容： {0}", document_id: "记忆 ID： {0}", document_type: "记忆所属的类型： {0}", document_expire: "记忆过期时间： {0}", document_level: "记忆的重要性： {0}", pages: "当前为第 [page] / [total] 页", search_failed: "搜索记忆失败。", invalid_view: "无效的记忆层级。目前可用：{0}" } }, delete: { description: "删除记忆。", arguments: { ids: "记忆 ID 列表。" }, options: { type: "记忆所属的预设。", view: "记忆所属的层级。" }, messages: { delete_success: "已删除记忆。", delete_failed: "删除记忆失败。", invalid_view: "无效的记忆层级。目前可用：{0}" } }, clear: { description: "清空记忆。", options: { type: "记忆所属的预设。", view: "记忆所属的层级。" }, messages: { clear_success: "已清空记忆。", clear_failed: "清空记忆失败。", invalid_view: "无效的记忆层级。目前可用：{0}" } }, add: { description: "添加记忆。", arguments: { content: "记忆内容。" }, options: { type: "记忆所属的预设。", view: "记忆所属的层级。" }, messages: { add_success: "已添加记忆。", add_failed: "添加记忆失败。", invalid_view: "无效的记忆层级。目前可用：{0}" } }, edit: { description: "编辑记忆。", arguments: { id: "记忆 ID。" }, options: { type: "记忆所属的预设。", view: "记忆所属的层级。" }, messages: { edit_success: "已编辑记忆。", edit_failed: "编辑记忆失败。", edit_memory_start: "请发送你的新记忆内容。", invalid_view: "无效的记忆层级。目前可用：{0}" } } }, preset: { description: "ChatLuna 预设相关指令。", list: { description: "列出当前支持的所有预设。", options: { page: "指定页码", limit: "设置每页显示数量" }, messages: { header: "以下是目前可用的预设列表：", footer: "你可以使用 chatluna.room.set -p [preset] 来设置默认使用的预设", pages: "当前为第 [page] / [total] 页", preset_keyword: "预设关键词： {0}", preset_content: "预设内容： {0}" } }, add: { description: "添加新预设。", arguments: { preset: "预设名称" }, messages: { conflict: "该预设关键词已经和其他预设关键词冲突，请更换其他关键词重试哦", prompt: "请发送你的预设内容。", timeout: "添加预设超时，已取消添加预设: {0}", success: "预设添加成功，预设名称为: {0}。 请调用预设列表命令查看。" } }, clone: { description: "复制现有预设。", arguments: { originPreset: "源预设名称", newPresetName: "新预设名称" }, messages: { conflict: "该预设关键词已经和其他预设关键词冲突，请更换其他关键词重试哦。", confirm: "你确定要克隆预设 {0} 吗？如果你确定要克隆，请输入 Y 来确认。", timeout: "操作超时未确认，已自动取消。", cancelled: "已为你取消操作。", success: "预设克隆成功，预设名称为: {0}。 请调用预设列表命令查看。" } }, set: { description: "修改现有预设。", arguments: { preset: "预设名称" }, messages: { not_found: "找不到指定的预设。", not_support: "不支持修改 {0} 预设！该预设自定义了多条消息，属于复杂预设，无法使用此命令修改，请自行前往控制面板里的资源管理器编辑此预设。`", timeout: "操作超时未确认，已自动取消。", cancelled: "已为你取消操作。", enter_content: "请发送你的新预设内容。", success: "预设修改成功，预设名称为: {0}。 请调用预设列表命令查看。" } }, delete: { description: "删除指定预设。", arguments: { preset: "预设名称" }, messages: { only_one_preset: "现在只有一个预设了，删除后将无法使用预设功能，所以不允许删除。", not_found: "找不到该预设！请检查你是否输入了正确的预设？", confirm_delete: "是否要删除 {0} 预设？输入大写 Y 来确认删除，输入其他字符来取消删除。提示：删除后使用了该预设的会话将会自动删除无法使用。", timeout: "删除预设超时，已取消删除预设: {0}。", cancelled: "已取消删除预设: {0}", success: "已删除预设: {0}，即将自动重启完成更改。" } } }, embeddings: { description: "ChatLuna 嵌入模型管理。", list: { description: "查看支持的嵌入模型列表。", options: { page: "指定页码。", limit: "设置每页显示数量。" }, messages: { header: "以下是目前可用的嵌入模型列表：", footer: "你可以使用 chatluna.embeddings.set [model] 来设置默认使用的嵌入模型", pages: "当前为第 [page] / [total] 页" } }, set: { description: "设置默认嵌入模型。", arguments: { embeddings: "嵌入模型名称。" }, messages: { usage_hint: "你可以使用 chatluna.embeddings.set [model] 来设置默认使用的嵌入模型", multiple_models_found: { header: "基于你的输入，找到了以下嵌入模型：", footer: "请输入更精确的嵌入模型名称以避免歧义", example: "例如：chatluna.embeddings.set {0}" }, model_not_found: "找不到对应的嵌入模型，请检查输入是否正确", success: "已将默认嵌入模型设置为 {0} (将自动重启插件应用更改)" } } }, vectorstore: { description: "ChatLuna 向量数据库管理。", list: { description: "查看支持的向量数据库列表。", options: { page: "指定页码。", limit: "设置每页显示数量。" }, messages: { header: "以下是目前可用的向量数据库列表：", footer: "你可以使用 chatluna.vectorstore.set [model] 来设置默认使用的向量数据库（如果没有任何向量数据库，会使用存储在内存里的向量数据库（临时的））", pages: "当前为第 [page] / [total] 页" } }, set: { description: "设置默认向量数据库。", arguments: { vectorStore: "向量数据库名称。" }, messages: { usage_hint: "你可以使用 chatluna.vectorstore.set [model] 来设置默认使用的向量数据库", multiple_stores_found: { header: "基于你的输入，找到了以下向量数据库：", footer: "请输入更精确的向量数据库名称以避免歧义", example: "例如：chatluna.vectorstore.set {0}" }, store_not_found: "找不到对应的向量数据库，请检查名称是否正确", success: "已将默认向量数据库设置为 {0}，(将自动重启插件应用更改)" } } } } }, chatluna: { quote_said: "说", aborted: "已成功停止当前对话的生成。", thinking_message: "我还在思考中，前面还有 {0} 条消息等着我回复呢，稍等一下~", block_message: "", error_message: "使用 ChatLuna 时出现错误，错误码为 %s。请联系开发者以解决此问题。", middleware_error: "执行 {0} 时出现错误: {1}", not_available_model: "当前没有可用的模型，请检查你的配置，是否正常安装了模型适配器并配置。", chat_limit_exceeded: "你的聊天次数已经用完了喵，还需要等待 {0} 分钟才能继续聊天喵 >_<", room: { random_switch: "检测到你没有指定房间，已为你随机切换到房间 {0}。", not_joined: "你还没有加入任何房间，请先加入房间。", not_in_room: "你没有加入此房间，请先加入房间 {0}。", muted: "你已被禁言，无法在房间 {0} 发言。", unavailable: "当前房间对应的模型 {0} 不可用，请联系管理员配置 API。", auto_switch: "已为用户 {0} 自动切换到房间 {1}。", auto_create: "已为用户 {0} 自动创建房间 {1}。", auto_create_template: "已为用户 {0} 自动创建模版克隆房间 {1}。", room_name: "{0} 的房间", template_clone_room_name: "{0} 的模版克隆房间", config_changed: "检测到模版房间 {0} 的配置变更，已更新到数据库。" }, cooldown_wait_message: "不要发这么快喵，等 {0}s 后我们再聊天喵。" } };
  }
});

// src/locales/en-US.yml
var require_en_US = __commonJS({
  "src/locales/en-US.yml"(exports2, module2) {
    module2.exports = { commands: { chatluna: { description: "ChatLuna related commands.", room: { description: "ChatLuna room management.", create: { description: "Create a new room.", options: { name: "Room name", preset: "Room preset", model: "Room model", chatMode: "Chat mode", password: "Room password", visibility: "Room visibility" }, messages: { confirm_create: "Basic parameters provided. Create room directly? Y: Create, N: Interactive creation, Any other: Cancel.", timeout: "Response timeout. Room creation cancelled.", cancelled: "Room creation cancelled.", enter_name: "Enter room name (e.g., My Room). Q to exit.", change_or_keep: "{0} {1}: {2}. Change? New {1} to change, N to keep. Q to exit.", enter_model: "Enter model (e.g., openai/gpt-3.5-turbo). Q to exit.", model_not_found: "Model not found: {0}. Please retry.", enter_preset: "Enter preset (e.g., chatgpt). N for default. Q to exit.", preset_not_found: "Preset not found: {0}. Please retry.", enter_visibility: "Enter visibility (public/private). N for default. Q to exit.", visibility_not_recognized: "Unrecognized visibility: {0}. Please retry.", enter_chat_mode: "Enter chat mode. N for default. Q to exit.", enter_password: "Enter password. N for no password. Q to exit.", invalid_chat_mode: "Unable to recognize chat mode: {0}. Available chat modes are: {1}. Please try again. Q to exit.", template_room_created: "Template room created successfully.", room_created: "Room created. ID: {0}, Name: {1}.", action: { input: "Input", set: "Set", select: "Select" }, field: { name: "Room name", model: "Model", preset: "Preset", visibility: "Visibility", chat_mode: "Chat mode", password: "Password" } } }, delete: { description: "Delete a room.", arguments: { room: "Target room" }, messages: { room_not_found: "Room not found.", not_room_master: "Insufficient permissions: Not room owner.", confirm_delete: "Confirm deletion of room {0}? All messages and members will be removed. Y to confirm.", timeout: "Operation timed out. Automatically cancelled.", cancelled: "Operation cancelled.", success: "Room {0} deleted." } }, "auto-update": { description: "Set auto-update for template clone rooms.", options: { room: "Specify room" }, messages: { room_not_found: "Room not found.", not_template_clone: "Not a template clone room. Cannot set auto-update.", not_admin: "Insufficient permissions: Not room owner.", success: "Auto-update for room {0} set to {1}.", "invalid-status": "Invalid parameter. Use true or false." } }, kick: { description: "Kick user from current room.", messages: { no_room_specified: "No room specified. Use chatluna.room.switch to select a room.", not_admin: "Insufficient permissions: Not room admin.", success: "Users kicked from room {0}: {1}" } }, invite: { description: "Invite user to room.", messages: { no_room_specified: "No room specified. Use chatluna.room.switch to select a room.", not_admin: "Insufficient permissions: Not room admin.", success: "User {0} invited to room {1}." } }, join: { description: "Join a room.", arguments: { id: "Room ID or name" }, messages: { room_not_found: "Room not found.", not_in_group: "Room not in current group chat.", private_no_password: "Private room. Owner invitation required.", private_group_join: "Private room. Cannot join in group chat.", enter_password: "Enter password for room {0}.", timeout: "Operation timed out. Automatically cancelled.", wrong_password: "Incorrect password. Operation cancelled.", success: "Joined room {0}" } }, leave: { description: "Leave current room.", arguments: { room: "Target room" }, messages: { room_not_found: "Room not found.", confirm_delete: "Room owner detected. Leaving will delete the room. Y to confirm.", timeout: "Operation timed out. Automatically cancelled.", cancelled: "Operation cancelled.", success: "Left room {0}. Rejoin or switch rooms if needed." } }, clear: { description: "Clear room chat history.", arguments: { room: "Target room" }, messages: { success: "Chat history cleared for room {0}.", "no-room": "Room not found." } }, compress: { description: "Manually compress room chat history using Infinite Context.", arguments: { room: "Target room" }, messages: { success: "{0} -> {1}, {2}%", skipped: "Compression skipped. {0} -> {1}, {2}%", no_room: "Room not found.", failed: "Failed to compress chat history for room {0}: {1}" } }, set: { description: "Set room properties.", options: { name: "Room name", preset: "Room preset", model: "Room model", chatMode: "Chat mode", password: "Room password", visibility: "Room visibility" }, messages: { room_not_found: "Room not found.", not_room_master: "Insufficient permissions: Not room owner.", confirm_update: "Update room properties? Y: Update, N: Interactive update, Any other: Cancel.", timeout: "Response timeout. Update cancelled.", cancelled: "Update cancelled.", no_password_in_public: "Cannot set password for non-private room or group chat.", change_or_keep: "{0}: {1}. Change? New value to change, N to keep. Q to exit.", model_not_found: "Model not found: {0}. Please retry.", preset_not_found: "Preset not found: {0}. Please retry.", invalid_visibility: "Invalid visibility: {0}. Please retry.", enter_password: "Enter password. N for no password. Q to exit.", success_with_clear: "Room {0} updated. Chat history cleared.", invalid_chat_mode: "Unable to recognize chat mode: {0}. Available chat modes are: {1}. Please try again.", failed: "Room {0} update failed. Please check your settings and try again.", success: "Room {0} updated.", field: { name: "Room name", model: "Model", preset: "Preset", visibility: "Visibility", chat_mode: "Chat mode", password: "Password" } } }, list: { description: "List joined rooms.", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Joined rooms:", footer: "Use chatluna.room.switch [name/id] to change default room.", pages: "Page: [page] / [total]", room_name: "Name: {0}", room_id: "ID: {0}", room_preset: "Preset: {0}", room_model: "Model: {0} \nModel Availability: {1}", room_visibility: "Visibility: {0}", room_chat_mode: "Chat mode: {0}", room_master_id: "Creator ID: {0}", room_availability: "Availability: {0}" } }, transfer: { description: "Transfer room ownership.", messages: { room_not_found: "Room not found.", not_room_master: "Insufficient permissions: Not room owner.", confirm_transfer: "Transfer room {0} to user {1}? You will lose owner privileges. Y to confirm.", timeout: "Operation timed out. Automatically cancelled.", cancelled: "Operation cancelled.", success: "Room {0} transferred to user {1}." } }, info: { description: "View current room information.", arguments: { room: "Target room" }, messages: { room_not_found: "Room not found.", header: "Current room information:", room_name: "Name: {0}", room_id: "ID: {0}", room_preset: "Preset: {0}", room_model: "Model: {0} \nModel Availability: {1}", room_visibility: "Visibility: {0}", room_chat_mode: "Chat mode: {0}", room_master_id: "Creator ID: {0}" } }, switch: { description: "Switch to a joined room.", arguments: { name: "Room name or ID" }, messages: { success: "Switched to room {0}.", room_not_found: "Room not found." } }, permission: { description: "Modify user permissions in room.", options: { room: "Specify room", user: "Target user" }, messages: { room_not_found: "Room not found.", not_admin: "Insufficient permissions: Not room owner.", confirm_set: "Set permissions for user {0} in room {1}? Available: member, admin. Enter permission or first letter. Any other: Cancel.", timeout: "Operation timed out. Automatically cancelled.", invalid_permission: "Invalid permission. Operation cancelled.", success: "Permission for user {0} in room {1} set to {2}" } }, mute: { description: "Mute a user in the room.", options: { room: "Specify room" }, messages: { room_not_found: "Room not found.", not_admin: "Insufficient permissions: Not room admin.", success: "User {0} muted/unmuted in room {1}." } } }, chat: { description: "ChatLuna conversation commands.", text: { description: "Initiate a text conversation with the AI model.", options: { room: "Target conversation room.", type: "Message rendering type." }, examples: ["chatluna chat text -t text Hello, world!", "chatluna chat text -t voice Hello, world!", "chatluna chat text -r Genshin -t text Hello, world!"], arguments: { message: "Message content to send." }, messages: { "invalid-render-type": "Invalid rendering type. Supported types: `text` and `voice`." } }, rollback: { description: "Regenerate last conversation content.", options: { room: "Target room for operation." }, arguments: { message: "New message content." }, messages: { room_not_found: "Room not found.", conversation_not_exist: "Room does not exist.", no_chat_history: "Chat history not found.", invalid_chat_history: "Invalid chat history. Clear history and retry.", rollback_success_1: "Successfully rolled back to {0} rounds ago." } }, stop: { description: "Immediately terminate ongoing conversation.", options: { room: "Target room to stop conversation." }, messages: { room_not_found: "Room not found.", no_active_chat: "No active conversation in current room.", stop_failed: "Failed to stop conversation.", success: "Conversation stopped successfully." } }, compress: { description: "Manually compress chat history using Infinite Context.", options: { room: "Target room for compression." }, messages: { success: "{0} -> {1}, {2}%", skipped: "Compression skipped. {0} -> {1}, {2}%", no_room: "Room not found.", failed: "Failed to compress chat history for room {0}: {1}" } }, voice: { description: "Converse with AI model and receive voice output.", options: { room: "Target conversation room.", speaker: "Character ID for voice service." }, arguments: { message: "Message content to send." } } }, wipe: { description: "Clear all ChatLuna usage data (use with caution).", messages: { confirm_wipe: "Warning: You are about to clear all ChatLuna data, including:\n1. All session data\n2. Cached database data\n3. Local vector database data\n\nTo confirm deletion, enter the result of: {0}.\n", timeout: "Deletion timed out. Operation cancelled.", incorrect_input: "Incorrect input. Deletion cancelled.", success: "Data deleted. Restarting to apply changes." } }, restart: { description: "Restart the ChatLuna.", messages: { success: "Successfully restarted ChatLuna." } }, auth: { description: "ChatLuna authentication commands.", list: { description: "Display authorization groups.", options: { page: "Page number", limit: "Items per page", platform: "Specify platform" }, messages: { header: "Available quota groups:", footer: "Use chatluna.auth.add [name/id] to join a quota group.", pages: "Page: [page] / [total]", name: "Name: {0}", platform: "Model platform: {0}", cost: "Cost: {0} / 1000 tokens", priority: "Priority: {0}", support_models: "Allowed models: {0}", limit_per_min: "Limit: {0} messages/minute", limit_per_day: "Limit: {0} messages/day", general: "General" } }, add: { description: "Add user to quota group.", usage: "Usage: chatluna auth add [group] name -u @user", options: { user: "Target user" }, messages: { permission_denied: "Insufficient permissions for this operation.", success: "User {0} added to quota group {1}." } }, kick: { description: "Remove user from quota group.", usage: "Usage: chatluna auth kick [group name] -u @user", options: { user: "Target user" }, messages: { permission_denied: "Insufficient permissions for this operation.", success: "User {0} removed from quota group {1}." } }, create: { description: "Create new authorization group.", options: { name: "Group name", preMin: "Per-minute limit", preDay: "Daily limit", platform: "Platform", supportModels: "Supported models", priority: "Priority", cost: "Token cost" }, messages: { enter_name: "Enter quota group name (e.g., OpenAI Quota Group):", name_exists: "Group name already exists. Please try again.", enter_limit_per_min: "Enter per-minute limit (>0):", enter_limit_per_day: "Enter daily limit (>per-minute limit):", enter_platform: "Enter model platform ID (e.g., openai) or N to skip:", enter_priority: "Enter priority (higher number = higher priority):", enter_cost: "Enter token cost (per 1000 tokens):", enter_models: "Enter allowed models (comma-separated) or N to skip:", invalid_input: "Invalid input for {0}. Please try again.", confirm_create: "Create quota group? Y: Create, N: Interactive mode, Any other: Cancel.", timeout: "Response timeout. Creation cancelled.", cancelled: "Quota group creation cancelled.", success: 'Quota group "{0}" created successfully.', change_or_keep: "{0} {1}: {2}. Change? New value or N to keep.", invalid_models: "Invalid models detected. Please try again.", action: { input: "Input", set: "Set", select: "Select" }, field: { name: "Group name", limit_per_min: "Per-minute limit", limit_per_day: "Daily limit", platform: "Platform ID", priority: "Priority", cost: "Cost", models: "Allowed models" } } }, set: { description: "Modify existing authorization group.", options: { name: "Group name", preMin: "Per-minute limit", preDay: "Daily limit", platform: "Platform", supportModels: "Supported models", priority: "Priority", cost: "Token cost" }, messages: { confirm_set: "Modify quota group? Y: Direct modify, N: Interactive mode, Any other: Cancel.", timeout: "Response timeout. Modification cancelled.", cancelled: "Quota group modification cancelled.", enter_name: "Enter new group name (e.g., OpenAI Quota Group) or Q to exit:", name_exists: "Group name already exists. Please try again.", enter_limit_per_min: "Enter new per-minute limit (>0) or Q to exit:", enter_limit_per_day: "Enter new daily limit (>per-minute limit) or Q to exit:", enter_platform: "Enter new platform ID (e.g., openai), N to skip, or Q to exit:", enter_priority: "Enter new priority (higher = more priority) or Q to exit:", enter_cost: "Enter new token cost (per 1000 tokens) or Q to exit:", enter_models: "Enter new allowed models (comma-separated), N to skip, or Q to exit:", invalid_input: "Invalid input for {0}. Please try again.", change_or_keep: "{0} {1}: {2}. Change? New value, N to keep, or Q to exit.", invalid_models: "Invalid models detected. Please try again.", success: 'Quota group "{0}" modified successfully.', action: { input: "Input", set: "Set", select: "Select" }, field: { name: "Group name", limit_per_min: "Per-minute limit", limit_per_day: "Daily limit", platform: "Platform ID", priority: "Priority", cost: "Cost", models: "Allowed models" } } } }, balance: { description: "ChatLuna balance management.", clear: { description: "Reset user balance.", arguments: { user: "Target user" }, examples: ["chatluna balance clear --user @username"], messages: { success: "User {0} balance reset to {1}" } }, set: { description: "Adjust user balance.", arguments: { user: "Target user", amount: "New balance" }, examples: ["chatluna balance set --user @username --amount 1000"], messages: { success: "User {0} balance updated to {1}" } }, query: { description: "Check user balance.", arguments: { user: "Target user (default: current user)" }, examples: ["chatluna balance query", "chatluna balance query --user @username"], messages: { success: "User {0} current balance: {1}" } } }, model: { description: "ChatLuna model management.", list: { description: "Display available models.", usage: "chatluna model list --page 1 --limit 10", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Available models:", footer: "Set default model: chatluna.room.set -m [model]", pages: "Page: [page] / [total]" } }, search: { description: "Search available models.", arguments: { query: "Search keyword" }, usage: "chatluna model search openai --page 1 --limit 10", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Search results:", footer: "Set default model: chatluna.room.set -m [model]", pages: "Page: [page] / [total]" } }, test: { description: "Test if a specified model or adapter is available.", arguments: { model: "Model name (e.g., openai/gpt-3.5-turbo) or platform name (e.g., openai)." }, usage: "chatluna model test openai/gpt-3.5-turbo", messages: { platform_not_found: "Platform {0} not found. Please check the platform name or ensure the adapter is installed.", platform_unavailable: "Platform {0} is unavailable. Please check the configuration or wait for the platform to load.", model_not_found: "Model {0} not found. Please verify the model name is correct.", invalid_model_format: "Invalid model format: {0}. Expected format: platform/model (e.g., openai/gpt-3.5-turbo).", testing: "Testing model {0}, please wait...", test_success: "Model {0} test successful!\nResponse time: {1}ms\nSample response: {2}", test_success_no_content: "Model {0} test successful!\nResponse time: {1}ms\n(No content returned by model)", test_failed: "Model {0} test failed!\nResponse time: {1}ms\nError message: {2}", test_error: "Error occurred during testing: {0}" } } }, tool: { description: "ChatLuna tool management.", list: { description: "Display available tools.", usage: "chatluna tool list --page 1 --limit 10", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Available tools:", footer: "You can use these tools in conversations to enhance model capabilities", pages: "Page: [page] / [total]" } } }, mcp: { description: "MCP tool management commands", list: { description: "List all MCP tools", options: { raw: "List raw MCP server configurations" }, messages: { list_servers_header: "Current MCP server configurations:", server_name: "Server name: {0}", server_config: "Server config:\\n{0}", empty_servers: "No MCP servers configured.", list_tools_header: "Available MCP tools:", tool_name: "Tool name: {0}", tool_enabled: "Status: {0}", tool_description: "Description: {0}", tool_selector: "Selector: {0}", no_selector: "None", no_description: "No description", empty_tools: "No MCP tools registered.", parse_error: "Failed to parse MCP server configuration. Please check the format.", list_error: "Error listing tools: {0}", service_not_ready: "MCP service is not ready. Please try again later." } }, add: { description: "Add MCP server", arguments: { mcpConfig: "MCP server configuration (JSON format)" }, messages: { add_usage: 'Usage: chatluna.mcp.add <mcpConfig>\\n\\nExample:\\nchatluna.mcp.add {"mcpServers": {"server1": {"command": "node", "args": ["server.js"]}}}', add_conflict: "The following server names already exist: {0}", add_overwrite_confirm: "Overwrite existing server configuration? Enter Y to confirm, any other input to cancel.", add_cancelled: "Add operation cancelled.", add_success: "Successfully added {0} MCP server(s).", add_error: "Error adding MCP server: {0}", restart_required: "Note: Changes will take effect after restart." } }, remove: { description: "Remove MCP server", arguments: { serverName: "Server name" }, messages: { remove_usage: "Usage: chatluna.mcp.remove <serverName>\\n\\nExample:\\nchatluna.mcp.remove server1", server_not_found: "Server {0} not found.", remove_success: "Successfully removed server {0}.", remove_error: "Error removing server: {0}", restart_required: "Note: Changes will take effect after restart.", empty_servers: "No MCP servers configured." } }, enable: { description: "Enable or disable MCP tool", arguments: { toolName: "Tool name" }, messages: { enable_usage: "Usage: chatluna.mcp.enable <toolName>\\n\\nExample:\\nchatluna.mcp.enable my_tool", tool_not_found: "Tool {0} not found.", enable_success: "Tool {0} has been {1}.", enable_error: "Error toggling tool status: {0}", service_not_ready: "MCP service is not ready. Please try again later.", status_enabled: "enabled", status_disabled: "disabled" } } }, memory: { description: "ChatLuna memory-related commands.", search: { description: "Search memories.", arguments: { query: "Search keyword." }, usage: 'chatluna memory search --query "Hello" --page 1 --limit 10', options: { page: "Page number.", limit: "Items per page.", type: "Memory preset.", view: "Memory layer." }, messages: { header: "Here is the list of memories found using the keyword {0} under the {1} layer:", footer: "", document_content: "Memory content: {0}", document_id: "Memory ID: {0}", document_type: "Memory type: {0}", document_expire: "Memory expire: {0}", document_level: "Memory level: {0}", pages: "Page: [page] / [total]", search_failed: "Failed to search memories.", invalid_view: "Invalid view type. Currently supported types are: {0}." } }, delete: { description: "Delete memory.", arguments: { ids: "Memory ID list." }, options: { type: "Memory preset.", view: "Memory layer." }, messages: { delete_success: "Memory deleted successfully.", delete_failed: "Failed to delete memory.", invalid_view: "Invalid view type. Currently supported types are: {0}." } }, clear: { description: "Clear memory.", options: { type: "Memory preset.", view: "Memory layer." }, messages: { clear_success: "Memory cleared successfully.", clear_failed: "Failed to clear memory.", invalid_view: "Invalid view type. Currently supported types are: {0}." } }, add: { description: "Add memory.", arguments: { content: "Memory content." }, options: { type: "Memory preset.", view: "Memory layer." }, messages: { add_success: "Memory added successfully.", add_failed: "Failed to add memory.", invalid_view: "Invalid view type. Currently supported types are: {0}." } }, edit: { description: "Edit memory.", arguments: { id: "Memory ID." }, options: { type: "Memory preset.", view: "Memory layer." }, messages: { edit_success: "Memory edited successfully.", edit_failed: "Failed to edit memory.", edit_memory_start: "Please send your new memory content.", invalid_view: "Invalid view type. Currently supported types are: {0}." } } }, preset: { description: "ChatLuna preset management.", list: { description: "Display available presets.", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Available presets:", footer: "Set default preset: chatluna.room.set -p [preset]", pages: "Page: [page] / [total]", preset_keyword: "Keyword: {0}", preset_content: "Content: {0}" } }, add: { description: "Create new preset.", arguments: { preset: "Preset name" }, messages: { conflict: "Preset keyword conflict. Choose a different keyword.", prompt: "Enter preset content.", timeout: "Operation timed out. Cancelled adding preset: {0}", success: 'Preset "{0}" created. Use chatluna.preset.list to view.' } }, clone: { description: "Duplicate existing preset.", arguments: { originPreset: "Source preset", newPresetName: "New preset name" }, messages: { conflict: "Preset keyword conflict. Choose a different name.", confirm: "Confirm cloning preset {0}? Enter Y to proceed.", timeout: "Operation timed out. Cancelled.", cancelled: "Operation cancelled.", success: 'Preset "{0}" cloned. Use chatluna.preset.list to view.' } }, set: { description: "Update existing preset.", arguments: { preset: "Preset name" }, messages: { not_found: "Preset not found.", not_support: "Cannot modify preset {0}. This complex preset requires editing via the control panel resource manager.", timeout: "Operation timed out. Cancelled.", cancelled: "Operation cancelled.", enter_content: "Enter new preset content.", success: 'Preset "{0}" updated. Use chatluna.preset.list to view.' } }, delete: { description: "Remove specified preset.", arguments: { preset: "Preset name" }, messages: { only_one_preset: "Cannot delete the only existing preset.", not_found: "Preset not found. Check the name and try again.", confirm_delete: "Delete preset {0}? Y to confirm, any other key to cancel. Note: Associated sessions will be deleted.", timeout: "Operation timed out. Cancelled deleting preset: {0}.", cancelled: "Cancelled deleting preset: {0}", success: "Preset {0} deleted. Restarting to apply changes." } } }, embeddings: { description: "ChatLuna embedding model management.", list: { description: "View embedding models.", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Supported embedding models:", footer: "Set default: chatluna.embeddings.set [model]", pages: "Page: [page] / [total]" } }, set: { description: "Set default embedding model.", arguments: { embeddings: "Model name" }, messages: { usage_hint: "Usage: chatluna.embeddings.set [model]", multiple_models_found: { header: "Multiple models found:", footer: "Please provide a more specific model name", example: "Example: chatluna.embeddings.set {0}" }, model_not_found: "Model not found. Check the name and try again.", success: "Default set to {0}. Restarting plugin to apply." } } }, vectorstore: { description: "ChatLuna vector database management.", list: { description: "View vector databases.", options: { page: "Page number", limit: "Items per page" }, messages: { header: "Supported vector databases:", footer: "Set default: chatluna.vectorstore.set [model] (uses in-memory if none set)", pages: "Page: [page] / [total]" } }, set: { description: "Set default vector database.", arguments: { vectorStore: "Database name" }, messages: { usage_hint: "Usage: chatluna.vectorstore.set [model]", multiple_stores_found: { header: "Multiple databases found:", footer: "Please provide a more specific database name", example: "Example: chatluna.vectorstore.set {0}" }, store_not_found: "Database not found. Check the name and try again.", success: "Default set to {0}. Restarting plugin to apply." } } } } }, chatluna: { quote_said: "said", aborted: "Current conversation generation stopped successfully.", thinking_message: "Processing... {0} messages in queue. Please wait.", block_message: "", error_message: "ChatLuna error occurred. Error code: %s. Contact developer for assistance.", middleware_error: "Error in {0}: {1}", not_available_model: "No models are currently available. Please check your configuration to ensure model adapters are properly installed and configured.", chat_limit_exceeded: "Daily chat limit reached. Please try again in {0} minutes.", room: { random_switch: "No room specified. Switched to room {0}.", not_joined: "No room joined. Please join a room first.", not_in_room: "Not a member of this room. Please join room {0} first.", muted: "You are muted in room {0}.", unavailable: "The model {0} for this room is unavailable. Please contact an administrator to configure the API.", auto_switch: "User {0} switched to room {1}.", auto_create: "Room {1} created for user {0}.", auto_create_template: "Template clone room {1} created for user {0}.", room_name: "{0} room", template_clone_room_name: "{0} template clone room", config_changed: "Configuration updated for template room {0}." }, cooldown_wait_message: "Message rate limit reached. Please wait {0}s before sending another message." } };
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Config: () => Config2,
  DefaultRenderer: () => DefaultRenderer,
  Renderer: () => Renderer,
  apply: () => apply69,
  inject: () => inject,
  inject2: () => inject2,
  logger: () => logger8,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(index_exports);
var import_koishi21 = require("koishi");
var import_chat2 = require("koishi-plugin-chatluna/services/chat");
var import_koishi22 = require("koishi-plugin-chatluna/utils/koishi");
var import_logger9 = require("koishi-plugin-chatluna/utils/logger");
var request = __toESM(require("koishi-plugin-chatluna/utils/request"), 1);

// src/authorization/service.ts
var import_decimal = require("decimal.js");
var import_koishi = require("koishi");
var import_error = require("koishi-plugin-chatluna/utils/error");
var ChatLunaAuthService = class extends import_koishi.Service {
  constructor(ctx, config) {
    super(ctx, "chatluna_auth");
    this.ctx = ctx;
    this.config = config;
    ctx.on("ready", async () => {
      await this._defineDatabase();
    });
  }
  static {
    __name(this, "ChatLunaAuthService");
  }
  async getUser(session, userId = session.userId) {
    const list = await this.ctx.database.get("chathub_auth_user", {
      userId
    });
    if (list.length === 0) {
      return this._createUser(session, userId);
    } else if (list.length > 1) {
      throw new import_error.ChatLunaError(import_error.ChatLunaErrorCode.USER_NOT_FOUND);
    }
    return list[0];
  }
  async _createUser(session, userId = session.userId) {
    const user = await this.ctx.database.getUser(session.platform, userId);
    if (user == null) {
      throw new import_error.ChatLunaError(
        import_error.ChatLunaErrorCode.USER_NOT_FOUND,
        new Error(`
                user not found in platform ${session.platform} and id ${userId}`)
      );
    }
    const resolveAuthType = /* @__PURE__ */ __name((authType2) => authType2 > 2 ? "admin" : authType2 > 1 ? "user" : "guest", "resolveAuthType");
    const copyOfSession = session?.bot?.session(session.event) ?? session;
    copyOfSession.userId = userId;
    let [rawAuthType, balance, authGroup] = await copyOfSession.resolve(
      this.config.authUserDefaultGroup
    ) ?? [0, 0, "guest"];
    const authType = resolveAuthType(
      user.authority > rawAuthType ? user.authority : rawAuthType
    );
    if (authType === "admin") {
      authGroup = authType;
    }
    const authUser = {
      userId,
      balance: balance === 0 ? authType === "admin" ? 1e4 : authType === "user" ? 10 : 1 : balance,
      authType
    };
    await this.ctx.database.upsert("chathub_auth_user", [authUser]);
    await this.addUserToGroup(authUser, authGroup);
    return authUser;
  }
  async createAuthGroup(session, group) {
    const user = await this.getUser(session);
    await this.ctx.database.upsert("chathub_auth_group", [group]);
    await this.addUserToGroup(user, group.name);
  }
  async resolveAuthGroup(session, platform, userId = session.userId) {
    const groups = (await this.ctx.database.get("chathub_auth_group", {
      platform: {
        $or: [void 0, platform]
      }
    })).sort((a, b) => {
      if (a.platform === platform) {
        return -1;
      }
      if (b.platform === platform) {
        return 1;
      }
      return b.priority - a.priority;
    });
    const groupIds = groups.map((g) => g.id);
    const joinedGroups = (await this.ctx.database.get("chathub_auth_joined_user", {
      groupId: {
        // max 50??
        $in: groupIds
      },
      userId
    })).sort(
      (a, b) => groupIds.indexOf(a.groupId) - groupIds.indexOf(b.groupId)
    );
    if (joinedGroups.length === 0) {
      throw new import_error.ChatLunaError(import_error.ChatLunaErrorCode.AUTH_GROUP_NOT_JOINED);
    }
    const result = groups.find((g) => g.id === joinedGroups[0].groupId);
    if (result == null) {
      throw new import_error.ChatLunaError(
        import_error.ChatLunaErrorCode.AUTH_GROUP_NOT_FOUND,
        new Error(`Group not found for user ${session.username} and platform
                ${platform}`)
      );
    }
    return result;
  }
  async getAuthGroups(platform) {
    const groups = await this.ctx.database.get("chathub_auth_group", {
      platform
    });
    return groups;
  }
  async getAuthGroup(name2, throwError = true) {
    const result = (await this.ctx.database.get("chathub_auth_group", { name: name2 }))?.[0];
    if (result == null && throwError) {
      throw new import_error.ChatLunaError(import_error.ChatLunaErrorCode.AUTH_GROUP_NOT_FOUND);
    }
    return result;
  }
  async calculateBalance(session, platform, usedTokenNumber, userId = session.userId) {
    const currentAuthGroup = await this.resolveAuthGroup(
      session,
      platform,
      userId
    );
    const usedBalance = new import_decimal.Decimal(1e-3).mul(currentAuthGroup.costPerToken).mul(usedTokenNumber);
    return await this.modifyBalance(session, -usedBalance.toNumber());
  }
  async getBalance(session, userId = session.userId) {
    return (await this.getUser(session, userId)).balance;
  }
  async modifyBalance(session, amount, userId = session.userId) {
    const user = await this.getUser(session, userId);
    user.balance = new import_decimal.Decimal(user.balance).add(amount).toNumber();
    await this.ctx.database.upsert("chathub_auth_user", [user]);
    return user.balance;
  }
  async setBalance(session, amount, userId = session.userId) {
    const user = await this.getUser(session, userId);
    user.balance = amount;
    await this.ctx.database.upsert("chathub_auth_user", [user]);
    return user.balance;
  }
  async _getAuthGroup(authGroupId) {
    const authGroup = (await this.ctx.database.get("chathub_auth_group", {
      id: authGroupId
    }))?.[0];
    if (authGroup == null) {
      throw new import_error.ChatLunaError(
        import_error.ChatLunaErrorCode.AUTH_GROUP_NOT_FOUND,
        new Error(`Auth group not found for id ${authGroupId}`)
      );
    }
    return authGroup;
  }
  async resetAuthGroup(authGroupId) {
    const authGroup = await this._getAuthGroup(authGroupId);
    const currentTime = /* @__PURE__ */ new Date();
    authGroup.lastCallTime = authGroup.lastCallTime ?? currentTime.getTime();
    const authGroupDate = new Date(authGroup.lastCallTime);
    const currentDayOfStart = (/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0);
    if (authGroupDate.getTime() < currentDayOfStart) {
      authGroup.currentLimitPerDay = 0;
      authGroup.currentLimitPerMin = 0;
      authGroup.lastCallTime = currentTime.getTime();
      await this.ctx.database.upsert("chathub_auth_group", [authGroup]);
      return authGroup;
    }
    if (currentTime.getTime() - authGroup.lastCallTime >= 6e4) {
      authGroup.currentLimitPerMin = 0;
      authGroup.lastCallTime = currentTime.getTime();
      await this.ctx.database.upsert("chathub_auth_group", [authGroup]);
      return authGroup;
    }
    return authGroup;
  }
  async increaseAuthGroupCount(authGroupId) {
    const authGroup = await this._getAuthGroup(authGroupId);
    const currentTime = /* @__PURE__ */ new Date();
    authGroup.lastCallTime = authGroup.lastCallTime ?? currentTime.getTime();
    const authGroupDate = new Date(authGroup.lastCallTime);
    const currentDayOfStart = (/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0);
    if (authGroupDate.getTime() < currentDayOfStart) {
      authGroup.currentLimitPerDay = 1;
      authGroup.currentLimitPerMin = 1;
      authGroup.lastCallTime = currentTime.getTime();
      await this.ctx.database.upsert("chathub_auth_group", [authGroup]);
      return;
    }
    if (currentTime.getTime() - authGroup.lastCallTime >= 6e4) {
      authGroup.currentLimitPerDay += 1;
      authGroup.currentLimitPerMin = 1;
      authGroup.lastCallTime = currentTime.getTime();
      await this.ctx.database.upsert("chathub_auth_group", [authGroup]);
    }
    authGroup.currentLimitPerDay += 1;
    authGroup.currentLimitPerMin += 1;
    await this.ctx.database.upsert("chathub_auth_group", [authGroup]);
  }
  async addUserToGroup(user, groupName) {
    const group = await this.getAuthGroup(groupName);
    const isJoined = (await this.ctx.database.get("chathub_auth_joined_user", {
      groupName,
      userId: user.userId
    })).length === 1;
    if (isJoined) {
      throw new import_error.ChatLunaError(import_error.ChatLunaErrorCode.AUTH_GROUP_ALREADY_JOINED);
    }
    await this.ctx.database.upsert("chathub_auth_joined_user", [
      {
        userId: user.userId,
        groupId: group.id,
        groupName: group.name
      }
    ]);
  }
  async removeUserFormGroup(user, groupName) {
    const group = await this.getAuthGroup(groupName);
    await this.ctx.database.remove("chathub_auth_joined_user", {
      userId: user.userId,
      groupName: group.name
    });
  }
  async setAuthGroup(groupName, group) {
    await this.ctx.database.upsert("chathub_auth_group", [
      Object.assign({}, group, {
        name: groupName
      })
    ]);
  }
  async _initAuthGroup() {
    const groups = await this.ctx.database.get("chathub_auth_group", {
      name: {
        $in: ["guest", "user", "admin"]
      }
    });
    let currentGroup;
    if (!groups.some((g) => g.name === "guest")) {
      currentGroup = {
        name: "guest",
        priority: 0,
        limitPerMin: 10,
        limitPerDay: 2e3,
        // 1000 token / 0.3
        costPerToken: 0.3
      };
      await this.ctx.database.upsert("chathub_auth_group", [currentGroup]);
    }
    if (!groups.some((g) => g.name === "user")) {
      currentGroup = {
        name: "user",
        priority: 1,
        limitPerMin: 1e3,
        limitPerDay: 2e5,
        // 1000 token / 0.01
        costPerToken: 0.01
      };
      await this.ctx.database.upsert("chathub_auth_group", [currentGroup]);
    }
    if (!groups.some((g) => g.name === "admin")) {
      currentGroup = {
        name: "admin",
        priority: 2,
        limitPerMin: 1e4,
        limitPerDay: 2e7,
        // 1000 token / 0.001
        costPerToken: 1e-3
      };
      await this.ctx.database.upsert("chathub_auth_group", [currentGroup]);
    }
  }
  async _defineDatabase() {
    const ctx = this.ctx;
    ctx.database.extend(
      "chathub_auth_user",
      {
        userId: {
          type: "string"
        },
        balance: {
          type: "decimal",
          precision: 20,
          scale: 10
        },
        authType: {
          type: "char",
          length: 50
        }
      },
      {
        autoInc: false,
        primary: "userId",
        unique: ["userId"]
      }
    );
    ctx.database.extend(
      "chathub_auth_joined_user",
      {
        userId: "string",
        groupId: "integer",
        groupName: "string",
        id: "integer"
      },
      {
        autoInc: true,
        primary: "id",
        unique: ["id"]
      }
    );
    ctx.database.extend(
      "chathub_auth_group",
      {
        limitPerDay: {
          type: "integer",
          nullable: false
        },
        limitPerMin: {
          type: "integer",
          nullable: false
        },
        lastCallTime: {
          type: "integer",
          length: 7,
          nullable: true
        },
        currentLimitPerDay: {
          type: "integer",
          nullable: true
        },
        currentLimitPerMin: {
          type: "integer",
          nullable: true
        },
        supportModels: {
          type: "json",
          nullable: true
        },
        priority: {
          type: "integer",
          nullable: false,
          initial: 0
        },
        platform: {
          type: "char",
          length: 255,
          nullable: true
        },
        costPerToken: {
          type: "decimal",
          precision: 8,
          scale: 4
        },
        name: {
          type: "char",
          length: 255
        },
        id: {
          type: "integer"
        }
      },
      {
        autoInc: true,
        primary: "id",
        unique: ["id", "name"]
      }
    );
    await this._initAuthGroup();
  }
};

// src/commands/auth.ts
function apply(ctx, config, chain) {
  if (config.authSystem !== true) return;
  ctx.command("chatluna.auth", { authority: 1 });
  ctx.command("chatluna.auth.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").option("platform", "-t <platform:string>").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_auth_group", {
      authPlatform: options.platform,
      page: options.page ?? 1,
      limit: options.limit ?? 3
    });
  });
  ctx.command("chatluna.auth.add <name:string>").option("user", "-u <user:user>").action(async ({ session, options }, name2) => {
    const userId = options.user?.split(":")?.[1] ?? session.userId;
    await chain.receiveCommand(session, "add_user_to_auth_group", {
      auth_group_resolve: { name: name2 },
      authUser: userId
    });
  });
  ctx.command("chatluna.auth.kick <name:string>").option("user", "-u <user:user>").action(async ({ session, options }, name2) => {
    const userId = options.user?.split(":")?.[1] ?? session.userId;
    await chain.receiveCommand(session, "kick_user_form_auth_group", {
      auth_group_resolve: { name: name2 },
      authUser: userId
    });
  });
  ctx.command("chatluna.auth.create").option("name", "-n <name:string>").option("preMin", "-pm <min:number>").option("preDay", "-pd <day:number>").option("platform", "-pf <platform:string>").option("supportModels", "-s [...model]").option("priority", "-p <priority:number>").option("cost", "-c <cost:number>").action(async ({ session, options }) => {
    await chain.receiveCommand(session, "create_auth_group", {
      auth_group_resolve: {
        name: options.name ?? void 0,
        requestPreDay: options.preDay ?? void 0,
        requestPreMin: options.preMin ?? void 0,
        platform: options.platform ?? void 0,
        supportModels: options.supportModels ?? void 0,
        priority: options.priority ?? void 0
      }
    });
  });
  ctx.command("chatluna.auth.set").option("name", "-n <name:string>").option("preMin", "-pm <min:number>").option("preDay", "-pd <day:number>").option("platform", "-pf <platform:string>").option("supportModels", "-s [...model]").option("priority", "-p <priority:number>").option("cost", "-c <cost:number>").action(async ({ session, options }) => {
    await chain.receiveCommand(session, "set_auth_group", {
      auth_group_resolve: {
        name: options.name ?? void 0,
        requestPreDay: options.preDay ?? void 0,
        requestPreMin: options.preMin ?? void 0,
        platform: options.platform ?? void 0,
        supportModels: options.supportModels ?? void 0,
        priority: options.priority ?? void 0
      }
    });
  });
  ctx.command("chatluna.balance");
  ctx.command("chatluna.balance.clear <user:user>", { authority: 3 }).action(
    async ({ session }, user) => {
      const userId = user?.split(":")?.[1] ?? user;
      await chain.receiveCommand(session, "clear_balance", {
        authUser: userId
      });
    }
  );
  ctx.command("chatluna.balance.set <balance:number>", { authority: 3 }).option("user", "-u <user:user>").action(async ({ options, session }, balance) => {
    const userId = options.user?.split(":")?.[1] ?? session.userId;
    await chain.receiveCommand(session, "set_balance", {
      authUser: userId,
      balance
    });
  });
  ctx.command("chatluna.balance.query [user:user]").action(
    async ({ session }, user) => {
      const userId = user?.split(":")?.[1] ?? session.userId;
      await chain.receiveCommand(session, "query_balance", {
        authUser: userId
      });
    }
  );
}
__name(apply, "apply");

// src/commands/chat.ts
var import_koishi2 = require("koishi");
function apply2(ctx, config, chain) {
  ctx.command("chatluna", {
    authority: 1
  }).alias("chatluna");
  ctx.command("chatluna.chat", {
    authority: 1
  });
  ctx.command("chatluna.chat.text <message:text>").option("room", "-r <room:string>").option("type", "-t <type: string>").action(async ({ options, session }, message) => {
    const renderType = options.type ?? config.outputMode;
    if (!ctx.chatluna.renderer.rendererTypeList.some(
      (type) => type === renderType
    )) {
      return session.text(".invalid-render-type");
    }
    const elements = import_koishi2.h.parse(message);
    await chain.receiveCommand(
      session,
      "",
      {
        message: elements,
        room_resolve: {
          name: options.room
        },
        renderOptions: {
          session,
          split: config.splitMessage,
          type: renderType
        }
      },
      ctx
    );
  });
  ctx.command("chatluna.chat.rollback [message:text]").option("room", "-r <room:string>").option("i", "-i <i: string>").action(async ({ options, session }, message) => {
    const elements = message ? import_koishi2.h.parse(message) : void 0;
    await chain.receiveCommand(
      session,
      "rollback",
      {
        message: elements,
        room_resolve: {
          name: options.room
        },
        renderOptions: {
          session,
          split: config.splitMessage,
          type: config.outputMode
        },
        rollback_round: options.i ?? 1
      },
      ctx
    );
  });
  ctx.command("chatluna.chat.stop").option("room", "-r <room:string>").action(async ({ options, session }, message) => {
    await chain.receiveCommand(
      session,
      "stop_chat",
      {
        room_resolve: {
          name: options.room
        }
      },
      ctx
    );
  });
  ctx.command("chatluna.chat.compress").option("room", "-r <room:string>").action(async ({ options, session }) => {
    await chain.receiveCommand(
      session,
      "compress_room",
      {
        force: true,
        i18n_base: "commands.chatluna.chat.compress.messages",
        room_resolve: {
          name: options.room
        }
      },
      ctx
    );
  });
  ctx.command("chatluna.chat.voice <message:text>").option("room", "-r <room:string>").option("speaker", "-s <speakerId:number>", { authority: 1 }).action(async ({ options, session }, message) => {
    const elements = message ? import_koishi2.h.parse(message) : void 0;
    await chain.receiveCommand(
      session,
      "",
      {
        message: elements,
        renderOptions: {
          split: config.splitMessage,
          type: "voice",
          voice: {
            speakerId: options.speaker
          },
          session
        },
        room_resolve: {
          name: options.room
        }
      },
      ctx
    );
  });
  ctx.command("chatluna.wipe", { authority: 3 }).action(
    async ({ session }) => {
      await chain.receiveCommand(session, "wipe");
    }
  );
  ctx.command("chatluna.restart").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "restart");
  });
}
__name(apply2, "apply");

// src/commands/mcp.ts
function apply3(ctx, config, chain) {
  ctx.inject(["chatluna_agent"], (ctx2) => {
    ctx2.command("chatluna.mcp", { authority: 1 });
    ctx2.command("chatluna.mcp.list").action(async ({ session }) => {
      await chain.receiveCommand(session, "list_mcp_tools", {});
    });
    ctx2.command("chatluna.mcp.add <mcpConfig:text>", {
      authority: 3
    }).action(async ({ session }, mcpConfig) => {
      await chain.receiveCommand(session, "add_mcp_server", {
        mcpConfig
      });
    });
    ctx2.command("chatluna.mcp.remove <serverName:string>", {
      authority: 3
    }).action(async ({ session }, serverName) => {
      await chain.receiveCommand(session, "remove_mcp_server", {
        serverName
      });
    });
    ctx2.command("chatluna.mcp.enable <toolName:string>", {
      authority: 3
    }).action(async ({ session }, toolName) => {
      await chain.receiveCommand(session, "enable_mcp_tool", {
        toolName
      });
    });
  });
}
__name(apply3, "apply");

// src/commands/memory.ts
function apply4(ctx, config, chain) {
  ctx.inject(["chatluna_long_memory"], (ctx2) => {
    ctx2.command("chatluna.memory", { authority: 1 });
    ctx2.command("chatluna.memory.search <query:string>").option("type", "-t <type:string>").option("limit", "-l <limit:number>").option("page", "-p <page:number>").option("view", "-v <view:string>").action(async ({ options, session }, query) => {
      await chain.receiveCommand(session, "search_memory", {
        type: options.type,
        page: options.page ?? 1,
        limit: options.limit ?? 6,
        view: options.view,
        query
      });
    });
    ctx2.command("chatluna.memory.delete <...ids>").option("type", "-t <type:string>").option("view", "-v <view:string>").action(async ({ session, options }, ...ids) => {
      await chain.receiveCommand(session, "delete_memory", {
        ids,
        type: options.type,
        view: options.view
      });
    });
    ctx2.command("chatluna.memory.clear").option("type", "-t <type:string>").option("view", "-v <view:string>").action(async ({ session, options }) => {
      await chain.receiveCommand(session, "clear_memory", {
        type: options.type,
        view: options.view
      });
    });
    ctx2.command("chatluna.memory.add <content:text>").option("type", "-t <type:string>").option("view", "-v <view:string>").action(async ({ session, options }, content) => {
      await chain.receiveCommand(session, "add_memory", {
        type: options.type,
        view: options.view,
        content
      });
    });
    ctx2.command("chatluna.memory.edit <id:string>").option("type", "-t <type:string>").option("view", "-v <view:string>").action(async ({ session, options }, id, content) => {
      await chain.receiveCommand(session, "edit_memory", {
        memoryId: id,
        content,
        type: options.type,
        view: options.view
      });
    });
  });
}
__name(apply4, "apply");

// src/commands/model.ts
function apply5(ctx, config, chain) {
  ctx.command("chatluna.model", {
    authority: 1
  });
  ctx.command("chatluna.model.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_model", {
      page: options.page ?? 1,
      limit: options.limit ?? 5
    });
  });
  ctx.command("chatluna.model.search <query:string>").option("page", "-p <page:number>").option("limit", "-l <limit:number>").action(async ({ options, session }, query) => {
    await chain.receiveCommand(session, "search_model", {
      query,
      page: options.page ?? 1,
      limit: options.limit ?? 5
    });
  });
  ctx.command("chatluna.model.test <model:string>").action(
    async ({ session }, model) => {
      await chain.receiveCommand(session, "test_model", {
        model
      });
    }
  );
}
__name(apply5, "apply");

// src/commands/preset.ts
function apply6(ctx, config, chain) {
  ctx.command("chatluna.preset", { authority: 1 });
  ctx.command("chatluna.preset.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_preset", {
      page: options.page ?? 1,
      limit: options.limit ?? 3
    });
  });
  ctx.command("chatluna.preset.add <preset:string>").action(
    async ({ session }, preset) => {
      await chain.receiveCommand(session, "add_preset", {
        addPreset: preset
      });
    }
  );
  ctx.command(
    "chatluna.preset.clone <originPreset:string> [newPresetName:string]",
    { authority: 3 }
  ).action(async ({ session }, preset, newPreset) => {
    await chain.receiveCommand(session, "clone_preset", {
      clonePreset: {
        name: preset,
        newName: newPreset ?? preset + "(1)"
      }
    });
  });
  ctx.command("chatluna.preset.set <preset:string>", { authority: 3 }).action(
    async ({ session }, preset) => {
      await chain.receiveCommand(session, "set_preset", {
        setPreset: preset
      });
    }
  );
  ctx.command("chatluna.preset.delete <preset:string>", {
    authority: 3
  }).action(async ({ session }, preset) => {
    await chain.receiveCommand(session, "delete_preset", {
      deletePreset: preset
    });
  });
}
__name(apply6, "apply");

// src/commands/providers.ts
function apply7(ctx, config, chain) {
  ctx.command("chatluna.embeddings", { authority: 1 });
  ctx.command("chatluna.vectorstore", { authority: 1 });
  ctx.command("chatluna.embeddings.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_embeddings", {
      page: options.page ?? 1,
      limit: options.limit ?? 5
    });
  });
  ctx.command("chatluna.vectorstore.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_vector_store", {
      page: options.page ?? 1,
      limit: options.limit ?? 5
    });
  });
  ctx.command("chatluna.embeddings.set <embeddings:string>", {
    authority: 3
  }).action(async ({ session }, embeddings) => {
    await chain.receiveCommand(session, "set_embeddings", {
      setEmbeddings: embeddings
    });
  });
  ctx.command("chatluna.vectorstore.set <vectorStore:string>", {
    authority: 3
  }).action(async ({ session }, vectorStore) => {
    await chain.receiveCommand(session, "set_vector_store", {
      setVectorStore: vectorStore
    });
  });
}
__name(apply7, "apply");

// src/commands/room.ts
function apply8(ctx, config, chain) {
  ctx.command("chatluna.room");
  ctx.command("chatluna.room.create").option("name", "-n <name:string>").option("preset", "-p <preset:string>").option("model", "-m <model:string>").option("chatMode", "-c <chatMode:string>").option("password", "-w <password:string>").option("visibility", "-v <visibility:string>").action(async ({ session, options }) => {
    await chain.receiveCommand(session, "create_room", {
      room_resolve: {
        name: options.name ?? void 0,
        preset: options.preset ?? void 0,
        model: options.model ?? void 0,
        chatMode: options.chatMode ?? void 0,
        password: options.password ?? void 0,
        visibility: options.visibility ?? void 0
      }
    });
  });
  ctx.command("chatluna.room.delete [room:text]").action(
    async ({ session }, room) => {
      await chain.receiveCommand(session, "delete_room", {
        room_resolve: {
          name: room
        }
      });
    }
  );
  ctx.command("chatluna.room.auto-update <status:string>").option("room", "-r <room:string>").action(async ({ session, options }, status) => {
    if (status.toLowerCase() !== "true" && status.toLowerCase() !== "false") {
      return session.text(".messages.invalid-status");
    }
    await chain.receiveCommand(session, "set_auto_update_room", {
      room_resolve: {
        name: options.room
      },
      auto_update_room: status.toLowerCase() === "true"
    });
  });
  ctx.command("chatluna.room.kick <...arg:user>").action(
    async ({ session }, ...user) => {
      const users = user.map((u) => u.split(":")[1]);
      await chain.receiveCommand(session, "kick_member", {
        resolve_user: {
          id: users
        }
      });
    }
  );
  ctx.command("chatluna.room.invite <...arg:user>").action(
    async ({ session }, ...user) => {
      const users = user.map((u) => u.split(":")[1]);
      await chain.receiveCommand(session, "invite_room", {
        resolve_user: {
          id: users
        }
      });
    }
  );
  ctx.command("chatluna.room.join <id:text>").action(
    async ({ session }, name2) => {
      await chain.receiveCommand(session, "join_room", {
        room_resolve: {
          name: name2
        }
      });
    }
  );
  ctx.command("chatluna.room.leave [room:text]").action(
    async ({ session, options }, room) => {
      await chain.receiveCommand(session, "leave_room", {
        room_resolve: {
          name: room,
          id: room
        }
      });
    }
  );
  ctx.command("chatluna.room.clear [room:text]").alias("chatluna.chat.clear").action(async ({ session }, room) => {
    await chain.receiveCommand(session, "clear_room", {
      room_resolve: {
        name: room
      }
    });
  });
  ctx.command("chatluna.room.compress [room:text]").action(
    async ({ session }, room) => {
      await chain.receiveCommand(session, "compress_room", {
        force: true,
        i18n_base: "commands.chatluna.room.compress.messages",
        room_resolve: {
          name: room
        }
      });
    }
  );
  ctx.command("chatluna.room.set").option("name", "-n <name:string>").option("preset", "-p <preset:string>").option("model", "-m <model:string>").option("chatMode", "-c <chatMode:string>").option("password", "-w <password:string>").option("visibility", "-v <visibility:string>").action(async ({ session, options }) => {
    await chain.receiveCommand(session, "set_room", {
      room_resolve: {
        name: options.name ?? void 0,
        preset: options.preset ?? void 0,
        model: options.model ?? void 0,
        chatMode: options.chatMode ?? void 0,
        password: options.password ?? void 0,
        visibility: options.visibility ?? void 0
      }
    });
  });
  ctx.command("chatluna.room.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").option("all", "-a").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_room", {
      page: options.page ?? 1,
      limit: options.limit ?? 2,
      all_room: options.all ?? false
    });
  });
  ctx.command("chatluna.room.transfer <arg:user>").action(
    async ({ session }, user) => {
      await chain.receiveCommand(session, "transfer_room", {
        resolve_user: {
          id: user.split(":")[1]
        }
      });
    }
  );
  ctx.command("chatluna.room.info [room:text]").action(
    async ({ session }, room) => {
      await chain.receiveCommand(session, "room_info", {
        room_resolve: {
          name: room
        }
      });
    }
  );
  ctx.command("chatluna.room.switch <name:text>").action(
    async ({ session }, name2) => {
      await chain.receiveCommand(session, "switch_room", {
        room_resolve: {
          name: name2,
          id: name2
        }
      });
    }
  );
  ctx.command("chatluna.room.permission <user:user>").action(
    async ({ session }, user) => {
      await chain.receiveCommand(session, "room_permission", {
        resolve_user: {
          id: user.split(":")[1]
        }
      });
    }
  );
  ctx.command("chatluna.room.mute <...user:user>").option("room", "-r <room:string>").action(async ({ session, options }, ...user) => {
    await chain.receiveCommand(session, "mute_user", {
      room_resolve: {
        name: options.room
      },
      resolve_user: {
        id: user.map((u) => u.split(":")[1])
      }
    });
  });
}
__name(apply8, "apply");

// src/commands/tool.ts
function apply9(ctx, config, chain) {
  ctx.command("chatluna.tool", {
    authority: 1
  });
  ctx.command("chatluna.tool.list").option("page", "-p <page:number>").option("limit", "-l <limit:number>").action(async ({ options, session }) => {
    await chain.receiveCommand(session, "list_tool", {
      page: options.page ?? 1,
      limit: options.limit ?? 5
    });
  });
}
__name(apply9, "apply");

// src/command.ts
async function command(ctx, config) {
  const middlewares = (
    // middleware start
    [
      apply,
      apply2,
      apply3,
      apply4,
      apply5,
      apply6,
      apply7,
      apply8,
      apply9
    ]
  );
  for (const middleware2 of middlewares) {
    await middleware2(ctx, config, ctx.chatluna.chatChain);
  }
}
__name(command, "command");

// src/llm-core/chat/default.ts
var import_koishi_plugin_chatluna3 = require("koishi-plugin-chatluna");

// src/llm-core/chain/chat_chain.ts
var import_messages = require("@langchain/core/messages");
var import_base = require("koishi-plugin-chatluna/llm-core/chain/base");
var import_prompt = require("koishi-plugin-chatluna/llm-core/chain/prompt");
var import_error2 = require("koishi-plugin-chatluna/utils/error");
var import_string2 = require("koishi-plugin-chatluna/utils/string");
var import_koishi_plugin_chatluna = require("koishi-plugin-chatluna");

// src/llm-core/chain/qqbot_request_budget.ts
var import_string = require("koishi-plugin-chatluna/utils/string");
function clampNatural(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}
__name(clampNatural, "clampNatural");
function clampRatio(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return fallback;
  }
  return parsed;
}
__name(clampRatio, "clampRatio");
function parsePolicy(additionalKwargs) {
  const raw = additionalKwargs?.qqbot_request_budget_policy;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return {
    historyWindow: clampNatural(
      raw.historyWindow,
      80
    ),
    historyTriggerCount: clampNatural(
      raw.historyTriggerCount,
      120
    ),
    historyTokenRatio: clampRatio(
      raw.historyTokenRatio,
      0.7
    )
  };
}
__name(parsePolicy, "parsePolicy");
async function estimateHistoryTokens(llm, messages) {
  if (messages.length < 1) {
    return 0;
  }
  const text = messages.map((message) => `${message.getType()}: ${(0, import_string.getMessageContent)(message.content)}`).join("\n");
  return await llm.getNumTokens(text);
}
__name(estimateHistoryTokens, "estimateHistoryTokens");
async function applyQqbotRequestBudget(llm, history, additionalKwargs) {
  const policy = parsePolicy(additionalKwargs);
  if (policy == null) {
    return {
      messages: history,
      stats: null
    };
  }
  const originalHistoryCount = history.length;
  const maxPromptTokens = Math.max(
    1,
    Math.floor(llm.getModelMaxContextSize() * policy.historyTokenRatio)
  );
  const originalEstimatedInputTokens = await estimateHistoryTokens(llm, history);
  const needsTrim = history.length > policy.historyTriggerCount || originalEstimatedInputTokens > maxPromptTokens;
  if (!needsTrim) {
    return {
      messages: history,
      stats: {
        historyWindowCount: history.length,
        originalHistoryCount,
        estimatedInputTokens: originalEstimatedInputTokens,
        trimmedHistoryCount: 0,
        applied: false
      }
    };
  }
  const systemMessages = history.filter((message) => message.getType() === "system");
  let tailMessages = history.filter((message) => message.getType() !== "system");
  if (tailMessages.length > policy.historyWindow) {
    tailMessages = tailMessages.slice(-policy.historyWindow);
  }
  let trimmed = history;
  let estimatedInputTokens = originalEstimatedInputTokens;
  while (true) {
    const kept = /* @__PURE__ */ new Set([...systemMessages, ...tailMessages]);
    trimmed = history.filter((message) => kept.has(message));
    estimatedInputTokens = await estimateHistoryTokens(llm, trimmed);
    if (estimatedInputTokens <= maxPromptTokens || tailMessages.length <= 1) {
      break;
    }
    const shrinkBy = Math.max(
      1,
      Math.min(8, tailMessages.length - 1)
    );
    tailMessages = tailMessages.slice(shrinkBy);
  }
  return {
    messages: trimmed,
    stats: {
      historyWindowCount: trimmed.length,
      originalHistoryCount,
      estimatedInputTokens,
      trimmedHistoryCount: Math.max(0, originalHistoryCount - trimmed.length),
      applied: trimmed.length !== originalHistoryCount
    }
  };
}
__name(applyQqbotRequestBudget, "applyQqbotRequestBudget");

// src/llm-core/chain/chat_chain.ts
var ChatLunaChatChain = class _ChatLunaChatChain extends import_base.ChatLunaLLMChainWrapper {
  static {
    __name(this, "ChatLunaChatChain");
  }
  botName;
  chain;
  historyMemory;
  preset;
  variableService;
  contextManager;
  constructor({
    botName,
    historyMemory,
    preset,
    chain,
    variableService,
    contextManager
  }) {
    super();
    this.botName = botName;
    this.historyMemory = historyMemory;
    this.preset = preset;
    this.variableService = variableService;
    this.contextManager = contextManager;
    this.chain = chain;
  }
  static fromLLM(llm, {
    botName,
    historyMemory,
    preset,
    variableService,
    contextManager
  }) {
    const prompt = new import_prompt.ChatLunaChatPrompt({
      preset,
      tokenCounter: /* @__PURE__ */ __name((text) => llm.getNumTokens(text), "tokenCounter"),
      sendTokenLimit: llm.invocationParams().maxTokenLimit ?? llm.getModelMaxContextSize(),
      promptRenderService: variableService,
      contextManager
    });
    const chain = new import_base.ChatLunaLLMChain({ llm, prompt });
    return new _ChatLunaChatChain({
      botName,
      historyMemory,
      variableService,
      contextManager,
      preset,
      chain
    });
  }
  async call({
    message,
    stream,
    events,
    session,
    conversationId,
    variables,
    signal,
    maxToken
  }) {
    const requests = {
      input: message
    };
    const chatHistory = await this.historyMemory.loadMemoryVariables(requests);
    const budgetedHistory = await applyQqbotRequestBudget(
      this.chain.llm,
      chatHistory[this.historyMemory.memoryKey],
      message.additional_kwargs
    );
    requests["chat_history"] = budgetedHistory.messages;
    if (budgetedHistory.stats != null) {
      requests["variables"] = Object.assign(variables ?? {}, {
        prompt: (0, import_string2.getMessageContent)(message.content),
        qqbot_request_budget: budgetedHistory.stats
      });
    } else {
      requests["variables"] = Object.assign(variables ?? {}, {
        prompt: (0, import_string2.getMessageContent)(message.content)
      });
    }
    if (budgetedHistory.stats?.applied) {
      import_koishi_plugin_chatluna.logger.debug(
        "[qqbot-request-budget] %s",
        JSON.stringify(budgetedHistory.stats)
      );
    }
    requests["variables"]["built"] = {
      conversationId
    };
    requests["variables_hide"] = requests["variables"];
    const overrideRequestParams = message.additional_kwargs?.overrideRequestParams ?? message.additional_kwargs?.qqbot_override_request_params;
    if (overrideRequestParams != null) {
      requests["overrideRequestParams"] = overrideRequestParams;
    }
    requests["configurable"] = {
      session,
      conversationId
    };
    requests["id"] = conversationId;
    const response = await (0, import_base.callChatLunaChain)(
      this.chain,
      {
        ...requests,
        stream,
        maxTokens: maxToken,
        signal
      },
      events
    );
    if (response == null || response.text == null) {
      throw new import_error2.ChatLunaError(
        import_error2.ChatLunaErrorCode.API_REQUEST_FAILED,
        new Error(`No response from LLM: ${JSON.stringify(response)}`)
      );
    }
    const aiMessage = response.message ?? new import_messages.AIMessage(response.text);
    response.message = aiMessage;
    return response;
  }
  get model() {
    return this.chain.llm;
  }
};

// src/llm-core/chain/plugin_chat_chain.ts
var import_messages2 = require("@langchain/core/messages");
var import_base2 = require("koishi-plugin-chatluna/llm-core/chain/base");
var import_agent = require("koishi-plugin-chatluna/llm-core/agent");
var import_koishi_plugin_chatluna2 = require("koishi-plugin-chatluna");
var import_error3 = require("koishi-plugin-chatluna/utils/error");
var import_prompt2 = require("koishi-plugin-chatluna/llm-core/chain/prompt");
var import_message = require("koishi-plugin-chatluna/llm-core/memory/message");
var import_reactivity = require("@vue/reactivity");
var import_string3 = require("koishi-plugin-chatluna/utils/string");
function cloneAIMessage(message, toolCalls) {
  return new import_messages2.AIMessage({
    content: message.content,
    id: message.id,
    name: message.name,
    additional_kwargs: { ...message.additional_kwargs },
    response_metadata: { ...message.response_metadata },
    tool_calls: toolCalls,
    invalid_tool_calls: [],
    usage_metadata: message.usage_metadata
  });
}
__name(cloneAIMessage, "cloneAIMessage");
function filterHistoricalMessages(messages, allowedToolNames) {
  const allowedNames = new Set(allowedToolNames);
  const allowedToolCallIds = /* @__PURE__ */ new Set();
  const filtered = [];
  for (const message of messages) {
    const role = message.getType();
    if (role === "ai") {
      const aiMessage = message;
      const nextToolCalls = aiMessage.tool_calls?.filter(
        (toolCall) => toolCall?.name != null && allowedNames.has(toolCall.name)
      ) ?? [];
      nextToolCalls.forEach((toolCall) => {
        if (toolCall.id) {
          allowedToolCallIds.add(toolCall.id);
        }
      });
      if (nextToolCalls.length < 1) {
        if (typeof aiMessage.content === "string" ? aiMessage.content.length > 0 : aiMessage.content.length > 0) {
          filtered.push(cloneAIMessage(aiMessage, []));
        }
        continue;
      }
      filtered.push(cloneAIMessage(aiMessage, nextToolCalls));
      continue;
    }
    if (role === "tool") {
      const toolMessage = message;
      if (toolMessage.tool_call_id != null && allowedToolCallIds.has(toolMessage.tool_call_id)) {
        filtered.push(toolMessage);
      }
      continue;
    }
    if (role === "function") {
      const functionMessage = message;
      if (functionMessage.name != null && allowedNames.has(functionMessage.name)) {
        filtered.push(functionMessage);
      }
      continue;
    }
    filtered.push(message);
  }
  return filtered;
}
__name(filterHistoricalMessages, "filterHistoricalMessages");
function resolveAllowedHistoryToolNames(toolNames, toolMask, finishToolName) {
  const allowed = toolMask.mode === "all" ? toolNames : toolMask.mode === "allow" ? toolNames.filter((name2) => toolMask.allow.includes(name2)) : toolNames.filter((name2) => !toolMask.deny.includes(name2));
  if (finishToolName != null && !allowed.includes(finishToolName)) {
    allowed.push(finishToolName);
  }
  return allowed;
}
__name(resolveAllowedHistoryToolNames, "resolveAllowedHistoryToolNames");
var ChatLunaPluginChain = class _ChatLunaPluginChain extends import_base2.ChatLunaLLMChainWrapper {
  static {
    __name(this, "ChatLunaPluginChain");
  }
  executor;
  historyMemory;
  systemPrompts;
  llm;
  embeddings;
  tools;
  variableService;
  prompt;
  preset;
  contextManager;
  agentMode;
  toolMask;
  finishContract;
  toolChoice;
  _toolsRef;
  constructor({
    historyMemory,
    prompt,
    llm,
    tools,
    preset,
    embeddings,
    agentMode,
    contextManager,
    toolMask,
    finishContract,
    toolChoice
  }) {
    super();
    this.historyMemory = historyMemory;
    this.prompt = prompt;
    this.tools = tools;
    this.embeddings = embeddings;
    this.llm = llm;
    this.agentMode = agentMode ?? "react";
    this.preset = preset;
    this.contextManager = contextManager;
    this.toolMask = toolMask;
    this.finishContract = finishContract;
    this.toolChoice = toolChoice;
    this._toolsRef = (0, import_agent.createToolsRef)({
      tools: this.tools,
      embeddings: this.embeddings,
      toolMask: this.toolMask
    });
    this.executor = this._createExecutor();
  }
  getHistoryPersistencePolicy() {
    if (this.finishContract == null) {
      return import_base2.DEFAULT_CHAT_HISTORY_PERSISTENCE_POLICY;
    }
    return {
      persistIntermediateAgentMessages: false,
      toolMemory: {
        enabled: true,
        storageKey: import_message.TOOL_MEMORY_STORAGE_KEY,
        maxEntries: 3,
        finishToolName: this.finishContract.toolName
      }
    };
  }
  static fromLLMAndTools(llm, tools, {
    historyMemory,
    preset,
    embeddings,
    agentMode,
    variableService,
    contextManager,
    toolMask,
    finishContract,
    toolChoice
  }) {
    const prompt = new import_prompt2.ChatLunaChatPrompt({
      preset,
      tokenCounter: /* @__PURE__ */ __name((text) => llm.getNumTokens(text), "tokenCounter"),
      promptRenderService: variableService,
      contextManager,
      sendTokenLimit: llm.invocationParams().maxTokenLimit ?? llm.getModelMaxContextSize()
    });
    return new _ChatLunaPluginChain({
      historyMemory,
      prompt,
      llm,
      agentMode,
      embeddings,
      tools,
      preset,
      variableService,
      contextManager,
      toolMask,
      finishContract,
      toolChoice
    });
  }
  _createExecutor() {
    return (0, import_agent.createAgentExecutor)({
      llm: (0, import_reactivity.computed)(() => this.llm),
      tools: this._toolsRef.tools,
      prompt: this.prompt,
      agentMode: this.agentMode,
      returnIntermediateSteps: this.agentMode === "tool-calling",
      handleParsingErrors: true,
      finishContract: this.finishContract,
      instructions: (0, import_reactivity.computed)(() => {
        if (this.agentMode === "react") {
          return this.preset.value.config.reActInstruction;
        }
        return void 0;
      })
    });
  }
  async call({
    message,
    signal,
    session,
    events,
    conversationId,
    variables,
    maxToken,
    messageQueue,
    onAgentEvent,
    toolMask: callToolMask,
    subagentContext
  }) {
    const requests = {
      input: message
    };
    const nextVars = Object.assign({}, variables ?? {});
    const finishToolName = this.finishContract?.toolName;
    const toolMask = (0, import_agent.ensureToolMaskAllows)(
      (0, import_agent.intersectToolMasks)(
        this.tools.value.map((tool) => tool.name).filter((name2) => Boolean(name2)),
        this.toolMask,
        subagentContext?.toolMask ?? callToolMask
      ),
      finishToolName ? [finishToolName] : []
    );
    const chatHistory = this.historyMemory.chatHistory;
    const messages = filterHistoricalMessages(
      await chatHistory.getMessages(),
      resolveAllowedHistoryToolNames(
        this.tools.value.map((tool) => tool.name).filter((name2) => Boolean(name2)),
        toolMask,
        finishToolName
      )
    );
    if (this.agentMode === "react") {
      await chatHistory.removeAllToolAndFunctionMessages();
    }
    const budgetedHistory = await applyQqbotRequestBudget(
      this.llm,
      [...messages],
      message.additional_kwargs
    );
    requests["chat_history"] = [...budgetedHistory.messages];
    requests["id"] = conversationId;
    requests["variables"] = Object.assign(nextVars, {
      prompt: (0, import_string3.getMessageContent)(message.content),
      ...budgetedHistory.stats != null ? { qqbot_request_budget: budgetedHistory.stats } : {}
    });
    if (budgetedHistory.stats?.applied) {
      import_koishi_plugin_chatluna2.logger.debug(
        "[qqbot-request-budget] %s",
        JSON.stringify(budgetedHistory.stats)
      );
    }
    requests["variables"]["built"] = {
      conversationId
    };
    requests["variables_hide"] = requests["variables"];
    if (this.toolChoice != null) {
      requests["tool_choice"] = this.toolChoice;
    }
    const overrideRequestParams = message.additional_kwargs?.overrideRequestParams ?? message.additional_kwargs?.qqbot_override_request_params;
    if (overrideRequestParams != null) {
      requests["overrideRequestParams"] = overrideRequestParams;
    }
    const afterUserMessage = message.additional_kwargs?.qqbot_after_user_message;
    if (afterUserMessage != null) {
      requests["after_user_message"] = afterUserMessage;
    }
    const finalResponseSchema = message.additional_kwargs?.qqbot_final_response_schema;
    if (finalResponseSchema != null) {
      requests["qqbot_final_response_schema"] = finalResponseSchema;
    }
    const finalResponseInstruction = message.additional_kwargs?.qqbot_final_response_instruction;
    if (typeof finalResponseInstruction === "string" && finalResponseInstruction.trim().length > 0) {
      requests["qqbot_final_response_instruction"] = finalResponseInstruction.trim();
    }
    requests["configurable"] = {
      session,
      conversationId,
      toolMask,
      subagentContext
    };
    this._toolsRef.update(session, messages.concat(message), toolMask);
    const preset = this.preset.value;
    const executor = this.executor.value;
    let usedToken = 0;
    let response;
    let error;
    const request2 = /* @__PURE__ */ __name(() => {
      return executor.invoke(
        {
          ...requests,
          maxTokens: maxToken
        },
        {
          signal,
          callbacks: [
            {
              handleLLMEnd(out) {
                usedToken += out.llmOutput?.usage_metadata?.total_tokens ?? 0;
              },
              handleAgentAction(action) {
                return events?.["llm-call-tool"]?.(
                  action.tool,
                  action.toolInput,
                  action.content,
                  action.log
                );
              },
              handleToolEnd(out) {
                import_koishi_plugin_chatluna2.logger.debug(
                  "Tool end:",
                  (0, import_string3.sanitizeToolLogValue)(out)
                );
              },
              handleLLMNewToken(token) {
                return events?.["llm-new-token"]?.(token);
              },
              handleCustomEvent(name2, data) {
                if (name2 === "LLMNewChunk") {
                  return events?.["llm-new-chunk"]?.(data);
                }
              }
            }
          ],
          configurable: {
            session,
            model: this.llm,
            conversationId,
            preset: preset.triggerKeyword[0],
            userId: session.userId,
            toolMask,
            messageQueue,
            onAgentEvent,
            subagentContext
          }
        }
      );
    }, "request");
    if (signal?.aborted) {
      throw signal.reason ?? new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.ABORTED);
    }
    try {
      response = await request2();
    } catch (e) {
      if (e instanceof import_error3.ChatLunaError && e.errorCode === import_error3.ChatLunaErrorCode.ABORTED) {
        throw e;
      }
      if (e?.message?.includes("Aborted")) {
        throw new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.ABORTED);
      }
      import_koishi_plugin_chatluna2.logger.error(e);
      error = e;
    }
    await events?.["llm-used-token-count"]?.(usedToken);
    if (error != null && response == null) {
      if (error instanceof import_error3.ChatLunaError) {
        throw error;
      } else {
        throw new import_error3.ChatLunaError(
          import_error3.ChatLunaErrorCode.API_REQUEST_FAILED,
          error
        );
      }
    }
    if (response == null) {
      throw new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.API_REQUEST_FAILED);
    }
    return response;
  }
  get model() {
    return this.llm;
  }
};

// src/llm-core/chat/default.ts
var import_count_tokens = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_reactivity2 = require("@vue/reactivity");
var import_schema = require("koishi-plugin-chatluna/utils/schema");
async function defaultFactory(ctx, service) {
  (0, import_schema.modelSchema)(ctx, true);
  (0, import_schema.vectorStoreSchema)(ctx);
  (0, import_schema.embeddingsSchema)(ctx);
  (0, import_schema.chatChainSchema)(ctx);
  ctx.on("chatluna/model-removed", (service2, platform) => {
    const wrapper = ctx.chatluna.getCachedInterfaceWrapper();
    if (wrapper == null) {
      return;
    }
    wrapper.getCachedConversations().filter(
      ([_, conversation]) => conversation.room && (0, import_count_tokens.parseRawModelName)(conversation.room.model)[0] === platform
    ).forEach(async ([id, info]) => {
      const result = await wrapper.clearCache(info.room);
      if (result) {
        import_koishi_plugin_chatluna3.logger?.debug(`Cleared cache for room ${id}`);
      }
    });
  });
  ctx.on("chatluna/tool-updated", () => {
    const wrapper = ctx.chatluna.getCachedInterfaceWrapper();
    if (wrapper == null) {
      return;
    }
    wrapper.getCachedConversations().filter(
      ([_, conversation]) => conversation?.chatInterface?.chatMode === "plugin" || conversation?.chatInterface?.chatMode === "browsing"
    ).forEach(async ([id, info]) => {
      const result = await wrapper.clearCache(info.room);
      if (result) {
        import_koishi_plugin_chatluna3.logger?.debug(`Cleared cache for room ${id}`);
      }
    });
  });
  service.registerChatChain(
    "chat",
    { "zh-CN": "聊天模式", "en-US": "Chat mode" },
    (params) => ChatLunaChatChain.fromLLM(params.model, {
      variableService: ctx.chatluna.promptRenderer,
      contextManager: ctx.chatluna.contextManager,
      botName: params.botName,
      preset: params.preset,
      historyMemory: params.historyMemory
    })
  );
  service.registerChatChain(
    "plugin",
    {
      "zh-CN": "Agent 模式",
      "en-US": "Agent mode"
    },
    (params) => ChatLunaPluginChain.fromLLMAndTools(
      params.model,
      getTools(service),
      {
        variableService: ctx.chatluna.promptRenderer,
        contextManager: ctx.chatluna.contextManager,
        preset: params.preset,
        historyMemory: params.historyMemory,
        embeddings: params.embeddings,
        agentMode: params.supportChatChain ? "tool-calling" : "react"
      }
    )
  );
}
__name(defaultFactory, "defaultFactory");
function getTools(service) {
  const tools = service.getTools();
  return (0, import_reactivity2.computed)(() => tools.value.map((name2) => service.getTool(name2)));
}
__name(getTools, "getTools");

// src/llm-core/memory/lore_book/index.ts
var import_koishi_plugin_chatluna4 = require("koishi-plugin-chatluna");
var import_messages3 = require("@langchain/core/messages");
function apply10(ctx, config) {
  const cache = /* @__PURE__ */ new Map();
  ctx.before(
    "chatluna/chat",
    async (conversationId, message, _promptVariables, chatInterface, chain) => {
      const preset = chatInterface.preset.value;
      if (!preset.loreBooks || preset.loreBooks.items.length === 0) {
        return;
      }
      let matcher = cache.get(preset);
      if (!matcher) {
        const loreBooks = preset.loreBooks.items;
        matcher = new LoreBookMatcher(loreBooks, {
          scanDepth: preset.loreBooks?.scanDepth,
          recursiveScan: preset.loreBooks?.recursiveScan,
          maxRecursionDepth: preset.loreBooks?.maxRecursionDepth
        });
        cache.set(preset, matcher);
      }
      const messages = [
        ...await chatInterface.chatHistory.getMessages()
      ];
      messages.push(message);
      const matchedLores = matcher.matchLoreBooks(messages);
      if (matchedLores.length > 0) {
        import_koishi_plugin_chatluna4.logger.debug(
          `Found ${matchedLores.length} matched lore books: ${JSON.stringify(
            matchedLores.map((lore) => lore.keywords)
          )}`
        );
        ctx.chatluna.contextManager.inject({
          conversationId,
          name: "lore_books",
          value: matchedLores,
          once: true
        });
      }
    }
  );
  ctx.on(
    "chatluna/clear-chat-history",
    async (conversationId, chatInterface) => {
      cache.clear();
      ctx.chatluna.contextManager.clearConversation(conversationId);
    }
  );
}
__name(apply10, "apply");
var LoreBookMatcher = class {
  static {
    __name(this, "LoreBookMatcher");
  }
  loreBooks;
  defaultConfig;
  regexCache;
  constructor(loreBooks, defaultConfig = {}) {
    this.loreBooks = loreBooks;
    this.defaultConfig = {
      scanDepth: defaultConfig.scanDepth ?? 2,
      recursiveScan: defaultConfig.recursiveScan ?? true,
      maxRecursionDepth: defaultConfig.maxRecursionDepth ?? 3,
      matchWholeWord: defaultConfig.matchWholeWord ?? false,
      caseSensitive: defaultConfig.caseSensitive ?? true
    };
    this.regexCache = /* @__PURE__ */ new Map();
  }
  matchLoreBooks(messages) {
    const matchedLores = /* @__PURE__ */ new Set();
    const recentMessages = messages.slice().reverse();
    this.stackMatch(recentMessages, matchedLores);
    return Array.from(matchedLores).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
  }
  stackMatch(messages, matchedLores) {
    const stack = [[messages, 0]];
    while (stack.length > 0) {
      const [currentMessages, depth] = stack.pop();
      for (const loreBook of this.loreBooks) {
        if (loreBook.enabled === false || matchedLores.has(loreBook)) {
          continue;
        }
        const config = this.getConfig(loreBook);
        if (depth >= config.maxRecursionDepth) {
          continue;
        }
        const relevantMessages = currentMessages.slice(
          0,
          config.scanDepth
        );
        for (const message of relevantMessages) {
          const content = message.content;
          const contentParts = this.splitContent(config, content);
          for (const part of contentParts) {
            if (!this.matchKeywords(part, loreBook) && !loreBook.constant) {
              continue;
            }
            matchedLores.add(loreBook);
            if (config.recursiveScan) {
              stack.push([
                this.splitContent(config, loreBook.content).map(
                  (c) => new import_messages3.AIMessage(c)
                ),
                depth + 1
              ]);
            }
            break;
          }
        }
      }
    }
  }
  matchKeywords(content, loreBook) {
    return loreBook.keywords.some((keyword) => {
      const regex = this.getRegexFromKeyword(keyword, loreBook);
      return regex.test(content);
    });
  }
  getRegexFromKeyword(keyword, loreBook) {
    if (keyword instanceof RegExp) {
      return keyword;
    }
    const cacheKey = `${keyword}:${loreBook.caseSensitive}:${loreBook.matchWholeWord}`;
    let regex = this.regexCache.get(cacheKey);
    if (!regex) {
      regex = this.createRegexFromKeyword(keyword, loreBook);
      this.regexCache.set(cacheKey, regex);
    }
    return regex;
  }
  splitContent(config, content) {
    if (config.matchWholeWord) {
      return content.split(/[。！？；；.!?;,，。！？、；：\s]+/g).filter(Boolean);
    }
    return [content];
  }
  createRegexFromKeyword(keyword, loreBook) {
    let flags = "g";
    if (!loreBook.caseSensitive) {
      flags += "i";
    }
    const pattern = loreBook.matchWholeWord ? `\\b${keyword}\\b` : keyword;
    return new RegExp(pattern, flags);
  }
  getConfig(loreBook) {
    return {
      scanDepth: loreBook.scanDepth ?? this.defaultConfig.scanDepth,
      recursiveScan: loreBook.recursiveScan ?? this.defaultConfig.recursiveScan,
      maxRecursionDepth: loreBook.maxRecursionDepth ?? this.defaultConfig.maxRecursionDepth,
      matchWholeWord: loreBook.matchWholeWord ?? this.defaultConfig.matchWholeWord,
      caseSensitive: loreBook.caseSensitive ?? this.defaultConfig.caseSensitive
    };
  }
};

// src/llm-core/memory/authors_note/index.ts
function apply11(ctx, config) {
  const cache = /* @__PURE__ */ new Map();
  ctx.before(
    "chatluna/chat",
    async (conversationId, message, _promptVariables, chatInterface, chain) => {
      const preset = chatInterface.preset.value;
      const authorsNote = preset.authorsNote;
      if (!authorsNote || authorsNote.insertFrequency === 0) {
        return;
      }
      const authorsNoteCache = cache.get(conversationId) || {
        chatCount: 1
      };
      if (authorsNote.insertFrequency > 0 && authorsNoteCache.chatCount % authorsNote.insertFrequency !== 0) {
        return;
      }
      cache.set(conversationId, authorsNoteCache);
      ctx.chatluna.contextManager.inject({
        conversationId,
        name: "authors_note",
        value: authorsNote,
        once: true
      });
    }
  );
  ctx.on("chatluna/after-chat", async (conversationId, chatInterface) => {
    let authorsNoteCache = cache.get(conversationId);
    if (!authorsNoteCache) {
      authorsNoteCache = {
        chatCount: 0
      };
      cache.set(conversationId, authorsNoteCache);
    }
    authorsNoteCache.chatCount++;
  });
  ctx.on(
    "chatluna/clear-chat-history",
    async (conversationId, chatInterface) => {
      cache.delete(conversationId);
      ctx.chatluna.contextManager.clearConversation(conversationId);
    }
  );
}
__name(apply11, "apply");

// src/chains/chain.ts
var import_events = require("events");
var import_koishi3 = require("koishi");
var import_error4 = require("koishi-plugin-chatluna/utils/error");
var import_logger = require("koishi-plugin-chatluna/utils/logger");

// src/middlewares/system/lifecycle.ts
function apply12(ctx, config, chain) {
  chain.middleware("lifecycle-check", async (session, context) => 0).before("lifecycle-prepare");
  chain.middleware("lifecycle-prepare", async (session, context) => 0).after("lifecycle-check").before("lifecycle-handle_command");
  chain.middleware("lifecycle-handle_command", async (session, context) => 0).after("lifecycle-prepare").before("lifecycle-request_model");
  chain.middleware("lifecycle-request_model", async (session, context) => 0).after("lifecycle-handle_command").before("lifecycle-send");
  chain.middleware("lifecycle-send", async (session, context) => 0).after("lifecycle-request_model");
}
__name(apply12, "apply");

// src/chains/rooms.ts
var import_crypto = require("crypto");
var import_koishi4 = require("koishi");
var import_types = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_count_tokens2 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_error5 = require("koishi-plugin-chatluna/utils/error");
var import_chunk = require("koishi-plugin-chatluna/llm-core/utils/chunk");
async function queryJoinedConversationRoom(ctx, session, name2) {
  if (name2 != null) {
    const joinedRooms = await getAllJoinedConversationRoom(ctx, session);
    return joinedRooms.find(
      (it) => it.roomName === name2 || it.roomId === parseInt(name2)
    );
  }
  const userRoomInfoList = await ctx.database.get("chathub_user", {
    userId: session.userId,
    groupId: session.isDirect ? "0" : session.guildId
  });
  if (userRoomInfoList.length > 1) {
    throw new import_error5.ChatLunaError(
      import_error5.ChatLunaErrorCode.UNKNOWN_ERROR,
      new Error("User has multiple default rooms, this is impossible!")
    );
  } else if (userRoomInfoList.length === 0) {
    return void 0;
  }
  const userRoomInfo = userRoomInfoList[0];
  return await resolveConversationRoom(ctx, userRoomInfo.defaultRoomId);
}
__name(queryJoinedConversationRoom, "queryJoinedConversationRoom");
function queryPublicConversationRooms(ctx, session) {
  if (session.isDirect) {
    return Promise.resolve([]);
  }
  return ctx.database.get("chathub_room_group_member", {
    groupId: session.guildId,
    roomVisibility: {
      // TODO: better type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $in: ["template_clone", "public"]
      //    $in: ['template_clone', 'public']
    }
  });
}
__name(queryPublicConversationRooms, "queryPublicConversationRooms");
async function queryPublicConversationRoom(ctx, session) {
  const groupRoomInfoList = await queryPublicConversationRooms(ctx, session);
  const templateCloneRoom = groupRoomInfoList.find(
    (it) => it.roomVisibility === "template_clone"
  );
  let roomId;
  if (templateCloneRoom != null) {
    roomId = templateCloneRoom.roomId;
  } else if (groupRoomInfoList.length < 1) {
    return void 0;
  } else if (groupRoomInfoList.length === 1) {
    roomId = groupRoomInfoList[0].roomId;
  } else {
    const groupRoomInfo = groupRoomInfoList[(0, import_crypto.randomInt)(groupRoomInfoList.length)];
    roomId = groupRoomInfo.roomId;
  }
  const room = await resolveConversationRoom(ctx, roomId);
  if (room == null && roomId !== 0) {
    await deleteConversationRoomByRoomId(ctx, roomId);
    return void 0;
  }
  await joinConversationRoom(ctx, session, room);
  return room;
}
__name(queryPublicConversationRoom, "queryPublicConversationRoom");
async function checkConversationRoomAvailability(ctx, room) {
  const platformService = ctx.chatluna.platform;
  const presetService = ctx.chatluna.preset;
  if (room.model == null) {
    return false;
  }
  const [platformName, modelName] = (0, import_count_tokens2.parseRawModelName)(room.model);
  if (platformName == null || modelName == null) {
    return false;
  }
  const platformModels = platformService.listPlatformModels(
    platformName,
    import_types.ModelType.llm
  ).value;
  if (platformModels.length < 1) {
    return false;
  }
  if (!platformModels.some((it) => it.name === modelName)) {
    return false;
  }
  if (!presetService.getPreset(room.preset, false).value) {
    return false;
  }
  return true;
}
__name(checkConversationRoomAvailability, "checkConversationRoomAvailability");
async function fixConversationRoomAvailability(ctx, config, room) {
  const platformService = ctx.chatluna.platform;
  const presetService = ctx.chatluna.preset;
  const [platformName, modelName] = (0, import_count_tokens2.parseRawModelName)(room.model);
  const platformModels = platformService.listPlatformModels(
    platformName,
    import_types.ModelType.llm
  ).value;
  if (platformModels.length < 1) {
    room.model = (await getTemplateConversationRoom(ctx, config)).model;
  } else if (!platformModels.some((it) => it.name === modelName)) {
    room.model = platformName + "/" + platformModels[0].name;
  }
  if (!presetService.getPreset(room.preset, false).value) {
    room.preset = presetService.getDefaultPreset().value.triggerKeyword[0];
  }
  await ctx.database.upsert("chathub_room", [room]);
  return await checkConversationRoomAvailability(ctx, room);
}
__name(fixConversationRoomAvailability, "fixConversationRoomAvailability");
async function getTemplateConversationRoom(ctx, config) {
  const models = ctx.chatluna.platform.listAllModels(import_types.ModelType.llm);
  config = ctx.scope.parent.config;
  const selectModelAndPreset = /* @__PURE__ */ __name(async () => {
    if (config.defaultModel === "无" || config.defaultModel == null || config.defaultModel === "") {
      const model = models.value.find(
        (model2) => model2.name.includes("nano") || model2.name.includes("flash") || model2.name.includes("mini")
      ) ?? models.value[0];
      config.defaultModel = model?.toModelName();
    } else {
      const [platformName, modelName] = (0, import_count_tokens2.parseRawModelName)(
        config.defaultModel
      );
      const platformModels = ctx.chatluna.platform.listPlatformModels(
        platformName,
        import_types.ModelType.llm
      ).value;
      if (platformModels.length < 1) {
        const model = models.value.find(
          (model2) => model2.name.includes("nano") || model2.name.includes("flash") || model2.name.includes("mini")
        ) ?? models.value[0];
        config.defaultModel = model?.toModelName();
      } else if (!platformModels.some((model) => model.name === modelName)) {
        const modelInfo = platformModels.find(
          (model) => model.name === modelName
        );
        if (modelInfo == null) {
          config.defaultModel = null;
        } else {
          const model = platformName + "/" + modelInfo.name;
          config.defaultModel = model;
        }
      }
    }
    if (config.defaultPreset == null) {
      const preset = ctx.chatluna.preset.getDefaultPreset().value;
      config.defaultPreset = preset.triggerKeyword[0];
    }
    ctx.scope.parent.scope.update(config, true);
  }, "selectModelAndPreset");
  if (config.defaultChatMode == null || config.defaultModel === "无" || config.defaultModel == null || config.defaultPreset == null) {
    if (config.defaultChatMode == null) {
      throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_TEMPLATE_INVALID);
    }
    await selectModelAndPreset();
  }
  let room = {
    roomId: 0,
    roomName: "模板房间",
    roomMasterId: "0",
    preset: config.defaultPreset,
    conversationId: "0",
    chatMode: config.defaultChatMode,
    password: "",
    model: config.defaultModel,
    visibility: "public",
    autoUpdate: true,
    updatedTime: /* @__PURE__ */ new Date()
  };
  if (!await checkConversationRoomAvailability(ctx, room)) {
    await selectModelAndPreset();
    room = {
      roomId: 0,
      roomName: "模板房间",
      roomMasterId: "0",
      preset: config.defaultPreset,
      conversationId: "0",
      chatMode: config.defaultChatMode,
      password: "",
      model: config.defaultModel,
      visibility: "public",
      autoUpdate: true,
      updatedTime: /* @__PURE__ */ new Date()
    };
  }
  return room;
}
__name(getTemplateConversationRoom, "getTemplateConversationRoom");
async function getConversationRoomCount(ctx) {
  const count = await ctx.database.select("chathub_room").execute((row) => import_koishi4.$.max(row.roomId));
  return count;
}
__name(getConversationRoomCount, "getConversationRoomCount");
async function transferConversationRoom(ctx, session, room, userId) {
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_NOT_FOUND);
  }
  await ctx.database.upsert("chathub_room", [
    { roomId: room.roomId, roomMasterId: userId }
  ]);
  const oldMaster = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    roomPermission: "owner"
  });
  if (oldMaster.length === 1) {
    await ctx.database.upsert("chathub_room_member", [
      {
        userId: oldMaster[0].userId,
        roomId: room.roomId,
        roomPermission: "member"
      }
    ]);
  } else {
    throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_NOT_FOUND_MASTER);
  }
  await ctx.database.upsert("chathub_room_member", [
    { userId, roomId: room.roomId, roomPermission: "owner" }
  ]);
  await ctx.database.upsert("chathub_user", [
    {
      userId,
      defaultRoomId: room.roomId,
      groupId: session.isDirect ? "0" : session.guildId
    }
  ]);
}
__name(transferConversationRoom, "transferConversationRoom");
async function switchConversationRoom(ctx, session, id) {
  let joinedRoom = await getAllJoinedConversationRoom(ctx, session);
  const parsedId = typeof id === "number" ? id : parseInt(id);
  let room = joinedRoom.find((it) => it.roomId === parsedId);
  if (room != null) {
    await ctx.database.upsert("chathub_user", [
      {
        userId: session.userId,
        defaultRoomId: room.roomId,
        groupId: session.isDirect ? "0" : session.guildId
      }
    ]);
    return room;
  }
  joinedRoom = joinedRoom.filter((it) => it.roomName === id);
  if (joinedRoom.length > 1) {
    throw new import_error5.ChatLunaError(
      import_error5.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
    );
  } else if (joinedRoom.length === 0) {
    throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_NOT_FOUND);
  } else {
    room = joinedRoom[0];
  }
  await ctx.database.upsert("chathub_user", [
    {
      userId: session.userId,
      defaultRoomId: room.roomId,
      groupId: session.isDirect ? "0" : session.guildId
    }
  ]);
  return room;
}
__name(switchConversationRoom, "switchConversationRoom");
async function getAllJoinedConversationRoom(ctx, session, queryAll = false) {
  const conversationRoomList = (0, import_chunk.chunkArray)(
    await ctx.database.get("chathub_room_member", {
      userId: session.userId
    }),
    35
  );
  const rooms = [];
  for (const conversationRoomChunk of conversationRoomList) {
    const roomIds = conversationRoomChunk.map((it) => it.roomId);
    const roomList = await ctx.database.get("chathub_room", {
      roomId: { $in: roomIds }
    });
    let memberList = [];
    if (queryAll === false) {
      memberList = await ctx.database.get("chathub_room_group_member", {
        roomId: { $in: roomIds },
        // 设置 undefined 来全量搜索
        groupId: session.guildId ?? void 0
      });
    }
    for (const room of roomList) {
      const memberOfTheRoom = memberList.some(
        (it) => it.roomId === room.roomId
      );
      if (
        // 模版克隆房间或者公共房间需要指定房间的范围不能干预到私聊的
        !session.isDirect && memberOfTheRoom || // 同上
        session.isDirect && room.visibility !== "template_clone" || // 私有房间跨群
        room.visibility === "private" || // 模版克隆房间需要指定非群聊
        room.visibility === "template_clone" && !session.isDirect && !memberOfTheRoom || queryAll === true
      ) {
        rooms.push(room);
      }
    }
  }
  return rooms;
}
__name(getAllJoinedConversationRoom, "getAllJoinedConversationRoom");
async function leaveConversationRoom(ctx, session, room) {
  await ctx.database.remove("chathub_room_member", {
    userId: session.userId,
    roomId: room.roomId
  });
  await ctx.database.remove("chathub_user", {
    userId: session.userId,
    defaultRoomId: room.roomId,
    groupId: session.isDirect ? "0" : session.guildId
  });
}
__name(leaveConversationRoom, "leaveConversationRoom");
async function queryConversationRoom(ctx, session, name2) {
  const roomId = typeof name2 === "number" ? name2 : parseInt(name2);
  const roomName = typeof name2 === "string" ? name2 : void 0;
  const roomList = Number.isNaN(roomId) ? await ctx.database.get("chathub_room", { roomName }) : await ctx.database.get("chathub_room", { roomId });
  if (roomList.length === 1) {
    return roomList[0];
  } else if (roomList.length > 1) {
    if (session.isDirect || Number.isNaN(roomId)) {
      throw new import_error5.ChatLunaError(
        import_error5.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
      );
    }
    const groupRoomList = await ctx.database.get(
      "chathub_room_group_member",
      {
        groupId: session.guildId,
        roomId: { $in: roomList.map((it) => it.roomId) }
      }
    );
    if (groupRoomList.length === 1) {
      return roomList.find((it) => it.roomId === groupRoomList[0].roomId);
    } else if (groupRoomList.length > 1) {
      throw new import_error5.ChatLunaError(
        import_error5.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
      );
    }
  } else if (roomList.length === 0) {
    return void 0;
  }
}
__name(queryConversationRoom, "queryConversationRoom");
async function resolveConversationRoom(ctx, roomId) {
  const roomList = await ctx.database.get("chathub_room", { roomId });
  if (roomList.length > 1) {
    throw new import_error5.ChatLunaError(
      import_error5.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
    );
  } else if (roomList.length === 0) {
    return void 0;
  }
  return roomList[0];
}
__name(resolveConversationRoom, "resolveConversationRoom");
async function deleteConversationRoom(ctx, room) {
  const chatBridger = ctx.chatluna.queryInterfaceWrapper(room, false);
  await chatBridger?.clearChatHistory(room);
  await deleteConversationRoomByRoomId(ctx, room.roomId);
  await ctx.database.remove("chathub_message", {
    conversation: room.conversationId
  });
  await ctx.database.remove("chathub_conversation", {
    id: room.conversationId
  });
}
__name(deleteConversationRoom, "deleteConversationRoom");
async function deleteConversationRoomByRoomId(ctx, roomId) {
  await ctx.database.remove("chathub_room", { roomId });
  await ctx.database.remove("chathub_room_member", { roomId });
  await ctx.database.remove("chathub_room_group_member", { roomId });
  await ctx.database.remove("chathub_user", { defaultRoomId: roomId });
}
__name(deleteConversationRoomByRoomId, "deleteConversationRoomByRoomId");
async function joinConversationRoom(ctx, session, roomId, isDirect = session.isDirect, userId = session.userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  if (isDirect === false) {
    const groupMemberList = await ctx.database.get(
      "chathub_room_group_member",
      { groupId: session.guildId, roomId: room.roomId }
    );
    if (groupMemberList.length === 0) {
      await ctx.database.create("chathub_room_group_member", {
        groupId: session.guildId,
        roomId: room.roomId,
        roomVisibility: room.visibility
      });
    }
  }
  const memberList = await ctx.database.get("chathub_room_member", {
    userId,
    roomId: room.roomId
  });
  if (memberList.length === 0) {
    await ctx.database.create("chathub_room_member", {
      userId,
      roomId: room.roomId,
      roomPermission: userId === room.roomMasterId ? "owner" : "member"
    });
  }
  await ctx.database.upsert("chathub_user", [
    {
      userId,
      defaultRoomId: room.roomId,
      groupId: session.isDirect ? "0" : session.guildId
    }
  ]);
}
__name(joinConversationRoom, "joinConversationRoom");
async function getConversationRoomUser(ctx, session, roomId, userId = session.userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  return memberList?.[0];
}
__name(getConversationRoomUser, "getConversationRoomUser");
async function setUserPermission(ctx, session, roomId, permission, userId = session.userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_NOT_FOUND);
  }
  await ctx.database.upsert("chathub_room_member", [
    { userId, roomId: room.roomId, roomPermission: permission }
  ]);
}
__name(setUserPermission, "setUserPermission");
async function muteUserFromConversationRoom(ctx, session, roomId, userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_NOT_JOINED);
  }
  await ctx.database.upsert("chathub_room_member", [
    { userId, roomId: room.roomId, mute: memberList[0].mute !== true }
  ]);
}
__name(muteUserFromConversationRoom, "muteUserFromConversationRoom");
async function kickUserFromConversationRoom(ctx, session, roomId, userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error5.ChatLunaError(import_error5.ChatLunaErrorCode.ROOM_NOT_JOINED);
  }
  await ctx.database.remove("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  await ctx.database.remove("chathub_user", {
    userId,
    defaultRoomId: room.roomId
  });
}
__name(kickUserFromConversationRoom, "kickUserFromConversationRoom");
async function checkAdmin(session) {
  const tested = await session.app.permissions.test("chatluna:admin", session);
  if (tested) {
    return true;
  }
  const user = await session.getUser(session.userId, [
    "authority"
  ]);
  return user?.authority >= 3;
}
__name(checkAdmin, "checkAdmin");
async function updateChatTime(ctx, room) {
  await ctx.database.upsert("chathub_room", [
    { roomId: room.roomId, updatedTime: /* @__PURE__ */ new Date() }
  ]);
}
__name(updateChatTime, "updateChatTime");
async function createConversationRoom(ctx, session, room) {
  await ctx.database.create("chathub_room", room);
  await ctx.database.create("chathub_room_member", {
    userId: session.userId,
    roomId: room.roomId,
    roomPermission: session.userId === room.roomMasterId ? "owner" : "member"
  });
  await joinConversationRoom(ctx, session, room);
}
__name(createConversationRoom, "createConversationRoom");

// src/middlewares/auth/add_user_to_auth_group.ts
function apply13(ctx, config, chain) {
  chain.middleware("add_user_to_auth_group", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "add_user_to_auth_group")
      return 0 /* SKIPPED */;
    const {
      authUser: userId,
      auth_group_resolve: { name: name2 }
    } = context.options;
    if (!await checkAdmin(session)) {
      context.message = session.text(".permission_denied");
      return 1 /* STOP */;
    }
    const service = ctx.chatluna_auth;
    const user = await service.getUser(session, userId);
    await service.addUserToGroup(user, name2);
    context.message = session.text(".success", [userId, name2]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply13, "apply");

// src/middlewares/auth/black_list.ts
var import_logger2 = require("koishi-plugin-chatluna/utils/logger");
var logger5;
function apply14(ctx, config, chain) {
  logger5 = (0, import_logger2.createLogger)(ctx);
  chain.middleware("black_list", async (session, context) => {
    const resolved = await session.resolve(config.blackList);
    if (resolved === 1) {
      logger5.debug(
        `[黑名单] ${session.username}(${session.userId}): ${session.content}`
      );
      context.message = session.text("chatluna.block_message");
      return 1 /* STOP */;
    }
    return 2 /* CONTINUE */;
  }).after("allow_reply");
}
__name(apply14, "apply");

// src/middlewares/auth/create_auth_group.ts
var import_types2 = require("koishi-plugin-chatluna/llm-core/platform/types");
function apply15(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  const authService = ctx.chatluna_auth;
  chain.middleware("create_auth_group", async (session, context) => {
    const {
      command: command2,
      options: { auth_group_resolve: authGroupResolve }
    } = context;
    if (command2 !== "create_auth_group")
      return 0 /* SKIPPED */;
    if (!authGroupResolve) return 0 /* SKIPPED */;
    let {
      name: name2,
      supportModels,
      requestPreDay,
      requestPreMin,
      platform,
      priority,
      costPerToken: constPerToken
    } = authGroupResolve;
    if (Object.values(authGroupResolve).filter((value) => value != null).length > 0 && name2 != null && requestPreDay != null && requestPreMin != null) {
      await context.send(session.text(".confirm_create"));
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      }
      if (result2 === "Y") {
        authGroupResolve.priority = priority == null ? 0 : priority;
        if (await checkAuthGroupName(authService, name2) === false) {
          context.message = session.text(".name_exists");
          return 1 /* STOP */;
        }
        if (supportModels != null && !checkModelList(service, supportModels)) {
          context.message = session.text(".invalid_models");
          return 1 /* STOP */;
        }
        await createAuthGroup(
          ctx,
          context,
          session,
          context.options
        );
        return 1 /* STOP */;
      } else if (result2 !== "N") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      }
    }
    while (true) {
      if (name2 == null) {
        await context.send(session.text(".enter_name"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.name"),
            name2
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (await checkAuthGroupName(authService, result2) === false) {
        context.message = session.text(".name_exists");
        continue;
      } else if (result2 === "N" && name2 != null) {
        break;
      } else if (result2 !== "N") {
        name2 = result2.trim();
        authGroupResolve.name = name2;
        break;
      }
    }
    while (true) {
      if (requestPreMin == null) {
        await context.send(session.text(".enter_limit_per_min"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.set"),
            session.text(".field.limit_per_min"),
            requestPreMin.toString()
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "N" && requestPreMin != null) {
        break;
      } else if (isNaN(Number(result2)) || Number(result2) <= 0) {
        await context.send(
          session.text(".invalid_input", [
            session.text(".field.limit_per_min")
          ])
        );
        continue;
      }
      requestPreMin = Number(result2);
      authGroupResolve.requestPreMin = requestPreMin;
      break;
    }
    while (true) {
      if (requestPreDay == null) {
        await context.send(session.text(".enter_limit_per_day"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.set"),
            session.text(".field.limit_per_day"),
            requestPreDay.toString()
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "N" && requestPreDay != null) {
        break;
      } else if (isNaN(Number(result2)) || Number(result2) < requestPreMin) {
        await context.send(
          session.text(".invalid_input", [
            session.text(".field.limit_per_day")
          ])
        );
        continue;
      }
      requestPreDay = Number(result2);
      authGroupResolve.requestPreDay = requestPreDay;
      break;
    }
    if (platform == null) {
      await context.send(session.text(".enter_platform"));
    } else {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".action.select"),
          session.text(".field.platform"),
          platform
        ])
      );
    }
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    } else if (result !== "N") {
      platform = result;
      authGroupResolve.platform = platform;
    }
    while (true) {
      if (priority == null) {
        await context.send(session.text(".enter_priority"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.priority"),
            priority.toString()
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "N" && priority != null) {
        break;
      } else if (isNaN(Number(result2))) {
        await context.send(
          session.text(".invalid_input", [
            session.text(".field.priority")
          ])
        );
        continue;
      }
      priority = Number(result2);
      authGroupResolve.priority = priority;
      break;
    }
    while (true) {
      if (constPerToken == null) {
        await context.send(session.text(".enter_cost"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.cost"),
            constPerToken.toString()
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "N" && constPerToken != null) {
        break;
      } else if (isNaN(Number(result2))) {
        await context.send(
          session.text(".invalid_input", [
            session.text(".field.cost")
          ])
        );
        continue;
      }
      constPerToken = Number(result2);
      authGroupResolve.costPerToken = constPerToken;
      break;
    }
    while (true) {
      if (supportModels == null) {
        await context.send(session.text(".enter_models"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.models"),
            supportModels.join(",")
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      const parsedResult = result2?.split(",")?.map((item) => item.trim());
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        break;
      } else if (checkModelList(service, parsedResult)) {
        await context.send(session.text(".invalid_models"));
        continue;
      } else {
        supportModels = parsedResult;
        authGroupResolve.supportModels = parsedResult;
        break;
      }
    }
    await createAuthGroup(ctx, context, session, context.options);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply15, "apply");
async function checkAuthGroupName(service, name2) {
  const authGroup = await service.getAuthGroup(name2, false);
  return authGroup == null;
}
__name(checkAuthGroupName, "checkAuthGroupName");
function checkModelList(service, models) {
  const availableModels = service.listAllModels(import_types2.ModelType.llm).value.map((model) => model.toModelName());
  return models.some((model) => !availableModels.includes(model));
}
__name(checkModelList, "checkModelList");
async function createAuthGroup(ctx, context, session, options) {
  const resolve = options.auth_group_resolve;
  const group = {
    name: resolve.name,
    priority: resolve.priority ?? 0,
    limitPerMin: resolve.requestPreMin,
    limitPerDay: resolve.requestPreDay,
    costPerToken: resolve.costPerToken,
    id: null,
    supportModels: resolve.supportModels ?? null
  };
  delete group.id;
  if (resolve.supportModels == null) {
    delete resolve.supportModels;
  }
  await ctx.chatluna_auth.createAuthGroup(session, group);
  context.message = session.text(".success", [group.name]);
}
__name(createAuthGroup, "createAuthGroup");

// src/middlewares/auth/kick_user_form_auth_group.ts
function apply16(ctx, config, chain) {
  chain.middleware("kick_user_form_auth_group", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "kick_user_form_auth_group")
      return 0 /* SKIPPED */;
    const {
      authUser: userId,
      auth_group_resolve: { name: name2 }
    } = context.options;
    if (!await checkAdmin(session)) {
      context.message = session.text(".permission_denied");
      return 1 /* STOP */;
    }
    const service = ctx.chatluna_auth;
    const user = await service.getUser(session, userId);
    await service.removeUserFormGroup(user, name2);
    context.message = session.text(".success", [userId, name2]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply16, "apply");

// src/middlewares/auth/list_auth_group.ts
var import_pagination = require("koishi-plugin-chatluna/utils/pagination");
function apply17(ctx, config, chain) {
  const pagination = new import_pagination.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => "", "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_auth_group", async (session, context) => {
    const {
      command: command2,
      options: { page, limit, authPlatform }
    } = context;
    if (command2 !== "list_auth_group")
      return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    pagination.updateFormatItem(
      (value) => formatAuthGroup(session, value)
    );
    const authGroups = await ctx.chatluna_auth.getAuthGroups(authPlatform);
    await pagination.push(authGroups);
    context.message = await pagination.getFormattedPage(page, limit);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply17, "apply");
function formatAuthGroup(session, group) {
  const buffer = [];
  buffer.push(session.text(".name", [group.name]));
  buffer.push(
    session.text(".platform", [group.platform ?? session.text(".general")])
  );
  buffer.push(session.text(".cost", [group.costPerToken]));
  buffer.push(session.text(".priority", [group.priority]));
  buffer.push(
    session.text(".support_models", [
      group.supportModels?.join(", ") ?? session.text(".general")
    ])
  );
  buffer.push(session.text(".limit_per_min", [group.limitPerMin]));
  buffer.push(session.text(".limit_per_day", [group.limitPerDay]));
  buffer.push("\n");
  return buffer.join("\n");
}
__name(formatAuthGroup, "formatAuthGroup");

// src/middlewares/auth/mute_user.ts
function apply18(ctx, config, chain) {
  chain.middleware("mute_user", async (session, context) => {
    let {
      command: command2,
      options: { room }
    } = context;
    if (command2 !== "mute_user") return 0 /* SKIPPED */;
    if (room == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      room = rooms.find(
        (room2) => room2.roomName === context.options.room_resolve?.name || room2.roomId === roomId
      );
    }
    if (room == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    const userInfo = await getConversationRoomUser(
      ctx,
      session,
      room,
      session.userId
    );
    if (userInfo.roomPermission === "member" && !await checkAdmin(session)) {
      context.message = session.text(".not_admin", [room.roomName]);
      return 1 /* STOP */;
    }
    const targetUser = context.options.resolve_user.id;
    for (const user of targetUser) {
      await muteUserFromConversationRoom(ctx, session, room, user);
    }
    context.message = session.text(".success", [
      targetUser.join(","),
      room.roomName
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply18, "apply");

// src/middlewares/auth/set_auth_group.ts
var import_types3 = require("koishi-plugin-chatluna/llm-core/platform/types");
function apply19(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  const authService = ctx.chatluna_auth;
  chain.middleware("set_auth_group", async (session, context) => {
    const {
      command: command2,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      options: { auth_group_resolve }
    } = context;
    if (command2 !== "set_auth_group")
      return 0 /* SKIPPED */;
    if (!auth_group_resolve) return 0 /* SKIPPED */;
    let {
      name: name2,
      supportModels,
      requestPreDay,
      requestPreMin,
      platform,
      priority,
      costPerToken: constPerToken
    } = auth_group_resolve;
    let currentAuthGroupName = "guest";
    while (true) {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".action.select"),
          session.text(".field.name"),
          currentAuthGroupName
        ])
      );
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        break;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (await ctx.chatluna_auth.getAuthGroup(
        currentAuthGroupName,
        false
      ) == null) {
        await context.send(session.text(".invalid_name"));
        continue;
      } else {
        currentAuthGroupName = result2.trim();
        break;
      }
    }
    if (Object.values(auth_group_resolve).filter(
      (value) => value != null
    ).length > 0 && name2 != null && requestPreDay != null && requestPreMin != null) {
      await context.send(session.text(".confirm_set"));
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      }
      if (result2 === "Y") {
        auth_group_resolve.priority = priority == null ? 0 : priority;
        if (await checkAuthGroupName2(authService, name2) === false) {
          context.message = session.text(".name_exists");
          return 1 /* STOP */;
        }
        if (supportModels != null && !checkModelList2(service, supportModels)) {
          context.message = session.text(".invalid_models");
          return 1 /* STOP */;
        }
        await setAuthGroup(
          ctx,
          session,
          context,
          currentAuthGroupName,
          context.options
        );
        return 1 /* STOP */;
      } else if (result2 !== "N") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      }
    }
    while (true) {
      if (name2 == null) {
        await context.send(session.text(".enter_name"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.name"),
            name2
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (await checkAuthGroupName2(authService, result2) === false) {
        await context.send(session.text(".name_exists"));
        continue;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (result2 === "N" && name2 != null) {
        break;
      } else if (result2 !== "N") {
        name2 = result2.trim();
        auth_group_resolve.name = name2;
        break;
      }
    }
    while (true) {
      if (requestPreMin == null) {
        await context.send(session.text(".enter_requestPreMin"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.requestPreMin"),
            requestPreMin
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (result2 === "N" && requestPreMin != null) {
        break;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (isNaN(Number(result2)) && Number(result2) !== 0) {
        await context.send(session.text(".invalid_requestPreMin"));
        continue;
      }
      requestPreMin = Number(result2);
      auth_group_resolve.requestPreMin = requestPreMin;
      break;
    }
    while (true) {
      if (requestPreDay == null) {
        await context.send(session.text(".enter_requestPreDay"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.requestPreDay"),
            requestPreDay
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (result2 === "N" && requestPreDay != null) {
        break;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (isNaN(Number(result2)) || Number(result2) < requestPreMin) {
        await context.send(session.text(".invalid_requestPreDay"));
        continue;
      }
      requestPreDay = Number(result2);
      auth_group_resolve.requestPreDay = requestPreDay;
      break;
    }
    if (platform == null) {
      await context.send(session.text(".enter_platform"));
    } else {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".action.input"),
          session.text(".field.platform"),
          platform
        ])
      );
    }
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout_cancel");
      return 1 /* STOP */;
    } else if (result !== "N") {
      platform = result;
      auth_group_resolve.platform = platform;
    }
    while (true) {
      if (priority == null) {
        await context.send(session.text(".enter_priority"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.priority"),
            priority
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (result2 === "N" && priority != null) {
        break;
      } else if (isNaN(Number(result2))) {
        await context.send(session.text(".invalid_priority"));
        continue;
      }
      priority = Number(result2);
      auth_group_resolve.priority = priority;
      break;
    }
    while (true) {
      if (constPerToken == null) {
        await context.send(session.text(".enter_costPerToken"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.costPerToken"),
            constPerToken
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (result2 === "N" && constPerToken != null) {
        break;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (isNaN(Number(result2))) {
        await context.send(session.text(".invalid_costPerToken"));
        continue;
      }
      constPerToken = Number(result2);
      auth_group_resolve.costPerToken = constPerToken;
      break;
    }
    while (true) {
      if (supportModels == null) {
        await context.send(session.text(".enter_models"));
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.input"),
            session.text(".field.models"),
            supportModels.join(", ")
          ])
        );
      }
      const result2 = await session.prompt(1e3 * 30);
      const parsedResult = result2?.split(",")?.map((item) => item.trim());
      if (result2 == null) {
        context.message = session.text(".timeout_cancel");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        break;
      } else if (result2 === "Q") {
        context.message = session.text(".cancel_set");
        return 1 /* STOP */;
      } else if (checkModelList2(service, parsedResult)) {
        await context.send(session.text(".invalid_models"));
        continue;
      } else {
        supportModels = parsedResult;
        auth_group_resolve.supportModels = parsedResult;
        break;
      }
    }
    await setAuthGroup(
      ctx,
      session,
      context,
      currentAuthGroupName,
      context.options
    );
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply19, "apply");
async function checkAuthGroupName2(service, name2) {
  const authGroup = await service.getAuthGroup(name2);
  return authGroup == null;
}
__name(checkAuthGroupName2, "checkAuthGroupName");
function checkModelList2(service, models) {
  const availableModels = service.listAllModels(import_types3.ModelType.llm).value.map((model) => model.toModelName());
  return models.some((model) => !availableModels.includes(model));
}
__name(checkModelList2, "checkModelList");
async function setAuthGroup(ctx, session, context, oldAuthGroupName, options) {
  const resolve = options.auth_group_resolve;
  const group = {
    name: resolve.name,
    priority: resolve.priority ?? 0,
    limitPerMin: resolve.requestPreMin,
    limitPerDay: resolve.requestPreDay,
    // 1000 token / 0.3
    costPerToken: resolve.costPerToken,
    id: null,
    supportModels: resolve.supportModels ?? null
  };
  delete group.id;
  if (resolve.supportModels == null) {
    delete resolve.supportModels;
  }
  for (const key in group) {
    if (group[key] == null) {
      delete group[key];
    }
  }
  await ctx.chatluna_auth.setAuthGroup(oldAuthGroupName, group);
  context.message = session.text(".success", [group.name]);
}
__name(setAuthGroup, "setAuthGroup");

// src/middlewares/chat/allow_reply.ts
var import_koishi5 = require("koishi");
function apply20(ctx, config, chain) {
  chain.middleware("allow_reply", async (session, context) => {
    if (ctx.bots[session.uid]) return 1 /* STOP */;
    context.options.reply_status = false;
    if (await isAllowedByExternalTrigger()) {
      return await checkReplyPermission();
    }
    const content = import_koishi5.h.select(session.elements, "text").join("").trimStart();
    if (session.isDirect && config.allowPrivate && (context.command != null || config.privateChatWithoutCommand)) {
      return await checkReplyPermission();
    }
    const botId = session.bot.userId;
    if (config.allowAtReply) {
      let appel = session.stripped.atSelf;
      if (appel) {
        return await checkReplyPermission();
      }
      appel = session.elements?.some(
        (element) => element.type === "at" && element.attrs?.["id"] === botId
      ) ?? false;
      if (appel) {
        return await checkReplyPermission();
      }
    }
    if (config.allowQuoteReply && session.quote?.user?.id === botId) {
      return await checkReplyPermission();
    }
    if (config.isNickname && config.botNames.some((name2) => content.startsWith(name2)) || config.isNickNameWithContent && config.botNames.some((name2) => content.includes(name2))) {
      return await checkReplyPermission();
    }
    if (Math.random() < await session.resolve(config.randomReplyFrequency)) {
      return await checkReplyPermission();
    }
    if (context.command != null) {
      return 2 /* CONTINUE */;
    }
    if (config.allowChatWithRoomName) {
      return 2 /* CONTINUE */;
    }
    return 1 /* STOP */;
    async function isAllowedByExternalTrigger() {
      return Boolean(
        await ctx.chatluna.resolveAllowReply({
          session,
          context
        })
      );
    }
    __name(isAllowedByExternalTrigger, "isAllowedByExternalTrigger");
    async function checkReplyPermission() {
      const notReply = await ctx.serial(
        "chatluna/before-check-sender",
        session
      );
      const status = notReply ? 1 /* STOP */ : 2 /* CONTINUE */;
      context.options.reply_status = status === 2 /* CONTINUE */;
      return status;
    }
    __name(checkReplyPermission, "checkReplyPermission");
  }).before("lifecycle-check");
}
__name(apply20, "apply");

// src/middlewares/chat/censor.ts
var import_string4 = require("koishi-plugin-chatluna/utils/string");
function apply21(ctx, config, chain) {
  chain.middleware("censor", async (session, context) => {
    const message = context.options.responseMessage;
    if (!config.censor || message == null) {
      return 0 /* SKIPPED */;
    }
    const baseContent = message.content;
    if (typeof baseContent === "string") {
      message.content = await ctx.censor.transform(
        baseContent,
        session
      );
      return 2 /* CONTINUE */;
    }
    message.content = await Promise.all(
      baseContent.map((content) => {
        if (!(0, import_string4.isMessageContentText)(content)) {
          return content;
        }
        return {
          type: "text",
          text: ctx.censor.transform(content.text, session)
        };
      })
    );
  }).before("lifecycle-send").after("request_model");
}
__name(apply21, "apply");

// src/middlewares/chat/chat_time_limit_check.ts
var import_count_tokens3 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");

// src/cache.ts
var import_koishi6 = require("koishi");
var Cache = class {
  constructor(ctx, config, tableName) {
    this.config = config;
    this.tableName = tableName;
    this._cache = new DatabaseCache(ctx);
    ctx.on("ready", async () => {
      await this._cache.clear("chathub/keys");
      await this._cache.clear("chathub/chat_limit");
    });
  }
  static {
    __name(this, "Cache");
  }
  _cache;
  get(tableNameOrId, id) {
    if (typeof id === "string") {
      return this._cache.get(tableNameOrId, id);
    }
    return this._cache.get(this.tableName, tableNameOrId);
  }
  set(tableNameOrId, idOrValue, value) {
    if (value != null) {
      return this._cache.set(tableNameOrId, idOrValue, value);
    }
    return this._cache.set(this.tableName, tableNameOrId, idOrValue);
  }
  delete(tableNameOrId, id) {
    if (typeof id === "string") {
      return this._cache.delete(tableNameOrId, id);
    }
    return this._cache.delete(this.tableName, tableNameOrId);
  }
  async clear(tableName) {
    if (tableName) {
      await this._cache.clear(tableName);
    } else {
      await this._cache.clear(this.tableName);
    }
  }
};
var DatabaseCache = class {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.model.extend(
      "cache",
      {
        table: "string(63)",
        key: "string(63)",
        value: "text",
        expire: "timestamp"
      },
      {
        primary: ["table", "key"]
      }
    );
    ctx.setInterval(async () => {
      await ctx.database.remove("cache", { expire: { $lt: /* @__PURE__ */ new Date() } });
    }, 10 * import_koishi6.Time.minute);
  }
  static {
    __name(this, "DatabaseCache");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encode(data) {
    return JSON.stringify(data);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decode(record) {
    return JSON.parse(record);
  }
  async clear(table) {
    await this.ctx.database.remove("cache", { table });
  }
  async get(table, key) {
    const [entry] = await this.ctx.database.get("cache", { table, key }, [
      "expire",
      "value"
    ]);
    if (!entry) return;
    if (entry.expire && +entry.expire < Date.now()) return;
    return this.decode(entry.value);
  }
  async set(table, key, value, maxAge = 1e3 * 60 * 60 * 24) {
    const expire = maxAge ? new Date(Date.now() + maxAge) : null;
    await this.ctx.database.upsert("cache", [
      {
        table,
        key,
        value: this.encode(value),
        expire
      }
    ]);
  }
  async delete(table, key) {
    await this.ctx.database.remove("cache", { table, key });
  }
  async *keys(table) {
    const entries = await this.ctx.database.get("cache", { table }, [
      "expire",
      "key"
    ]);
    yield* entries.filter((entry) => !entry.expire || +entry.expire > Date.now()).map((entry) => entry.key);
  }
  async *values(table) {
    const entries = await this.ctx.database.get("cache", { table }, [
      "expire",
      "value"
    ]);
    yield* entries.filter((entry) => !entry.expire || +entry.expire > Date.now()).map((entry) => this.decode(entry.value));
  }
  async *entries(table) {
    const entries = await this.ctx.database.get("cache", { table }, [
      "expire",
      "key",
      "value"
    ]);
    yield* entries.filter((entry) => !entry.expire || +entry.expire > Date.now()).map((entry) => [entry.key, this.decode(entry.value)]);
  }
};

// src/middlewares/chat/chat_time_limit_check.ts
var import_crypto2 = require("crypto");
var import_types4 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_koishi_plugin_chatluna5 = require("koishi-plugin-chatluna");
function apply22(ctx, config, chain) {
  const chatLimitCache = new Cache(ctx, config, "chatluna/chat_limit");
  const authService = ctx.chatluna_auth;
  chain.middleware("chat_time_limit_check", async (session, context) => {
    if (config.authSystem !== true) {
      return await oldChatLimitCheck(session, context);
    }
    const {
      room: { model }
    } = context.options;
    const authUser = await authService.getUser(session);
    if (authUser && authUser.balance <= 0) {
      context.message = session.text(
        "chatluna.insufficient_balance",
        [authUser.balance]
      );
      return 1 /* STOP */;
    }
    let authGroup = await authService.resolveAuthGroup(
      session,
      (0, import_count_tokens3.parseRawModelName)(model)[0]
    );
    if (authGroup.supportModels != null && authGroup.supportModels.find((m) => m === model) == null) {
      context.message = session.text("chatluna.unsupported_model", [
        authGroup.name,
        model
      ]);
      return 1 /* STOP */;
    }
    authGroup = await authService.resetAuthGroup(authGroup.id);
    context.options.authGroup = authGroup;
    if ((authGroup.currentLimitPerMin ?? 0) + 1 > authGroup.limitPerMin) {
      context.message = session.text(
        "chatluna.limit_per_minute_exceeded",
        [
          authGroup.name,
          authGroup.limitPerMin,
          authGroup.currentLimitPerMin
        ]
      );
      return 1 /* STOP */;
    }
    if ((authGroup.currentLimitPerDay ?? 0) + 1 > authGroup.limitPerDay) {
      context.message = session.text(
        "chatluna.limit_per_day_exceeded",
        [
          authGroup.name,
          authGroup.limitPerDay,
          authGroup.currentLimitPerDay
        ]
      );
      return 1 /* STOP */;
    }
    return 2 /* CONTINUE */;
  }).after("resolve_model").before("request_model");
  async function oldChatLimitCheck(session, context) {
    if (context.options.room == null) {
      return;
    }
    const {
      room: { model, conversationId }
    } = context.options;
    if ((config.defaultModel === "无" || config.defaultModel.trim().length < 1) && ctx.chatluna.platform.listAllModels(import_types4.ModelType.all).value.length < 1) {
      return session.text("chatluna.not_available_model");
    }
    let platformClient;
    try {
      ;
      [platformClient] = (0, import_count_tokens3.parseRawModelName)(model);
    } catch (e) {
      import_koishi_plugin_chatluna5.logger.error(e);
      return session.text("chatluna.not_available_model");
    }
    const client = await ctx.chatluna.platform.getClient(platformClient);
    if (!client.value) {
      import_koishi_plugin_chatluna5.logger.error(`Can't find model adapter for ${model}`);
      return session.text("chatluna.not_available_model");
    }
    const clientConfig = client.value.configPool.getConfig(true);
    if (!clientConfig) {
      import_koishi_plugin_chatluna5.logger.error(`Can't find model adapter for ${model}`);
      return session.text("chatluna.not_available_model");
    }
    const chatLimitRaw = clientConfig.value.chatLimit;
    const chatLimitComputed = await session.resolve(chatLimitRaw);
    let key = conversationId + "-" + session.userId;
    key = (0, import_crypto2.createHash)("md5").update(key).digest("hex");
    let chatLimitOnDataBase = await chatLimitCache.get(key);
    if (chatLimitOnDataBase) {
      if (Date.now() - chatLimitOnDataBase.time > 1e3 * 60 * 60) {
        chatLimitOnDataBase = {
          time: Date.now(),
          count: 0
        };
      } else {
        if (chatLimitOnDataBase.count >= chatLimitComputed) {
          const time = Math.ceil(
            (1e3 * 60 * 60 - (Date.now() - chatLimitOnDataBase.time)) / 1e3 / 60
          );
          context.message = session.text(
            "chatluna.chat_limit_exceeded",
            [time]
          );
          return 1 /* STOP */;
        } else {
          chatLimitOnDataBase.count++;
        }
      }
    } else {
      chatLimitOnDataBase = {
        time: Date.now(),
        count: 0
      };
    }
    await chatLimitCache.set(key, chatLimitOnDataBase);
    context.options.chatLimit = chatLimitOnDataBase;
    context.options.chatLimitCache = chatLimitCache;
    return 2 /* CONTINUE */;
  }
  __name(oldChatLimitCheck, "oldChatLimitCheck");
}
__name(apply22, "apply");

// src/middlewares/chat/chat_time_limit_save.ts
var import_crypto3 = require("crypto");
function apply23(ctx, config, chain) {
  const authService = ctx.chatluna_auth;
  chain.middleware("chat_time_limit_save", async (session, context) => {
    if (config.authSystem !== true) {
      return await oldChatLimitSave(session, context);
    }
    await authService.increaseAuthGroupCount(
      context.options.authGroup.id
    );
    return 2 /* CONTINUE */;
  }).after("render_message");
  async function oldChatLimitSave(session, context) {
    const {
      chatLimit,
      chatLimitCache,
      room: { conversationId }
    } = context.options;
    let key = conversationId + "-" + session.userId;
    key = (0, import_crypto3.createHash)("md5").update(key).digest("hex");
    chatLimit.count++;
    await chatLimitCache.set(key, chatLimit);
    return 2 /* CONTINUE */;
  }
  __name(oldChatLimitSave, "oldChatLimitSave");
}
__name(apply23, "apply");

// src/middlewares/chat/cooldown_time.ts
var lastChatTime = 0;
function apply24(ctx, config, chain) {
  chain.middleware("cooldown_time", async (session, context) => {
    const currentChatTime = Date.now();
    if (currentChatTime - lastChatTime < config.msgCooldown * 1e3) {
      const waitTime = (config.msgCooldown * 1e3 - (currentChatTime - lastChatTime)) / 1e3;
      context.message = session.text(
        "chatluna.cooldown_wait_message",
        [waitTime.toFixed(1)]
      );
      return 1 /* STOP */;
    }
    lastChatTime = currentChatTime;
    return 2 /* CONTINUE */;
  }).after("allow_reply");
}
__name(apply24, "apply");

// src/middlewares/chat/message_delay.ts
var import_logger3 = require("koishi-plugin-chatluna/utils/logger");
var import_crypto4 = require("crypto");
var import_messages4 = require("@langchain/core/messages");

// src/utils/qqbot_speaker.ts
var import_langchain = require("koishi-plugin-chatluna/utils/langchain");
function formatSpeakerName(name2) {
  return JSON.stringify(name2);
}
__name(formatSpeakerName, "formatSpeakerName");
function formatQqbotSpeakerLine(speakerId, speakerName, text) {
  const prefix = `[speaker_id=${speakerId} speaker_name=${formatSpeakerName(speakerName)}]`;
  return text.length > 0 ? `${prefix} ${text}` : prefix;
}
__name(formatQqbotSpeakerLine, "formatQqbotSpeakerLine");
function resolveSpeakerFormat(additionalKwargs) {
  const meta = additionalKwargs?.qqbot_speaker_format;
  if (meta?.version !== "speaker_id_v1") {
    return null;
  }
  if (meta.isDirect || meta.preformatted) {
    return null;
  }
  const speakerId = meta.speakerId?.trim();
  const speakerName = (meta.speakerName?.trim() || speakerId)?.trim();
  if (!speakerId || !speakerName) {
    return null;
  }
  return {
    ...meta,
    speakerId,
    speakerName
  };
}
__name(resolveSpeakerFormat, "resolveSpeakerFormat");
function serializeQqbotHumanMessageContent(content, additionalKwargs) {
  const speakerFormat = resolveSpeakerFormat(additionalKwargs);
  if (speakerFormat == null) {
    return content;
  }
  const { speakerId, speakerName } = speakerFormat;
  const resolvedSpeakerId = speakerId;
  const resolvedSpeakerName = speakerName;
  if (typeof content === "string") {
    return formatQqbotSpeakerLine(
      resolvedSpeakerId,
      resolvedSpeakerName,
      content
    );
  }
  if (!Array.isArray(content)) {
    return formatQqbotSpeakerLine(
      resolvedSpeakerId,
      resolvedSpeakerName,
      ""
    );
  }
  const textIndex = content.findIndex(
    (part) => (0, import_langchain.isMessageContentText)(part)
  );
  if (textIndex === -1) {
    return [
      {
        type: "text",
        text: formatQqbotSpeakerLine(
          resolvedSpeakerId,
          resolvedSpeakerName,
          ""
        )
      },
      ...content
    ];
  }
  return content.map((part, index) => {
    if (index !== textIndex || !(0, import_langchain.isMessageContentText)(part)) {
      return part;
    }
    return {
      ...part,
      text: formatQqbotSpeakerLine(
        resolvedSpeakerId,
        resolvedSpeakerName,
        part.text
      )
    };
  });
}
__name(serializeQqbotHumanMessageContent, "serializeQqbotHumanMessageContent");

// src/middlewares/chat/message_delay.ts
var logger7;
var queues = /* @__PURE__ */ new Map();
function apply25(ctx, config, chain) {
  logger7 = (0, import_logger3.createLogger)(ctx);
  chain.middleware("message_delay", async (session, context) => {
    if (!config.messageQueue || context.command?.length > 0) {
      return 2 /* CONTINUE */;
    }
    context.options.messageId = (0, import_crypto4.randomUUID)();
    const { room, inputMessage } = context.options;
    const conversationId = room.conversationId;
    const userName = inputMessage.name || "unknown";
    const messageId = context.options.messageId;
    if (room.chatMode === "plugin" && await ctx.chatluna.appendPendingMessage(
      conversationId,
      createPendingMessage(session, room, inputMessage),
      room.chatMode
    )) {
      logger7.debug(
        `Appending pending message for ${conversationId}, messageId: ${messageId}`
      );
      return 1 /* STOP */;
    }
    const conversation = queues.get(conversationId) ?? {
      turns: [],
      inFlight: false
    };
    queues.set(conversationId, conversation);
    const tailTurn = conversation.turns[conversation.turns.length - 1];
    let turn;
    if (tailTurn && tailTurn.state !== "processing" && tailTurn.userName === userName) {
      turn = tailTurn;
      logger7.debug(
        `Joining turn for ${conversationId}, messageId: ${messageId}, user: ${userName}, total: ${turn.messages.length + 1}`
      );
    } else {
      const state = conversation.turns.length === 0 && config.messageQueueDelay > 0 ? "collecting" : "waiting";
      turn = {
        messages: [],
        userName,
        state
      };
      conversation.turns.push(turn);
      logger7.debug(
        `Creating new turn for ${conversationId}, messageId: ${messageId}, user: ${userName}, queue: ${conversation.turns.length}`
      );
    }
    turn.messages.push(inputMessage);
    const statusPromise = awaitTurnStart(turn, context);
    if (turn.state === "collecting") {
      resetTurnTimeout(ctx, config, conversationId, turn);
    }
    tryStartHeadTurn(conversationId, conversation);
    return await statusPromise;
  }).after("check_room").after("read_chat_message").before("lifecycle-handle_command");
  const completeTurn = /* @__PURE__ */ __name(async (conversationId) => {
    const conversation = queues.get(conversationId);
    if (!conversation) {
      return;
    }
    const current = conversation.turns.shift();
    conversation.inFlight = false;
    if (current?.timeout) {
      current.timeout();
    }
    if (current?.starter) {
      current.starter.resolve(1 /* STOP */);
      current.starter = void 0;
    }
    if (conversation.turns.length === 0) {
      queues.delete(conversationId);
      return;
    }
    tryStartHeadTurn(conversationId, conversation);
    if (current) {
      logger7.debug(
        `Completing turn for ${conversationId}, remaining: ${conversation.turns.length}`
      );
    }
  }, "completeTurn");
  ctx.on("chatluna/after-chat", completeTurn);
  ctx.on(
    "chatluna/after-chat-error",
    (_error, conversationId) => completeTurn(conversationId)
  );
  ctx.on("chatluna/clear-chat-history", async (conversationId) => {
    const conversation = queues.get(conversationId);
    if (conversation) {
      const stoppedWaiters = conversation.turns.filter(
        (turn) => !!turn.starter
      ).length;
      logger7.debug(
        `Clearing chat history for ${conversationId}, stopping ${stoppedWaiters} waiters`
      );
      for (const turn of conversation.turns) {
        if (turn.timeout) {
          turn.timeout();
          turn.timeout = void 0;
        }
        if (turn.starter) {
          turn.starter.resolve(1 /* STOP */);
          turn.starter = void 0;
        }
      }
      queues.delete(conversationId);
    }
  });
}
__name(apply25, "apply");
function awaitTurnStart(turn, context) {
  if (turn.starter) {
    turn.starter.resolve(1 /* STOP */);
    turn.starter = void 0;
  }
  return new Promise((resolve) => {
    turn.starter = { resolve, context };
  });
}
__name(awaitTurnStart, "awaitTurnStart");
function resetTurnTimeout(ctx, config, conversationId, turn) {
  if (turn.timeout) {
    turn.timeout();
  }
  turn.timeout = ctx.setTimeout(() => {
    const conversation = queues.get(conversationId);
    if (!conversation || conversation.turns[0] !== turn) {
      return;
    }
    turn.state = "waiting";
    turn.timeout = void 0;
    if (conversation.inFlight) {
      return;
    }
    logger7.debug(
      // eslint-disable-next-line max-len
      `Delay timeout (${config.messageQueueDelay}s) for ${conversationId}, starting turn with ${turn.messages.length} messages`
    );
    startHeadTurn(conversationId, conversation, turn);
  }, config.messageQueueDelay * 1e3);
}
__name(resetTurnTimeout, "resetTurnTimeout");
function tryStartHeadTurn(conversationId, conversation) {
  if (conversation.inFlight) {
    return;
  }
  const head = conversation.turns[0];
  if (!head) {
    queues.delete(conversationId);
    return;
  }
  if (head.state === "collecting") {
    return;
  }
  startHeadTurn(conversationId, conversation, head);
}
__name(tryStartHeadTurn, "tryStartHeadTurn");
function startHeadTurn(conversationId, conversation, head) {
  if (conversation.inFlight) {
    return;
  }
  if (conversation.turns[0] !== head) {
    return;
  }
  if (!head.starter) {
    return;
  }
  if (head.timeout) {
    head.timeout();
    head.timeout = void 0;
  }
  const starter = head.starter;
  head.starter = void 0;
  conversation.inFlight = true;
  head.state = "processing";
  starter.context.options.inputMessage = mergeMessages(head.messages);
  head.messages = [];
  starter.resolve(2 /* CONTINUE */);
}
__name(startHeadTurn, "startHeadTurn");
function mergeMessages(messages) {
  if (messages.length === 1) return messages[0];
  const base = messages[0];
  const mergedContent = [];
  for (const msg of messages) {
    const content = msg.content;
    if (mergedContent.length > 0) {
      mergedContent.push({ type: "text", text: "\n" });
    }
    if (typeof content === "string") {
      mergedContent.push({ type: "text", text: content });
    } else if (Array.isArray(content)) {
      mergedContent.push(...content);
    }
  }
  return {
    ...base,
    content: mergedContent,
    additional_kwargs: messages.reduce(
      (acc, msg) => ({
        ...acc,
        ...msg.additional_kwargs
      }),
      base.additional_kwargs || {}
    )
  };
}
__name(mergeMessages, "mergeMessages");
function createPendingMessage(session, room, inputMessage) {
  return new import_messages4.HumanMessage({
    content: serializeQqbotHumanMessageContent(
      inputMessage.content,
      inputMessage.additional_kwargs
    ),
    name: inputMessage.name ?? session.author?.name ?? session.author?.id ?? session.username,
    id: session.userId,
    additional_kwargs: {
      ...inputMessage.additional_kwargs,
      preset: room.preset
    }
  });
}
__name(createPendingMessage, "createPendingMessage");

// src/middlewares/chat/read_chat_message.ts
var import_koishi7 = require("koishi");
var import_string5 = require("koishi-plugin-chatluna/utils/string");
var import_types5 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_koishi8 = require("koishi-plugin-chatluna/utils/koishi");
var import_count_tokens4 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_base64 = require("koishi-plugin-chatluna/utils/base64");
var CHATLUNA_DOWNLOAD_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var INVALID_RESPONSE_MIME_TYPES = /* @__PURE__ */ new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/x-binary",
  "application/x-msdownload"
]);
var SUPPORTED_AUDIO_MIME_TYPES = /* @__PURE__ */ new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/flac",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aiff"
]);
function apply26(ctx, config, chain) {
  chain.middleware("read_chat_message", async (session, context) => {
    let message = context.command != null ? context.message : session.elements;
    if (typeof message === "string") {
      message = [import_koishi7.h.text(message)];
    }
    const room = context.options.room;
    const transformedMessage = await ctx.chatluna.messageTransformer.transform(
      session,
      message,
      room?.model ?? "",
      void 0,
      {
        quote: false,
        includeQuoteReply: config.includeQuoteReply
      }
    );
    if (config.attachForwardMsgIdToContext) {
      const kwargs = transformedMessage.additional_kwargs;
      const state = kwargs?.[forwardHistoryInternalKey];
      if (state?.hasForwardHistory) {
        if (state.ids.length > 0) {
          transformedMessage.additional_kwargs.forwardMessageIds = state.ids;
        }
        addMessageContent(transformedMessage, "[聊天记录]");
      }
      delete kwargs?.[forwardHistoryInternalKey];
    }
    if (transformedMessage.content.length < 1 && (0, import_string5.getMessageContent)(transformedMessage.content).trim().length < 1) {
      return 1 /* STOP */;
    }
    context.options.inputMessage = transformedMessage;
    return 2 /* CONTINUE */;
  }).after("resolve_room");
  ctx.chatluna.messageTransformer.before(async (session, elements) => {
    appendQQAttachments(session, elements);
  });
  ctx.chatluna.messageTransformer.intercept(
    "text",
    async (session, element, message) => {
      addMessageContent(message, element.attrs["content"]);
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "at",
    async (session, element, message) => {
      const name2 = element.attrs["name"];
      const id = element.attrs["id"];
      if (id !== session.bot.selfId) {
        addMessageContent(
          message,
          `<at ${name2 != null ? `name="${name2}"` : ""} id="${id}"/>`
        );
      }
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "forward",
    async (session, element, message) => {
      if (!config.attachForwardMsgIdToContext) return;
      trackForwardId(element, message);
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "message",
    async (session, element, message) => {
      if (!config.attachForwardMsgIdToContext) return;
      if (!(0, import_koishi8.isForwardMessageElement)(element)) return;
      trackForwardId(element, message);
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "face",
    async (session, element, message) => {
      addMessageContent(
        message,
        `[face:${element.attrs.id}:${element.attrs.name}]`
      );
      return true;
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "img",
    async (session, element, message, model) => {
      const parsedModelInfo = model != null ? ctx.chatluna.platform.findModel(model) : void 0;
      const isInstalledImageService = ctx.chatluna.getPlugin("chatluna-multimodal-service") != null;
      if (parsedModelInfo?.value != null && !parsedModelInfo.value.capabilities.includes(
        import_types5.ModelCapabilities.ImageInput
      )) {
        if (!isInstalledImageService) {
          logger8.warn(
            `Model "${model}" does not support image input. Please use a model that supports vision capabilities, or install chatluna-multimodal-service plugin to enable image description.`
          );
        }
        return false;
      }
      const url = element.attrs.url ?? element.attrs.src;
      const displayUrl = url.length > 100 ? url.substring(0, 100) + "..." : url;
      logger8.debug(`Processing image: ${displayUrl}`);
      if (!ctx.chatluna_storage) {
        return await oldImageRead(
          ctx,
          url,
          message,
          element,
          isInstalledImageService
        );
      }
      const { buffer, ext } = await readImage(ctx, url);
      if (ext == null) {
        return false;
      }
      if (ext === "image/gif") {
        if (!isInstalledImageService) {
          logger8.warn(
            `Detected GIF image, which is not supported by most models. Please install chatluna-image-service plugin to parse GIF animations.`
          );
        }
        return false;
      }
      const fileExt = ext.includes("/") ? ext.split("/")[1] : ext;
      element.attrs["ext"] = fileExt;
      let fileName = element.attrs["filename"];
      if (fileName == null || fileName.length > 50) {
        fileName = `${await (0, import_string5.hashString)(url, 8)}.${fileExt}`;
      }
      logger8.debug(`Saving image as temp file: ${fileName}`);
      const tempFile = await ctx.chatluna_storage.createTempFile(
        buffer,
        fileName
      );
      ensureContentArray(message, `[image:${tempFile.url}]`);
      message.content.push({
        type: "image_url",
        image_url: { url: tempFile.url }
      });
      element.attrs["imageUrl"] = tempFile.url;
    },
    -100
  );
  ctx.inject(["sst"], (ctx2) => {
    logger8.debug("sst service loaded.");
    ctx2.effect(
      () => ctx2.chatluna.messageTransformer.intercept(
        "audio",
        async (session, element, message, model) => {
          const modelInfo = model != null ? ctx2.chatluna.platform.findModel(model) : void 0;
          if (isAudioHandled(message, element)) {
            logger8.debug(
              "Skip sst audio2text because audio is already handled."
            );
            return false;
          }
          if (modelInfo?.value?.capabilities?.includes(
            import_types5.ModelCapabilities.AudioInput
          )) {
            logger8.debug(
              "Skip sst audio2text because model supports audio input natively."
            );
            return false;
          }
          const content = await ctx2.sst.audio2text(session);
          logger8.debug(`audio2text: ${content}`);
          addMessageContent(message, content);
          markAudioHandled(message, element);
        }
      ),
      -100
    );
  });
  ctx.chatluna.messageTransformer.intercept(
    "file",
    async (session, element, message, model) => {
      const modelInfo = model != null ? ctx.chatluna.platform.findModel(model) : void 0;
      if (modelInfo?.value != null && !modelInfo.value.capabilities.includes(
        import_types5.ModelCapabilities.FileInput
      )) {
        addMessageContent(
          message,
          `[file: ${element.attrs["file"] ?? element.attrs["filename"] ?? "attachment"} (skipped: model does not support file input)]`
        );
        return;
      }
      await handleFileElement(
        ctx,
        session,
        element,
        message,
        model,
        "file"
      );
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "video",
    async (session, element, message, model) => {
      const modelInfo = model != null ? ctx.chatluna.platform.findModel(model) : void 0;
      if (modelInfo?.value != null && !modelInfo.value.capabilities.includes(
        import_types5.ModelCapabilities.VideoInput
      )) {
        addMessageContent(
          message,
          `[video: ${element.attrs["file"] ?? element.attrs["filename"] ?? "attachment"} (skipped: model does not support video input)]`
        );
        return;
      }
      await handleFileElement(
        ctx,
        session,
        element,
        message,
        model,
        "video"
      );
    }
  );
  ctx.chatluna.messageTransformer.intercept(
    "audio",
    async (session, element, message, model) => {
      if (isAudioHandled(message, element)) {
        logger8.debug(
          "Skip audio file handler because audio is already handled."
        );
        return false;
      }
      const modelInfo = model != null ? ctx.chatluna.platform.findModel(model) : void 0;
      if (modelInfo?.value != null && !modelInfo.value.capabilities.includes(
        import_types5.ModelCapabilities.AudioInput
      )) {
        return false;
      }
      const handled = await handleFileElement(
        ctx,
        session,
        element,
        message,
        model,
        "audio"
      );
      if (handled) {
        markAudioHandled(message, element);
      }
      return false;
    }
  );
}
__name(apply26, "apply");
async function getFileConfig(ctx, model) {
  if (model == null) return null;
  const [platform] = (0, import_count_tokens4.parseRawModelName)(model);
  if (!platform) return null;
  try {
    const clientRef = await ctx.chatluna.platform.getClient(platform);
    return clientRef?.value?.getFileHandlingConfig() ?? null;
  } catch {
    return null;
  }
}
__name(getFileConfig, "getFileConfig");
async function resolveSourceUrl(ctx, session, element) {
  const srcAttr = element.attrs["src"] ?? element.attrs["url"];
  if (srcAttr?.startsWith("http")) {
    return srcAttr;
  }
  const fileId = element.attrs["fileId"] ?? element.attrs["fileid"];
  if (session.platform === "onebot" && fileId) {
    try {
      const bot = session.bot;
      const busId = element.attrs["busId"] ?? element.attrs["busid"];
      let fileUrl;
      if (session.isDirect) {
        fileUrl = await bot.internal.getPrivateFileUrl(
          session.userId,
          fileId
        );
      } else {
        fileUrl = await bot.internal.getGroupFileUrl(
          session.guildId,
          fileId,
          busId
        );
      }
      if (fileUrl) {
        return fileUrl;
      }
    } catch (e) {
      ctx.logger.error(
        `Failed to get source URL for element: ${element.toString()}`,
        e
      );
    }
  }
  if (srcAttr) return srcAttr;
  logger8.warn(`Failed to get source URL for element: ${element.toString()}`);
  return null;
}
__name(resolveSourceUrl, "resolveSourceUrl");
async function handleFileElement(ctx, session, element, message, model, elementType) {
  const displayElementType = elementType === "audio" ? "voice" : elementType;
  if (elementType === "audio" && isAudioHandled(message, element)) {
    logger8.debug(
      "Skip handling audio file because audio is already handled."
    );
    return false;
  }
  const fileName = element.attrs["file"] ?? element.attrs["name"] ?? element.attrs["filename"];
  const sourceUrl = await resolveSourceUrl(ctx, session, element);
  if (!sourceUrl) return false;
  const fileConfig = await getFileConfig(ctx, model);
  let buffer;
  let responseMimeType = null;
  try {
    const response = await ctx.http(sourceUrl, {
      responseType: "arraybuffer",
      method: "get",
      headers: { "User-Agent": CHATLUNA_DOWNLOAD_USER_AGENT }
    });
    buffer = Buffer.from(response.data);
    const rawCt = response?.headers?.["content-type"] ?? response?.headers?.["Content-Type"];
    const ctValue = Array.isArray(rawCt) ? rawCt[0] : rawCt;
    const parsedMime = typeof ctValue === "string" ? ctValue.split(";")[0].trim().toLowerCase() : null;
    responseMimeType = parsedMime != null && !INVALID_RESPONSE_MIME_TYPES.has(parsedMime) ? parsedMime : null;
  } catch (error) {
    logger8.error(`Failed to read file from ${sourceUrl}:`, error);
    return false;
  }
  const mimeType = responseMimeType ?? (0, import_string5.getMimeTypeFromSource)(sourceUrl, fileName);
  if (elementType === "audio" && mimeType != null) {
    if (!SUPPORTED_AUDIO_MIME_TYPES.has(mimeType)) {
      const isInstalledMultimodalService = ctx.chatluna.getPlugin("multimodal-service") != null;
      if (!isInstalledMultimodalService) {
        logger8.warn(
          `Unsupported audio format "${mimeType}". Please install chatluna-multimodal-service plugin to handle this format.`
        );
      }
      return false;
    }
  }
  if (fileConfig) {
    if (mimeType != null && !fileConfig.supportedMimeTypes.has(mimeType)) {
      addMessageContent(
        message,
        `[${displayElementType}: ${fileName ?? "attachment"} (skipped: unsupported MIME type "${mimeType}")]`
      );
      return false;
    }
    const _maxSizeMb = parseFloat(
      element.attrs["chatluna_multimodal_file_input_max_size_mb"]
    );
    const maxSize = Number.isFinite(_maxSizeMb) && _maxSizeMb > 0 ? _maxSizeMb * 1024 * 1024 : (mimeType != null ? fileConfig.maxFileSizeBytesOverrides?.[mimeType] : void 0) ?? fileConfig.maxFileSizeBytes;
    const encodedSize = (0, import_base64.getBase64EncodedSize)(buffer.byteLength);
    if (encodedSize > maxSize) {
      addMessageContent(
        message,
        `[${displayElementType}: ${fileName ?? "attachment"} (skipped: file size ${encodedSize} bytes exceeds limit ${maxSize} bytes)]`
      );
      return false;
    }
    const currentTotal = getFileTotalSize(message);
    const newTotal = currentTotal + encodedSize;
    if (newTotal > fileConfig.maxTotalSizeBytes) {
      addMessageContent(
        message,
        `[${displayElementType}: ${fileName ?? "attachment"} (skipped: total inline size would exceed limit)]`
      );
      return false;
    }
  }
  const resolvedFileName = fileName ?? "attachment";
  element.attrs["file"] = resolvedFileName;
  element.attrs["filename"] = resolvedFileName;
  element.attrs["chatluna_file_url"] = sourceUrl;
  const label = elementType === "audio" ? "voice" : elementType === "video" ? "video" : "file";
  let fileUrl;
  if (ctx.chatluna_storage) {
    const file = await ctx.chatluna_storage.createTempFile(
      buffer,
      resolvedFileName
    );
    const displayFileName = fileName ?? file.name;
    element.attrs["file"] = displayFileName;
    element.attrs["filename"] = displayFileName;
    element.attrs["chatluna_file_url"] = file.url;
    fileUrl = file.url;
    ensureContentArray(message, `[${label}:${displayFileName}]`);
  } else {
    const base64 = buffer.toString("base64");
    fileUrl = `data:${mimeType ?? "application/octet-stream"};base64,${base64}`;
    ensureContentArray(message, `[${label}:${resolvedFileName}]`);
  }
  pushTypedContent(message, elementType, fileUrl, mimeType);
  return true;
}
__name(handleFileElement, "handleFileElement");
async function oldImageRead(ctx, url, message, element, isInstalledImageService) {
  const imageHash = await (0, import_string5.hashString)(url, 8);
  element.attrs["imageHash"] = imageHash;
  try {
    const { base64Source, ext } = await readImage(ctx, url);
    if (ext == null) {
      return false;
    }
    if (ext === "image/gif") {
      if (!isInstalledImageService) {
        logger8.warn(
          `Detected GIF image, which is not supported by most models. Please install chatluna-image-service plugin to parse GIF animations.`
        );
      }
      return false;
    }
    ensureContentArray(message, `[image:${imageHash}]`);
    message.content.push({
      type: "image_url",
      image_url: { url: base64Source, hash: imageHash }
    });
  } catch (error) {
    const displayUrl = url.length > 100 ? url.substring(0, 100) + "..." : url;
    logger8.warn(
      `Failed to read image from ${displayUrl}. Please check your Koishi chat adapter.`,
      error
    );
  }
}
__name(oldImageRead, "oldImageRead");
async function readImage(ctx, url) {
  if (url.startsWith("base64://")) {
    const base64 = url.slice("base64://".length);
    const buffer = Buffer.from(base64, "base64");
    const ext = (0, import_string5.getImageType)(buffer);
    return {
      base64Source: `data:${ext ?? "image/jpeg"};base64,${base64}`,
      buffer,
      ext
    };
  }
  if (url.startsWith("data:image") && url.includes("base64")) {
    const buffer = Buffer.from(url.split(",")[1], "base64");
    const ext = (0, import_string5.getImageType)(buffer);
    return {
      base64Source: url,
      buffer,
      ext
    };
  }
  try {
    const response = await ctx.http(url, {
      responseType: "arraybuffer",
      method: "get",
      headers: { "User-Agent": CHATLUNA_DOWNLOAD_USER_AGENT }
    });
    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString("base64");
    const ext = (0, import_string5.getImageType)(buffer);
    return {
      base64Source: `data:${ext};base64,${base64}`,
      buffer,
      ext
    };
  } catch (error) {
    logger8.error(`Failed to read image from ${url}:`, error);
    return {
      base64Source: null,
      buffer: null,
      ext: null
    };
  }
}
__name(readImage, "readImage");
function pushTypedContent(message, elementType, url, mimeType) {
  if (elementType === "audio") {
    ;
    message.content.push({
      type: "audio_url",
      audio_url: { url, mimeType: mimeType ?? "" }
    });
  } else if (elementType === "video") {
    ;
    message.content.push({
      type: "video_url",
      video_url: { url, mimeType: mimeType ?? "" }
    });
  } else {
    ;
    message.content.push({
      type: "file_url",
      file_url: { url, mimeType: mimeType ?? "" }
    });
  }
}
__name(pushTypedContent, "pushTypedContent");
function getFileTotalSize(message) {
  const kwargs = message.additional_kwargs ?? {};
  const value = kwargs["__file_total_size"];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
__name(getFileTotalSize, "getFileTotalSize");
function toContentParts(content) {
  if (content == null) {
    return [];
  }
  if (typeof content === "string") {
    return content.length > 0 ? [{ type: "text", text: content }] : [];
  }
  return Array.isArray(content) ? content : [content];
}
__name(toContentParts, "toContentParts");
function ensureContentArray(message, fallbackText) {
  const parts = toContentParts(message.content);
  if (parts.length > 0) {
    message.content = parts;
    return;
  }
  message.content = [{ type: "text", text: fallbackText }];
}
__name(ensureContentArray, "ensureContentArray");
function isAudioHandled(_message, element) {
  return element.attrs["_audioHandled"] === true;
}
__name(isAudioHandled, "isAudioHandled");
function markAudioHandled(_message, element) {
  element.attrs["_audioHandled"] = true;
}
__name(markAudioHandled, "markAudioHandled");
function addMessageContent(message, content) {
  if (typeof message.content === "string" && typeof content === "string") {
    message.content += content;
    return;
  }
  const incomingParts = toContentParts(content);
  if (incomingParts.length < 1) {
    return;
  }
  const currentParts = toContentParts(message.content);
  message.content = [...currentParts, ...incomingParts];
}
__name(addMessageContent, "addMessageContent");
var forwardHistoryInternalKey = "__chatluna_forwardHistory";
function trackForwardId(element, message) {
  const kwargs = message.additional_kwargs ??= {};
  const state = kwargs[forwardHistoryInternalKey] ??= {
    ids: [],
    hasForwardHistory: false
  };
  state.hasForwardHistory = true;
  const id = (0, import_koishi8.pickForwardMessageId)(element);
  if (id && !state.ids.includes(id)) {
    state.ids.push(id);
  }
}
__name(trackForwardId, "trackForwardId");
function appendQQAttachments(session, elements) {
  if (session.platform !== "qq") {
    return;
  }
  const qq = session.qq;
  const attachments = qq?.["d"]?.attachments;
  if (!attachments?.length) {
    return;
  }
  for (const attachment of attachments) {
    const type = attachment.content_type;
    const src = attachment.url;
    const exists = elements.some(
      (element) => element.attrs.src === src || element.attrs.url === src
    );
    if (exists) {
      continue;
    }
    if (type === "file") {
      elements.push(
        import_koishi7.h.file(src, {
          filename: attachment.filename
        })
      );
    } else if (type.startsWith("audio/")) {
      elements.push(
        import_koishi7.h.audio(src, {
          filename: attachment.filename,
          type,
          chatluna_file_url: src
        })
      );
    } else if (type === "voice") {
      elements.push(
        import_koishi7.h.audio(src, {
          filename: attachment.filename,
          type,
          chatluna_file_url: src
        })
      );
    } else if (type.startsWith("video/")) {
      elements.push(
        import_koishi7.h.video(src, {
          filename: attachment.filename,
          width: attachment.width,
          height: attachment.height,
          type,
          chatluna_file_url: src
        })
      );
    }
  }
}
__name(appendQQAttachments, "appendQQAttachments");

// src/middlewares/chat/render_message.ts
function apply27(ctx, config, chain) {
  chain.middleware("render_message", async (session, context) => {
    if (context.options.responseMessage == null) {
      return 0 /* SKIPPED */;
    }
    return await renderMessage(ctx, context.options.responseMessage, {
      ...context.options.renderOptions,
      session
    });
  }).after("lifecycle-send").after("censor");
}
__name(apply27, "apply");
async function renderMessage(ctx, message, options) {
  return (await ctx.chatluna.renderer.render(message, options)).map(
    (message2) => {
      const elements = message2.element;
      if (elements instanceof Array) {
        return elements;
      } else {
        return [elements];
      }
    }
  );
}
__name(renderMessage, "renderMessage");

// src/middlewares/chat/rollback_chat.ts
var import_koishi9 = require("koishi");
function apply28(ctx, config, chain) {
  chain.middleware("rollback_chat", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "rollback") return 0 /* SKIPPED */;
    let room = context.options.room;
    const rollbackRound = context.options.rollback_round ?? 1;
    if (room == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      room = rooms.find(
        (room2) => room2.roomName === context.options.room_resolve?.name || room2.roomId === roomId
      );
    }
    if (room == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    await ctx.chatluna.clearCache(room);
    const conversation = (await ctx.database.get("chathub_conversation", {
      id: room.conversationId
    }))?.[0];
    if (conversation === null) {
      context.message = session.text(".conversation_not_exist");
      return 1 /* STOP */;
    }
    let parentId = conversation.latestId;
    const messages = [];
    while (messages.length < rollbackRound * 2) {
      const message = await ctx.database.get("chathub_message", {
        conversation: room.conversationId,
        id: parentId
      });
      parentId = message[0]?.parent;
      messages.unshift(...message);
      if (parentId == null) {
        break;
      }
    }
    if (messages.length < rollbackRound * 2) {
      context.message = session.text(".no_chat_history");
      return 1 /* STOP */;
    }
    const lastMessage = parentId == null ? void 0 : await ctx.database.get("chathub_message", {
      conversation: room.conversationId,
      id: parentId
    }).then((message) => message?.[0]);
    const humanMessage = messages[messages.length - 2];
    await ctx.database.upsert("chathub_conversation", [
      {
        id: room.conversationId,
        latestId: parentId == null ? null : lastMessage.id
      }
    ]);
    if ((context.options.message?.length ?? 0) < 1) {
      context.options.inputMessage = await ctx.chatluna.messageTransformer.transform(
        session,
        [import_koishi9.h.text(humanMessage.text)],
        room.model,
        void 0,
        {
          quote: false,
          includeQuoteReply: config.includeQuoteReply
        }
      );
    }
    await ctx.database.remove("chathub_message", {
      id: messages.map((message) => message.id)
    });
    await session.send(
      session.text(".rollback_success", [rollbackRound])
    );
    logger8.debug(
      `rollback chat ${room.roomName} ${context.options.inputMessage}`
    );
    return 2 /* CONTINUE */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply28, "apply");

// src/middlewares/model/request_model.ts
var import_count_tokens5 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_error6 = require("koishi-plugin-chatluna/utils/error");
var import_logger4 = require("koishi-plugin-chatluna/utils/logger");
var import_chains = require("koishi-plugin-chatluna/chains");
var import_string6 = require("koishi-plugin-chatluna/utils/string");

// src/utils/buffer_text.ts
var import_koishi10 = require("koishi");
var import_lock = require("koishi-plugin-chatluna/utils/lock");
var StreamingBufferText = class {
  constructor(sleepTime = 3, prefix, postfix) {
    this.sleepTime = sleepTime;
    this.prefix = prefix;
    this.postfix = postfix;
  }
  static {
    __name(this, "StreamingBufferText");
  }
  isEnd = false;
  finalChunk = null;
  processors = /* @__PURE__ */ new Map();
  writers = /* @__PURE__ */ new Map();
  lock = new import_lock.ObjectLock();
  createProcessor(name2, transform2) {
    if (this.processors.has(name2)) {
      return this.processors.get(name2).readable;
    }
    const processor = new TransformStream(transform2);
    this.processors.set(name2, processor);
    return processor.readable;
  }
  async writeChunk(chunk) {
    await this.lock.runLocked(async () => {
      this.finalChunk = this.finalChunk != null ? this.finalChunk.concat(chunk) : chunk;
      for (const [name2, processor] of this.processors) {
        if (!this.writers.has(name2)) {
          this.writers.set(name2, processor.writable.getWriter());
        }
        const writer = this.writers.get(name2);
        await writer.write(chunk);
      }
    });
  }
  processChunk(chunk) {
    const content = chunk.content;
    const elements = [];
    if (typeof content === "string") {
      elements.push(import_koishi10.h.text(content));
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === "text" && item.text) {
          elements.push(import_koishi10.h.text(item.text));
        } else if (item.type === "image_url" && item.image_url) {
          elements.push(
            import_koishi10.h.image(
              typeof item.image_url === "string" ? item.image_url : item.image_url.url
            )
          );
        }
      }
    }
    return elements;
  }
  splitByMarkdown() {
    let bufferText = "";
    let inContent = this.prefix == null;
    return this.createProcessor("markdown", {
      transform: /* @__PURE__ */ __name(async (chunk, controller) => {
        const elements = this.processChunk(chunk);
        for (const element of elements) {
          if (element.type === "text") {
            const text = typeof element.children?.[0] === "string" ? element.children[0] : element.attrs?.content || "";
            for (const char of text) {
              bufferText += char;
              if (!inContent) {
                if (this.prefix && bufferText.endsWith(this.prefix)) {
                  inContent = true;
                  bufferText = "";
                }
              } else {
                if (this.postfix && bufferText.endsWith(this.postfix)) {
                  const content = bufferText.slice(
                    0,
                    -this.postfix.length
                  );
                  if (content.trim()) {
                    controller.enqueue(import_koishi10.h.text(content));
                  }
                  return;
                }
                let searchIndex = 0;
                while (true) {
                  const doubleNewlineIndex = bufferText.indexOf("\n\n", searchIndex);
                  if (doubleNewlineIndex === -1) break;
                  const content = bufferText.substring(
                    0,
                    doubleNewlineIndex
                  );
                  if (content.trim()) {
                    controller.enqueue(import_koishi10.h.text(content));
                  }
                  bufferText = bufferText.substring(
                    doubleNewlineIndex + 2
                  );
                  searchIndex = 0;
                }
              }
            }
          } else {
            if (inContent) {
              controller.enqueue(element);
            }
          }
        }
      }, "transform"),
      flush: /* @__PURE__ */ __name((controller) => {
        if (inContent && bufferText.trim()) {
          controller.enqueue(import_koishi10.h.text(bufferText));
        }
        controller.terminate();
      }, "flush")
    });
  }
  splitByPunctuations() {
    const punctuations = ["，", ".", "。", "!", "！", "?", "？"];
    let bufferText = "";
    let inContent = this.prefix == null;
    return this.createProcessor("punctuations", {
      transform: /* @__PURE__ */ __name(async (chunk, controller) => {
        const elements = this.processChunk(chunk);
        for (const element of elements) {
          if (element.type === "text") {
            const text = typeof element.children?.[0] === "string" ? element.children[0] : element.attrs?.content || "";
            for (const char of text) {
              bufferText += char;
              if (!inContent) {
                if (this.prefix && bufferText.endsWith(this.prefix)) {
                  inContent = true;
                  bufferText = "";
                }
              } else {
                if (this.postfix && bufferText.endsWith(this.postfix)) {
                  const content = bufferText.slice(
                    0,
                    -this.postfix.length
                  );
                  if (content.trim()) {
                    controller.enqueue(import_koishi10.h.text(content));
                  }
                  return;
                }
                const inPunctuation = punctuations.includes(char);
                if (inPunctuation) {
                  if (bufferText.trim()) {
                    controller.enqueue(import_koishi10.h.text(bufferText));
                  }
                  bufferText = "";
                  continue;
                }
              }
            }
          } else {
            if (inContent) {
              controller.enqueue(element);
            }
          }
        }
      }, "transform"),
      flush: /* @__PURE__ */ __name((controller) => {
        if (inContent && bufferText.trim()) {
          controller.enqueue(import_koishi10.h.text(bufferText));
        }
        controller.terminate();
      }, "flush")
    });
  }
  getCached(endText = "●") {
    const state = {
      elements: [],
      inContent: this.prefix == null,
      buffer: ""
    };
    return this.createProcessor("cached", {
      transform: /* @__PURE__ */ __name(async (chunk, controller) => {
        const elements = this.processChunk(chunk);
        for (const element of elements) {
          if (element.type === "text") {
            const text = this.extractText(element);
            if (this.processTextContent(state, text)) {
              controller.enqueue([...state.elements]);
              return;
            }
          } else if (state.inContent) {
            state.elements.push(element);
          }
        }
        if (state.inContent && state.elements.length > 0 && !this.isEnd) {
          controller.enqueue(this.addEndText(state.elements, endText));
        }
      }, "transform"),
      flush: /* @__PURE__ */ __name(async (controller) => {
        if (state.inContent && state.elements.length > 0) {
          controller.enqueue(state.elements);
        }
        controller.terminate();
      }, "flush")
    });
  }
  extractText(element) {
    return typeof element.children?.[0] === "string" ? element.children[0] : element.attrs?.content || "";
  }
  processTextContent(state, text) {
    if (!state.inContent) {
      if (this.prefix && text.includes(this.prefix)) {
        state.inContent = true;
        const afterPrefix = text.slice(
          text.indexOf(this.prefix) + this.prefix.length
        );
        if (afterPrefix) {
          this.mergeTextElement(state.elements, import_koishi10.h.text(afterPrefix));
        }
      }
      return false;
    }
    if (this.postfix && text.includes(this.postfix)) {
      const beforePostfix = text.slice(0, text.indexOf(this.postfix));
      if (beforePostfix) {
        this.mergeTextElement(state.elements, import_koishi10.h.text(beforePostfix));
      }
      return true;
    }
    this.mergeTextElement(state.elements, import_koishi10.h.text(text));
    return false;
  }
  addEndText(elements, endText) {
    if (!endText) return [...elements];
    const result = [...elements];
    result.push(import_koishi10.h.text(endText));
    return result;
  }
  mergeTextElement(elements, newElement) {
    if (newElement.type === "text" && elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      if (lastElement.type === "text") {
        const lastText = typeof lastElement.children?.[0] === "string" ? lastElement.children[0] : lastElement.attrs?.content || "";
        const newText = typeof newElement.children?.[0] === "string" ? newElement.children[0] : newElement.attrs?.content || "";
        elements[elements.length - 1] = import_koishi10.h.text(lastText + newText);
        return;
      }
    }
    elements.push(newElement);
  }
  async end() {
    await this.lock.runLocked(async () => {
      for (const writer of this.writers.values()) {
        await writer.ready;
        await writer.close();
      }
      this.writers.clear();
      this.processors.clear();
      this.isEnd = true;
    });
  }
};
var MessageEditQueue = class {
  static {
    __name(this, "MessageEditQueue");
  }
  currentElements;
  isProcessing = false;
  isFinished = false;
  async enqueue(messageId, session, text) {
    this.currentElements = text;
    if (!this.isProcessing) {
      this.processQueue(messageId, session);
    }
  }
  async processQueue(messageId, session) {
    this.isProcessing = true;
    let lastElements;
    while (!this.isFinished || this.currentElements !== lastElements) {
      if (this.currentElements === lastElements) break;
      lastElements = this.currentElements;
      await this.editMessage(messageId, session, lastElements);
    }
    this.isProcessing = false;
  }
  async editMessage(messageId, session, text) {
    try {
      await session.bot.editMessage(session.channelId, messageId, text);
    } catch (error) {
      logger8.error("Error editing message:", error);
    }
  }
  finish() {
    this.isFinished = true;
  }
};
async function sendInitialMessage(session, text) {
  try {
    const messageIds = await session.bot.sendMessage(
      session.channelId,
      text
    );
    return messageIds[0];
  } catch (error) {
    logger8.error("Error sending initial message:", error);
    throw error;
  }
}
__name(sendInitialMessage, "sendInitialMessage");

// src/middlewares/model/request_model.ts
var import_crypto5 = require("crypto");
var logger9;
var requestIdCache = /* @__PURE__ */ new Map();
function apply29(ctx, config, chain) {
  logger9 = (0, import_logger4.createLogger)(ctx);
  chain.middleware("request_model", async (session, context) => {
    const { room, inputMessage } = context.options;
    const presetTemplate = ctx.chatluna.preset.getPreset(
      room.preset
    ).value;
    if (presetTemplate == null) {
      throw new import_error6.ChatLunaError(
        import_error6.ChatLunaErrorCode.PRESET_NOT_FOUND,
        new Error(`Preset ${room.preset} not found`)
      );
    }
    const originContent = inputMessage.content;
    const originMeta = resolveInputContentMeta(
      originContent,
      inputMessage.additional_kwargs?.qqbot_input_content_meta
    );
    inputMessage.additional_kwargs = {
      ...inputMessage.additional_kwargs ?? {},
      qqbot_input_content_meta: originMeta
    };
    if (presetTemplate.formatUserPromptString != null) {
      inputMessage.content = await processUserPrompt(
        config,
        presetTemplate,
        session,
        inputMessage.content,
        room
      );
    }
    ensureImageContentIntegrity(inputMessage.content, originMeta);
    const bufferText = new StreamingBufferText(
      3,
      presetTemplate.config?.postHandler?.prefix,
      presetTemplate.config?.postHandler?.postfix
    );
    const postHandler = presetTemplate.config?.postHandler ? new import_string6.PresetPostHandler(
      ctx,
      config,
      presetTemplate.config?.postHandler
    ) : void 0;
    let streamPromise = Promise.resolve();
    if (config.streamResponse) {
      const isEditMessage = session.bot.editMessage != null && session.bot.platform !== "onebot";
      if (isEditMessage) {
        streamPromise = setupEditMessageStream(
          context,
          session,
          config,
          bufferText
        );
      } else {
        streamPromise = setupRegularMessageStream(
          context,
          config,
          config.splitMessage ? bufferText.splitByPunctuations() : bufferText.splitByMarkdown()
        );
      }
    }
    let responseMessage;
    inputMessage.conversationId = room.conversationId;
    inputMessage.name = session.author?.name ?? session.author?.id ?? session.username;
    const requestId = createRequestId(
      session,
      room,
      context.options.messageId
    );
    const chatCallbacks = createChatCallbacks(
      context,
      session,
      config,
      bufferText
    );
    try {
      ;
      [responseMessage] = await Promise.all([
        ctx.chatluna.chat(
          session,
          room,
          inputMessage,
          chatCallbacks,
          config.streamResponse,
          {
            prompt: (0, import_string6.getMessageContent)(originContent),
            ...(0, import_string6.getSystemPromptVariables)(session, config, room)
          },
          postHandler,
          requestId
        ),
        streamPromise
      ]);
    } catch (e) {
      await maybeHandleReplyRequestModelError(
        session,
        e
      );
      if (e?.message?.includes("output values have 1 keys")) {
        throw new import_error6.ChatLunaError(
          import_error6.ChatLunaErrorCode.MODEL_RESPONSE_IS_EMPTY
        );
      } else {
        throw e;
      }
    }
    if (!config.streamResponse) {
      context.options.responseMessage = responseMessage;
    } else {
      context.options.responseMessage = null;
      context.message = null;
    }
    await updateChatTime(ctx, room);
    return import_chains.ChainMiddlewareRunStatus.CONTINUE;
  }).after("lifecycle-request_model");
}
__name(apply29, "apply");
async function maybeHandleReplyRequestModelError(session, error) {
  const handler = session.state?.qqReplyTransport?.handleRequestModelError;
  if (typeof handler !== "function") {
    return;
  }
  await handler(error);
}
__name(maybeHandleReplyRequestModelError, "maybeHandleReplyRequestModelError");
function getRequestId(session, room) {
  const userKey = session.userId + "-" + (session.guildId ?? "") + "-" + room.conversationId;
  return requestIdCache.get(userKey);
}
__name(getRequestId, "getRequestId");
function createRequestId(session, room, requestId = (0, import_crypto5.randomUUID)()) {
  const userKey = session.userId + "-" + (session.guildId ?? "") + "-" + room.conversationId;
  requestIdCache.set(userKey, requestId);
  return requestId;
}
__name(createRequestId, "createRequestId");
function createChatCallbacks(context, session, config, bufferText) {
  return {
    "llm-new-chunk": createChunkHandler(context, bufferText),
    "llm-queue-waiting": createQueueWaitingHandler(context),
    "llm-call-tool": createToolCallHandler(context, config),
    "llm-used-token-count": createTokenCountHandler(
      context,
      session,
      config
    )
  };
}
__name(createChatCallbacks, "createChatCallbacks");
function createChunkHandler(context, bufferText) {
  let firstResponse = true;
  return async (chunk) => {
    if (chunk == null) {
      await bufferText.end();
      return;
    }
    await bufferText.writeChunk(chunk);
    if (firstResponse === true) {
      firstResponse = false;
      try {
        await context?.recallThinkingMessage();
      } finally {
        firstResponse = false;
      }
    }
  };
}
__name(createChunkHandler, "createChunkHandler");
function createQueueWaitingHandler(context) {
  return async (count) => {
    context.options.queueCount = count;
  };
}
__name(createQueueWaitingHandler, "createQueueWaitingHandler");
function createToolCallHandler(context, config) {
  return async (tool, arg, content, log) => {
    logger9.debug(`Call tool: ${tool} with ${JSON.stringify(arg)}`);
    if (context.options.room?.chatMode === "plugin" && context.options.inputMessage?.additional_kwargs?.qqbot_reply_mode === "agent") {
      return;
    }
    if (content != null && (typeof content === "string" && content.trim().length > 0 || Array.isArray(content) && content.length > 0)) {
      await sendRenderedMessage(
        context,
        {
          content
        },
        config
      );
      return;
    }
    if (!config.showThoughtMessage) {
      return;
    }
    if (!(log.includes("Invoking") && log.includes("with"))) {
      await sendMessage(context, log, config);
      return;
    }
    await sendMessage(context, (0, import_string6.formatToolCall)(tool, arg, log), config);
  };
}
__name(createToolCallHandler, "createToolCallHandler");
function createTokenCountHandler(context, session, config) {
  return async (tokens) => {
    if (config.authSystem !== true) {
      return;
    }
    const balance = await context.ctx.chatluna_auth.calculateBalance(
      session,
      (0, import_count_tokens5.parseRawModelName)(context.options.room.model)[0],
      tokens
    );
    logger9.debug(`Current balance: ${balance}`);
  };
}
__name(createTokenCountHandler, "createTokenCountHandler");
async function processUserPrompt(config, presetTemplate, session, originContent, room) {
  if (typeof originContent === "string") {
    return await (0, import_string6.formatUserPromptString)(
      config,
      presetTemplate,
      session,
      originContent,
      room
    ).then((result) => result.text);
  }
  return await Promise.all(
    originContent.map(
      async (message) => message.type === "text" ? {
        type: "text",
        text: await (0, import_string6.formatUserPromptString)(
          config,
          presetTemplate,
          session,
          message.text,
          room
        ).then((result) => result.text)
      } : message
    )
  );
}
__name(processUserPrompt, "processUserPrompt");
function countImageParts(content) {
  return Array.isArray(content) ? content.filter((part) => part?.type === "image_url").length : 0;
}
__name(countImageParts, "countImageParts");
function resolveInputContentMeta(content, rawMeta) {
  const meta = rawMeta != null && typeof rawMeta === "object" ? rawMeta : {};
  const imageCount = Math.max(
    Number.isFinite(meta.imageCount) ? Number(meta.imageCount) : 0,
    countImageParts(content)
  );
  return {
    hasImageInput: Boolean(meta.hasImageInput) || imageCount > 0,
    imageCount
  };
}
__name(resolveInputContentMeta, "resolveInputContentMeta");
function ensureImageContentIntegrity(content, meta) {
  if (!meta.hasImageInput && meta.imageCount < 1) {
    return;
  }
  const currentImageCount = countImageParts(content);
  if (currentImageCount > 0) {
    return;
  }
  throw new import_error6.ChatLunaError(
    import_error6.ChatLunaErrorCode.UNKNOWN_ERROR,
    new Error(
      `Input image content was lost before model request (expected ${meta.imageCount} image part(s)).`
    )
  );
}
__name(ensureImageContentIntegrity, "ensureImageContentIntegrity");
function setupRegularMessageStream(context, config, textStream) {
  return new Promise(async (resolve) => {
    const reader = textStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await sendMessage(context, value, config);
      }
    } catch (error) {
      logger9.error("Error in message stream:", error);
    } finally {
      reader.releaseLock();
      resolve();
    }
  });
}
__name(setupRegularMessageStream, "setupRegularMessageStream");
function setupEditMessageStream(context, session, config, bufferText) {
  const cachedStream = bufferText.getCached();
  return new Promise(async (resolve) => {
    const { ctx } = context;
    let messageId = null;
    const messageQueue = new MessageEditQueue();
    const reader = cachedStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        let processedElements = value;
        if (config.censor) {
          processedElements = await ctx.censor.transform(value, session).then((result) => result);
        }
        if (messageId == null) {
          messageId = await sendInitialMessage(
            session,
            processedElements
          );
        } else {
          await messageQueue.enqueue(
            messageId,
            session,
            processedElements
          );
        }
      }
      messageQueue.finish();
    } catch (error) {
      logger9.error("Error in edit message stream:", error);
    } finally {
      reader.releaseLock();
      resolve();
    }
  });
}
__name(setupEditMessageStream, "setupEditMessageStream");
async function renderMessageWithCensor(context, message, config) {
  const renderedMessage = await renderMessage(context.ctx, message, {
    ...context.options.renderOptions,
    session: context.session
  });
  if (config.censor) {
    for (const key in renderedMessage) {
      renderedMessage[key] = await context.ctx.censor.transform(
        renderedMessage[key],
        context.session
      );
    }
  }
  return renderedMessage;
}
__name(renderMessageWithCensor, "renderMessageWithCensor");
async function sendMessage(context, text, config) {
  await sendRenderedMessage(
    context,
    {
      content: typeof text === "string" ? text : text.toString()
    },
    config
  );
}
__name(sendMessage, "sendMessage");
async function sendRenderedMessage(context, message, config) {
  const { content } = message;
  if (content == null || typeof content === "string" && content.trim() === "" || Array.isArray(content) && content.length === 0) {
    return;
  }
  const renderedMessage = await renderMessageWithCensor(
    context,
    message,
    config
  );
  await context.send(renderedMessage);
}
__name(sendRenderedMessage, "sendRenderedMessage");

// src/middlewares/chat/stop_chat.ts
function apply30(ctx, config, chain) {
  chain.middleware("stop_chat", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "stop_chat") return 0 /* SKIPPED */;
    let room = context.options.room;
    if (room == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      room = rooms.find(
        (room2) => room2.roomName === context.options.room_resolve?.name || room2.roomId === roomId
      );
    }
    if (room == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    const requestId = getRequestId(session, room);
    if (requestId == null) {
      context.message = session.text(".no_active_chat");
      return 1 /* STOP */;
    }
    const status = await ctx.chatluna.stopChat(room, requestId);
    if (status === null) {
      context.message = session.text(".no_active_chat");
    } else if (!status) {
      context.message = session.text(".stop_failed");
    }
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply30, "apply");

// src/middlewares/chat/thinking_message_recall.ts
function apply31(ctx, config, chain) {
  chain.middleware("thinking_message_recall", async (session, context) => {
    if (!config.sendThinkingMessage) {
      return 0 /* SKIPPED */;
    }
    await context.recallThinkingMessage?.();
    return 2 /* CONTINUE */;
  }).after("render_message");
}
__name(apply31, "apply");

// src/middlewares/chat/thinking_message_send.ts
var import_logger5 = require("koishi-plugin-chatluna/utils/logger");
var logger10;
function apply32(ctx, config, chain) {
  logger10 = (0, import_logger5.createLogger)(ctx);
  chain.middleware("thinking_message_send", async (session, context) => {
    if (!config.sendThinkingMessage || context.command?.length > 0) {
      return 0 /* SKIPPED */;
    }
    const thinkingTimeoutObject = {};
    context.options.thinkingTimeoutObject = thinkingTimeoutObject;
    thinkingTimeoutObject.timeout = setTimeout(async () => {
      const queueCount = await getQueueCount(
        thinkingTimeoutObject,
        context.options
      );
      if (thinkingTimeoutObject.timeout == null || queueCount < 1) {
        return;
      }
      const messageIds = await session.send(
        session.text("chatluna.thinking_message", [
          (queueCount ?? "0").toString()
        ])
      );
      thinkingTimeoutObject.recallFunc = async () => {
        try {
          await session.bot.deleteMessage(
            session.channelId,
            messageIds[0]
          );
        } catch (e) {
          logger10.error(e);
        }
        thinkingTimeoutObject.autoRecallTimeout = void 0;
        thinkingTimeoutObject.timeout = void 0;
      };
      thinkingTimeoutObject.autoRecallTimeout = setTimeout(
        () => {
          thinkingTimeoutObject.recallFunc?.();
          thinkingTimeoutObject.autoRecallTimeout = void 0;
        },
        1e3 * 60 * 2 - 1e3 * 3
      );
    }, config.sendThinkingMessageTimeout);
    return 2 /* CONTINUE */;
  }).before("lifecycle-prepare");
}
__name(apply32, "apply");
async function getQueueCount(obj, options) {
  await new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (obj.timeout != null && options.queueCount != null) {
        clearInterval(timer);
        resolve(void 0);
      }
    });
  });
  return options.queueCount;
}
__name(getQueueCount, "getQueueCount");

// src/middlewares/model/list_all_embeddings.ts
var import_types6 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_pagination2 = require("koishi-plugin-chatluna/utils/pagination");
function apply33(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  const pagination = new import_pagination2.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => value, "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_all_embeddings", async (session, context) => {
    const {
      command: command2,
      options: { page, limit }
    } = context;
    if (command2 !== "list_embeddings")
      return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    const models = service.listAllModels(import_types6.ModelType.embeddings).value.map((model) => model.toModelName());
    await pagination.push(models);
    context.message = await pagination.getFormattedPage(page, limit);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply33, "apply");

// src/middlewares/model/list_all_model.ts
var import_types7 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_pagination3 = require("koishi-plugin-chatluna/utils/pagination");
function apply34(ctx, config, chain) {
  const services = ctx.chatluna.platform;
  const pagination = new import_pagination3.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => value, "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_all_model", async (session, context) => {
    const {
      command: command2,
      options: { page, limit }
    } = context;
    if (command2 !== "list_model")
      return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    const models = services.listAllModels(import_types7.ModelType.llm).value.map((model) => model.toModelName());
    await pagination.push(models);
    context.message = await pagination.getFormattedPage(page, limit);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply34, "apply");

// src/middlewares/model/list_all_tool.ts
var import_pagination4 = require("koishi-plugin-chatluna/utils/pagination");
function apply35(ctx, config, chain) {
  const services = ctx.chatluna.platform;
  const pagination = new import_pagination4.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => value, "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_all_tool", async (session, context) => {
    const {
      command: command2,
      options: { page, limit }
    } = context;
    if (command2 !== "list_tool") return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    const tools = services.getTools().value.sort((a, b) => {
      return a.localeCompare(b, void 0, {
        numeric: true,
        sensitivity: "base"
      });
    });
    await pagination.push(tools);
    context.message = await pagination.getFormattedPage(page, limit);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply35, "apply");

// src/middlewares/model/list_all_vectorstore.ts
var import_pagination5 = require("koishi-plugin-chatluna/utils/pagination");
function apply36(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  const pagination = new import_pagination5.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => value, "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_all_vectorstore", async (session, context) => {
    const {
      command: command2,
      options: { page, limit }
    } = context;
    if (command2 !== "list_vector_store")
      return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    await pagination.push(service.vectorStores.value);
    context.message = await pagination.getFormattedPage(page, limit);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply36, "apply");

// src/middlewares/model/resolve_model.ts
function apply37(ctx, config, chain) {
  chain.middleware("resolve_model", async (session, context) => {
    const { room } = context.options;
    if ((context.command?.length ?? 0) > 1) {
      return 2 /* CONTINUE */;
    }
    let isAvailable;
    try {
      isAvailable = await checkConversationRoomAvailability(ctx, room);
    } catch (e) {
      logger8.error(e);
      return 1 /* STOP */;
    }
    if (isAvailable) {
      return 2 /* CONTINUE */;
    }
    const modelName = room?.model == null || room.model.trim().length < 1 || room.model === "无" || room.model === "empty" ? "empty" : room.model;
    await context.send(
      session.text("chatluna.room.unavailable", [modelName])
    );
    try {
      const success = await fixConversationRoomAvailability(
        ctx,
        config,
        room
      );
      if (!success) {
        return 1 /* STOP */;
      }
    } catch (error) {
      logger8.error(error);
      return 1 /* STOP */;
    }
    return 2 /* CONTINUE */;
  }).before("check_room").after("resolve_room");
}
__name(apply37, "apply");

// src/middlewares/model/search_model.ts
var import_types8 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_pagination6 = require("koishi-plugin-chatluna/utils/pagination");
function apply38(ctx, config, chain) {
  const services = ctx.chatluna.platform;
  const pagination = new import_pagination6.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => value, "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("search_model", async (session, context) => {
    const {
      command: command2,
      options: { page, limit, query }
    } = context;
    if (command2 !== "search_model")
      return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    const models = services.listAllModels(import_types8.ModelType.llm).value.map((model) => model.toModelName());
    await pagination.push(models);
    context.message = await pagination.searchPage(
      (value) => value.includes(query),
      page,
      limit
    );
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply38, "apply");

// src/middlewares/model/set_default_embeddings.ts
var import_types9 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_count_tokens6 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
function apply39(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  chain.middleware("set_default_embeddings", async (session, context) => {
    const { command: command2, options } = context;
    if (command2 !== "set_embeddings")
      return 0 /* SKIPPED */;
    const { setEmbeddings } = options;
    if (!setEmbeddings) {
      context.message = session.text(".usage_hint");
      return 1 /* STOP */;
    }
    const embeddings = service.listAllModels(import_types9.ModelType.embeddings);
    const [, modelName] = (0, import_count_tokens6.parseRawModelName)(setEmbeddings);
    const targetEmbeddings = embeddings.value.filter(
      (embeddingsName) => {
        return embeddingsName.name.includes(modelName);
      }
    );
    if (targetEmbeddings.length > 1) {
      const buffer = [];
      buffer.push(session.text(".multiple_models_found.header"));
      for (const embedding of targetEmbeddings) {
        buffer.push(embedding.toModelName());
      }
      buffer.push(session.text(".multiple_models_found.footer"));
      buffer.push(
        session.text(".multiple_models_found.example", [
          targetEmbeddings[0]
        ])
      );
      context.message = buffer.join("\n");
    } else if (targetEmbeddings.length === 0) {
      context.message = session.text(".model_not_found");
    }
    const fullName = targetEmbeddings[0];
    await context.send(
      session.text(".success", [fullName.toModelName()])
    );
    config.defaultEmbeddings = fullName.toModelName();
    const appContext = ctx.scope.parent;
    config = appContext.config;
    appContext.scope.update(config, true);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply39, "apply");

// src/middlewares/model/set_default_vectorstore.ts
function apply40(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  chain.middleware("set_default_vectorstore", async (session, context) => {
    const { command: command2, options } = context;
    if (command2 !== "set_vector_store")
      return 0 /* SKIPPED */;
    const { setVectorStore } = options;
    if (!setVectorStore) {
      context.message = session.text(".usage_hint");
      return 1 /* STOP */;
    }
    const targetVectorStoreProviders = service.vectorStores.value.filter(
      (vectorStoreProviderName) => vectorStoreProviderName.includes(setVectorStore)
    );
    if (targetVectorStoreProviders.length > 1) {
      const buffer = [];
      buffer.push(session.text(".multiple_stores_found.header"));
      for (const vectorStoreProvider of targetVectorStoreProviders) {
        buffer.push(vectorStoreProvider);
      }
      buffer.push(session.text(".multiple_stores_found.footer"));
      buffer.push(
        session.text(".multiple_stores_found.example", [
          targetVectorStoreProviders[0]
        ])
      );
      context.message = buffer.join("\n");
      return 1 /* STOP */;
    } else if (targetVectorStoreProviders.length === 0) {
      context.message = session.text(".store_not_found");
      return 1 /* STOP */;
    }
    const targetProviderName = targetVectorStoreProviders[0];
    const keysCache = ctx.chatluna.cache;
    await keysCache.set("default-vector-store", targetProviderName);
    await context.send(session.text(".success", [targetProviderName]));
    const appContext = ctx.scope.parent;
    config = appContext.config;
    config.defaultVectorStore = targetProviderName;
    appContext.scope.update(config, true);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply40, "apply");

// src/middlewares/model/test_model.ts
var import_types10 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_count_tokens7 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
function apply41(ctx, config, chain) {
  const services = ctx.chatluna.platform;
  chain.middleware("test_model", async (session, context) => {
    const {
      command: command2,
      options: { model }
    } = context;
    if (command2 !== "test_model")
      return 0 /* SKIPPED */;
    let platformName;
    let modelName;
    try {
      if (!model.includes("/")) {
        const platformModels = services.listPlatformModels(
          model,
          import_types10.ModelType.llm
        );
        if (!platformModels.value || platformModels.value.length === 0) {
          context.message = session.text(".platform_not_found", [
            model
          ]);
          return 1 /* STOP */;
        }
        const randomIndex = Math.floor(
          Math.random() * platformModels.value.length
        );
        const selectedModel = platformModels.value[randomIndex];
        platformName = model;
        modelName = selectedModel.name;
      } else {
        ;
        [platformName, modelName] = (0, import_count_tokens7.parseRawModelName)(model);
        if (!platformName || !modelName) {
          context.message = session.text(
            ".invalid_model_format",
            [model]
          );
          return 1 /* STOP */;
        }
      }
      const client = await services.getClient(platformName);
      if (client.value == null) {
        await ctx.chatluna.awaitLoadPlatform(platformName, 1e4);
      }
      if (client.value == null) {
        context.message = session.text(".platform_unavailable", [
          platformName
        ]);
        return 1 /* STOP */;
      }
      const chatModel = client.value.createModel(
        modelName
      );
      if (!chatModel) {
        context.message = session.text(".model_not_found", [
          `${platformName}/${modelName}`
        ]);
        return 1 /* STOP */;
      }
      context.message = session.text(".testing", [
        `${platformName}/${modelName}`
      ]);
      const startTime = Date.now();
      let response;
      let testError = null;
      try {
        response = await chatModel.invoke("Hello", {
          maxTokens: 10,
          signal: AbortSignal.timeout(6e4)
        });
      } catch (error) {
        testError = error;
      }
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      if (testError) {
        context.message = session.text(".test_failed", [
          `${platformName}/${modelName}`,
          responseTime.toString(),
          testError.message || testError.toString()
        ]);
      } else if (response && response.content) {
        context.message = session.text(".test_success", [
          `${platformName}/${modelName}`,
          responseTime.toString(),
          response.content.toString().substring(0, 50)
        ]);
      } else {
        context.message = session.text(".test_success_no_content", [
          `${platformName}/${modelName}`,
          responseTime.toString()
        ]);
      }
    } catch (error) {
      context.message = session.text(".test_error", [
        error.message || error.toString()
      ]);
    }
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply41, "apply");

// src/middlewares/preset/add_preset.ts
var import_js_yaml = require("js-yaml");
var import_promises = __toESM(require("fs/promises"), 1);
function apply42(ctx, _, chain) {
  chain.middleware("add_preset", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "add_preset")
      return 0 /* SKIPPED */;
    const presetName = context.options.addPreset;
    const preset = ctx.chatluna.preset;
    const existsPreset = preset.getPreset(presetName);
    if (existsPreset.value != null) {
      await context.send(session.text(".conflict"));
      return 1 /* STOP */;
    }
    await context.send(session.text(".prompt"));
    const result = await session.prompt(1e3 * 30);
    if (!result) {
      context.message = session.text(".timeout", [presetName]);
      return 1 /* STOP */;
    }
    const presetObject = {
      keywords: [presetName],
      prompts: [
        {
          role: "system",
          content: result
        }
      ]
    };
    const yamlText = (0, import_js_yaml.dump)(presetObject);
    await import_promises.default.writeFile(
      preset.resolvePresetDir() + `/${presetName}.yml`,
      yamlText
    );
    context.message = session.text(".success", [presetName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply42, "apply");

// src/middlewares/preset/clone_preset.ts
var import_promises2 = __toESM(require("fs/promises"), 1);
var import_js_yaml2 = require("js-yaml");
function apply43(ctx, config, chain) {
  chain.middleware("clone_preset", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "clone_preset") {
      return 0 /* SKIPPED */;
    }
    const { newName, name: name2 } = context.options.clonePreset;
    const presetService = ctx.chatluna.preset;
    const oldPreset = presetService.getPreset(name2);
    const newPreset = presetService.getPreset(newName);
    if (newPreset.value != null) {
      await context.send(session.text(".conflict"));
      return 1 /* STOP */;
    }
    if (oldPreset.value == null) {
      await context.send(session.text(".not_found", [name2]));
      return 1 /* STOP */;
    }
    await context.send(session.text(".confirm", [name2]));
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    } else if (result !== "Y") {
      context.message = session.text(".cancelled");
      return 1 /* STOP */;
    }
    const loaded = (0, import_js_yaml2.load)(newPreset.value.rawText);
    loaded.keywords.push(newName);
    await import_promises2.default.writeFile(
      presetService.resolvePresetDir() + `/${newName}_clone.yml`,
      (0, import_js_yaml2.dump)(loaded)
    );
    context.message = session.text(".success", [newName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply43, "apply");

// src/middlewares/preset/delete_preset.ts
var import_logger6 = require("koishi-plugin-chatluna/utils/logger");
var import_promises3 = __toESM(require("fs/promises"), 1);
var logger11;
function apply44(ctx, config, chain) {
  logger11 = (0, import_logger6.createLogger)(ctx);
  chain.middleware("delete_preset", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "delete_preset")
      return 0 /* SKIPPED */;
    const presetName = context.options.deletePreset;
    const preset = ctx.chatluna.preset;
    let presetTemplate;
    try {
      presetTemplate = preset.getPreset(presetName).value;
      const allPreset = preset.getAllPreset().value;
      if (allPreset.length === 1) {
        await context.send(session.text(".only_one_preset"));
        return 1 /* STOP */;
      }
    } catch (e) {
      logger11.error(e);
      await context.send(session.text(".not_found"));
      return 1 /* STOP */;
    }
    await context.send(session.text(".confirm_delete", [presetName]));
    const result = await session.prompt(1e3 * 30);
    if (!result) {
      context.message = session.text(".timeout", [presetName]);
      return 1 /* STOP */;
    }
    if (result !== "Y") {
      context.message = session.text(".cancelled", [presetName]);
      return 1 /* STOP */;
    }
    await import_promises3.default.rm(presetTemplate.path);
    let defaultPreset;
    try {
      defaultPreset = preset.getDefaultPreset().value;
      if (!defaultPreset || !defaultPreset.triggerKeyword?.length) {
        throw new Error("Default preset is invalid");
      }
    } catch (e) {
      logger11.error("Failed to get default preset:", e);
      await context.send(session.text(".failed_to_get_default"));
      return 1 /* STOP */;
    }
    const roomList = await ctx.database.get("chathub_room", {
      preset: presetName
    });
    for (const room of roomList) {
      room.preset = defaultPreset.triggerKeyword[0];
    }
    await ctx.database.upsert("chathub_room", roomList);
    context.message = session.text(".success", [presetName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply44, "apply");

// src/middlewares/preset/list_all_preset.ts
var import_pagination7 = require("koishi-plugin-chatluna/utils/pagination");
function apply45(ctx, config, chain) {
  const pagination = new import_pagination7.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => value, "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_all_preset", async (session, context) => {
    const {
      command: command2,
      options: { page, limit }
    } = context;
    const preset = ctx.chatluna.preset;
    if (command2 !== "list_preset")
      return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    pagination.updateFormatItem(
      (value) => formatPreset(ctx, session, value)
    );
    const presets = preset.getAllPreset(false).value;
    await pagination.push(presets);
    context.message = await pagination.getFormattedPage(page, limit);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply45, "apply");
async function formatPreset(ctx, session, presetName) {
  const buffer = [];
  const preset = ctx.chatluna.preset.getPreset(presetName).value;
  const previewContent = preset.messages.map((value) => value.content).join("\n\n").substring(0, 130).concat("......");
  buffer.push(
    session.text(".preset_keyword", [preset.triggerKeyword.join(", ")])
  );
  buffer.push(session.text(".preset_content", [previewContent]));
  return buffer.join("\n");
}
__name(formatPreset, "formatPreset");

// src/middlewares/preset/set_preset.ts
var import_promises4 = __toESM(require("fs/promises"), 1);
var import_js_yaml3 = require("js-yaml");
function apply46(ctx, config, chain) {
  chain.middleware("set_preset", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "set_preset") {
      return 0 /* SKIPPED */;
    }
    const presetName = context.options.setPreset;
    const presetService = ctx.chatluna.preset;
    const preset = presetService.getPreset(presetName, false).value;
    if (!preset) {
      await context.send(session.text(".not_found"));
      return 1 /* STOP */;
    }
    if (preset.messages.length > 1) {
      await context.send(session.text(".not_support", [presetName]));
      return 1 /* STOP */;
    }
    await context.send(session.text(".enter_content"));
    const result = await session.prompt(1e3 * 30);
    if (!result) {
      await context.send(session.text(".timeout"));
      return 1 /* STOP */;
    }
    const presetObject = (0, import_js_yaml3.load)(preset.rawText);
    presetObject.prompts[0].content = result;
    await import_promises4.default.writeFile(preset.path, (0, import_js_yaml3.dump)(presetObject));
    await context.send(session.text(".success", [presetName]));
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply46, "apply");

// src/middlewares/room/check_room.ts
function apply47(ctx, config, chain) {
  chain.middleware("check_room", async (session, context) => {
    let room = context.options.room;
    let rooms = await getAllJoinedConversationRoom(ctx, session);
    if (room != null && !rooms.some(
      (searchRoom) => searchRoom.roomName === room.roomName || searchRoom.roomId === room.roomId
    )) {
      try {
        await joinConversationRoom(ctx, session, room);
        rooms = await getAllJoinedConversationRoom(ctx, session);
      } catch (e) {
      }
    }
    if (room == null && rooms.length > 0) {
      room = rooms[Math.floor(Math.random() * rooms.length)];
      await switchConversationRoom(ctx, session, room.roomId);
      await context.send(
        session.text("chatluna.room.random_switch", [room.roomName])
      );
    } else if (room == null && rooms.length === 0) {
      if ((context.command?.length ?? 0) > 1) {
        return 2 /* CONTINUE */;
      }
      context.message = session.text("chatluna.room.not_joined");
      return 1 /* STOP */;
    } else if (!rooms.some(
      (searchRoom) => searchRoom.roomName === room.roomName || searchRoom.roomId === room.roomId
    )) {
      try {
        await leaveConversationRoom(ctx, session, room);
      } catch (e) {
      }
      context.message = session.text("chatluna.room.not_in_room", [
        room.roomName
      ]);
      return 1 /* STOP */;
    }
    const user = await getConversationRoomUser(ctx, session, room);
    if (user?.mute === true) {
      context.message = session.text("chatluna.room.muted", [
        room.roomName
      ]);
      return 1 /* STOP */;
    }
    context.options.room = room;
    return 2 /* CONTINUE */;
  }).before("request_model").after("resolve_room");
}
__name(apply47, "apply");

// src/middlewares/room/clear_room.ts
function apply48(ctx, config, chain) {
  chain.middleware("clear_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "clear_room")
      return 0 /* SKIPPED */;
    let targetRoom = context.options.room;
    if (targetRoom == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      targetRoom = rooms.find(
        (room) => room.roomName === context.options.room_resolve?.name || room.roomId === roomId
      );
    }
    if (targetRoom == null) {
      context.message = session.text(".no-room");
      return 1 /* STOP */;
    }
    await ctx.chatluna.clearChatHistory(targetRoom);
    context.message = session.text(".success", [targetRoom.roomName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply48, "apply");

// src/middlewares/room/compress_room.ts
function apply49(ctx, config, chain) {
  chain.middleware("compress_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "compress_room")
      return 0 /* SKIPPED */;
    let targetRoom = context.options.room;
    if (targetRoom == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      targetRoom = rooms.find(
        (room) => room.roomName === context.options.room_resolve?.name || room.roomId === roomId
      );
    }
    if (targetRoom == null) {
      const key = context.options.i18n_base ?? "commands.chatluna.room.compress.messages";
      context.message = session.text(`${key}.no_room`);
      return 1 /* STOP */;
    }
    try {
      const key = context.options.i18n_base ?? "commands.chatluna.room.compress.messages";
      const result = await ctx.chatluna.compressContext(
        targetRoom,
        context.options.force === true
      );
      const args = [
        result.inputTokens,
        result.outputTokens,
        result.reducedPercent.toFixed(2)
      ];
      context.message = session.text(
        result.compressed ? `${key}.success` : `${key}.skipped`,
        args
      );
    } catch (error) {
      ctx.logger.error(error);
      const key = context.options.i18n_base ?? "commands.chatluna.room.compress.messages";
      context.message = session.text(`${key}.failed`, [
        targetRoom.roomName,
        error.message
      ]);
    }
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply49, "apply");

// src/middlewares/room/create_room.ts
var import_crypto6 = require("crypto");
var import_types11 = require("koishi-plugin-chatluna/llm-core/platform/types");
function apply50(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  chain.middleware("create_room", async (session, context) => {
    const {
      command: command2,
      options: { room_resolve: roomResolve }
    } = context;
    if (command2 !== "create_room")
      return 0 /* SKIPPED */;
    if (!roomResolve) return 0 /* SKIPPED */;
    let { model, preset, name: name2, chatMode, password, visibility } = roomResolve;
    if (Object.values(roomResolve).filter((value) => value != null).length > 0 && visibility !== "template") {
      await context.send(session.text(".confirm_create"));
      const result = await session.prompt(1e3 * 30);
      if (result == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      }
      if (result === "Y") {
        roomResolve.preset = roomResolve.preset ?? config.defaultPreset;
        roomResolve.name = roomResolve.name ?? "Unnamed Room";
        roomResolve.chatMode = roomResolve.chatMode ?? config.defaultChatMode;
        roomResolve.password = roomResolve.password ?? null;
        roomResolve.visibility = roomResolve.visibility ?? "private";
        roomResolve.model = roomResolve.model ?? config.defaultModel;
        await createRoom(ctx, context, session, context.options);
        return 1 /* STOP */;
      } else if (result !== "N") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      }
    }
    const allModel = service.listAllModels(import_types11.ModelType.llm);
    if (name2 == null) {
      await context.send(session.text(".enter_name"));
      const result = await session.prompt(1e3 * 30);
      if (result == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      }
      name2 = result.trim();
      roomResolve.name = name2;
    } else {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".action.input"),
          session.text(".field.name"),
          name2
        ])
      );
      const result = await session.prompt(1e3 * 30);
      if (result == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      } else if (result !== "N") {
        name2 = result.trim();
        roomResolve.name = name2;
      }
    }
    while (true) {
      let preModel = model;
      if (preModel == null) {
        await context.send(session.text(".enter_model"));
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        }
        preModel = result.trim();
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.select"),
            session.text(".field.model"),
            preModel
          ])
        );
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result !== "N") {
          preModel = result.trim();
        }
      }
      const findModel = allModel.value.find(
        (searchModel) => searchModel.toModelName() === preModel || searchModel.name === preModel
      );
      if (findModel == null) {
        await context.send(
          session.text(".model_not_found", [preModel])
        );
        preModel = null;
        roomResolve.model = null;
        continue;
      } else {
        model = preModel;
        roomResolve.model = model;
        break;
      }
    }
    const presetInstance = ctx.chatluna.preset;
    while (true) {
      let prePreset = preset;
      if (preset == null) {
        await context.send(session.text(".enter_preset"));
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result === "N") {
          prePreset = "chatgpt";
        } else {
          prePreset = result.trim();
        }
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.select"),
            session.text(".field.preset"),
            prePreset
          ])
        );
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result !== "N") {
          prePreset = result.trim();
        }
      }
      try {
        await presetInstance.getPreset(prePreset);
        preset = prePreset;
        roomResolve.preset = preset;
        break;
      } catch {
        await context.send(
          session.text(".preset_not_found", [prePreset])
        );
        roomResolve.preset = null;
        continue;
      }
    }
    while (true) {
      if (visibility == null) {
        await context.send(session.text(".enter_visibility"));
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result === "N") {
          roomResolve.visibility = "private";
        } else {
          roomResolve.visibility = result.trim();
        }
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".action.select"),
            session.text(".field.visibility"),
            visibility
          ])
        );
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result !== "N") {
          roomResolve.visibility = result.trim();
        }
      }
      visibility = roomResolve.visibility;
      if (visibility === "private" || visibility === "public") {
        break;
      }
      await context.send(
        session.text(".visibility_not_recognized", [visibility])
      );
    }
    while (true) {
      if (chatMode == null) {
        await context.send(session.text(".enter_chat_mode"));
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result === "N") {
          roomResolve.chatMode = "chat";
        } else {
          roomResolve.chatMode = result.trim();
        }
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".field.chat_mode"),
            chatMode
          ])
        );
        const result = await session.prompt(1e3 * 30);
        if (result == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result !== "N") {
          roomResolve.chatMode = result.trim();
        }
      }
      chatMode = roomResolve.chatMode;
      const availableChatModes = ctx.chatluna.platform.chatChains.value.map(
        (chain2) => chain2.name
      );
      if (availableChatModes.includes(chatMode)) {
        break;
      }
      await context.send(
        session.text(".invalid_chat_mode", [
          chatMode,
          availableChatModes.join(", ")
        ])
      );
    }
    if (session.isDirect && visibility === "private" && password == null) {
      await context.send(session.text(".enter_password"));
      const result = await session.prompt(1e3 * 30);
      if (result == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      } else if (result === "N") {
        roomResolve.password = null;
      } else {
        roomResolve.password = result.trim();
      }
    }
    await createRoom(ctx, context, session, context.options);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply50, "apply");
async function createRoom(ctx, context, session, options) {
  const { model, preset, name: name2, chatMode, password, visibility } = options.room_resolve;
  const createRoom2 = {
    conversationId: (0, import_crypto6.randomUUID)(),
    model,
    preset,
    roomName: name2 ?? "Unnamed Room",
    roomMasterId: session.userId,
    roomId: await getConversationRoomCount(ctx) + 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visibility,
    chatMode,
    password: password ?? null,
    updatedTime: /* @__PURE__ */ new Date()
  };
  await createConversationRoom(ctx, session, createRoom2);
  if (visibility === "template") {
    context.message = session.text(".template_room_created");
  } else {
    context.message = session.text(".room_created", [
      createRoom2.roomId,
      createRoom2.roomName
    ]);
  }
}
__name(createRoom, "createRoom");

// src/middlewares/room/delete_room.ts
function apply51(ctx, config, chain) {
  chain.middleware("delete_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "delete_room")
      return 0 /* SKIPPED */;
    let targetRoom = context.options.room;
    if (targetRoom == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      targetRoom = rooms.find(
        (room) => room.roomName === context.options.room_resolve?.name || room.roomId === roomId
      );
    }
    if (targetRoom == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (targetRoom.roomMasterId !== session.userId && !await checkAdmin(session)) {
      context.message = session.text(".not_room_master");
      return 1 /* STOP */;
    }
    await context.send(
      session.text(".confirm_delete", [targetRoom.roomName])
    );
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    } else if (result !== "Y") {
      context.message = session.text(".cancelled");
      return 1 /* STOP */;
    }
    await deleteConversationRoom(ctx, targetRoom);
    context.message = session.text(".success", [targetRoom.roomName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply51, "apply");

// src/middlewares/room/invite_room.ts
function apply52(ctx, config, chain) {
  chain.middleware("invite_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "invite_room")
      return 0 /* SKIPPED */;
    const targetRoom = context.options.room;
    if (targetRoom == null) {
      context.message = session.text(".no_room_specified");
      return 1 /* STOP */;
    }
    const userInfo = await getConversationRoomUser(
      ctx,
      session,
      targetRoom,
      session.userId
    );
    if (userInfo.roomPermission === "member" && !await checkAdmin(session)) {
      context.message = session.text(".not_admin", [
        targetRoom.roomName
      ]);
      return 1 /* STOP */;
    }
    const targetUser = context.options.resolve_user.id;
    for (const user of targetUser) {
      await joinConversationRoom(
        ctx,
        session,
        targetRoom,
        session.isDirect,
        user
      );
    }
    context.message = session.text(".success", [
      targetUser.join(","),
      targetRoom.roomName
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply52, "apply");

// src/middlewares/room/join_room.ts
function apply53(ctx, config, chain) {
  chain.middleware("join_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "join_room") return 0 /* SKIPPED */;
    const targetRoom = await queryConversationRoom(
      ctx,
      session,
      context.options.room_resolve.name
    );
    if (targetRoom == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (!session.isDirect && targetRoom.visibility === "public") {
      const roomInGroup = (await ctx.database.get("chathub_room_group_member", {
        groupId: session.guildId,
        roomId: targetRoom.roomId
      })).length === 1;
      if (!roomInGroup) {
        context.message = session.text(".not_in_group");
        return 1 /* STOP */;
      }
    }
    if (await checkAdmin(session)) {
    } else if (targetRoom.visibility === "private" && targetRoom.password == null) {
      context.message = session.text(".private_no_password");
      return 1 /* STOP */;
    } else if (targetRoom.visibility === "private" && targetRoom.password != null && !session.isDirect) {
      context.message = session.text(".private_group_join");
      return 1 /* STOP */;
    }
    if (targetRoom.password) {
      await context.send(
        session.text(".enter_password", [targetRoom.roomName])
      );
      const result = await session.prompt(1e3 * 30);
      if (result == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result !== targetRoom.password) {
        context.message = session.text(".wrong_password");
        return 1 /* STOP */;
      }
    }
    await joinConversationRoom(ctx, session, targetRoom);
    context.message = session.text(".success", [targetRoom.roomName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply53, "apply");

// src/middlewares/room/kick_member.ts
function apply54(ctx, config, chain) {
  chain.middleware("kick_member", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "kick_member")
      return 0 /* SKIPPED */;
    const targetRoom = context.options.room;
    if (targetRoom == null) {
      context.message = session.text(".no_room_specified");
      return 1 /* STOP */;
    }
    const userInfo = await getConversationRoomUser(
      ctx,
      session,
      targetRoom,
      session.userId
    );
    if (userInfo.roomPermission === "member" && !await checkAdmin(session)) {
      context.message = session.text(".not_admin", [
        targetRoom.roomName
      ]);
      return 1 /* STOP */;
    }
    const targetUser = context.options.resolve_user.id;
    for (const user of targetUser) {
      await kickUserFromConversationRoom(
        ctx,
        session,
        targetRoom,
        user
      );
    }
    context.message = session.text(".success", [
      targetRoom.roomName,
      targetUser.join(",")
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply54, "apply");

// src/middlewares/room/leave_room.ts
function apply55(ctx, config, chain) {
  chain.middleware("leave_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "leave_room")
      return 0 /* SKIPPED */;
    let targetRoom = context.options.room;
    if (targetRoom == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      targetRoom = rooms.find(
        (room) => room.roomName === context.options.room_resolve?.name || room.roomId === roomId
      );
    }
    if (targetRoom == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (targetRoom.roomMasterId === session.userId) {
      await context.send(session.text(".confirm_delete"));
      const result = await session.prompt(1e3 * 30);
      if (result == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result !== "Y") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      }
    }
    await leaveConversationRoom(ctx, session, targetRoom);
    if (targetRoom.roomMasterId === session.userId) {
      await deleteConversationRoom(ctx, targetRoom);
    }
    context.message = session.text(".success", [targetRoom.roomName]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply55, "apply");

// src/middlewares/room/list_room.ts
var import_pagination8 = require("koishi-plugin-chatluna/utils/pagination");
function apply56(ctx, config, chain) {
  const pagination = new import_pagination8.Pagination({
    formatItem: /* @__PURE__ */ __name((value) => "", "formatItem"),
    formatString: {
      top: "",
      bottom: "",
      pages: ""
    }
  });
  chain.middleware("list_room", async (session, context) => {
    const {
      command: command2,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      options: { page, limit, all_room }
    } = context;
    if (command2 !== "list_room") return 0 /* SKIPPED */;
    pagination.updateFormatString({
      top: session.text(".header") + "\n",
      bottom: "\n" + session.text(".footer"),
      pages: "\n" + session.text(".pages")
    });
    pagination.updateFormatItem(
      (value) => formatRoomInfo(ctx, session, value)
    );
    const rooms = await getAllJoinedConversationRoom(ctx, session);
    if (all_room) {
      const publicRooms = await queryPublicConversationRooms(
        ctx,
        session
      );
      for (const room of publicRooms) {
        if (!rooms.find((r) => r.roomId === room.roomId)) {
          rooms.push(
            await queryConversationRoom(
              ctx,
              session,
              room.roomId
            )
          );
        }
      }
    }
    const key = session.isDirect ? session.userId : session.guildId + "-" + session.userId;
    await pagination.push(rooms, key);
    context.message = await pagination.getFormattedPage(
      page,
      limit,
      key
    );
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply56, "apply");
async function formatRoomInfo(ctx, session, room) {
  const buffer = [];
  buffer.push(session.text(".room_name", [room.roomName]));
  buffer.push(session.text(".room_id", [room.roomId]));
  buffer.push(session.text(".room_preset", [room.preset]));
  buffer.push(
    session.text(".room_model", [
      room.model,
      await checkConversationRoomAvailability(ctx, room)
    ])
  );
  buffer.push(session.text(".room_visibility", [room.visibility]));
  buffer.push(
    session.text(".room_chat_mode", [
      room.chatMode
    ])
  );
  buffer.push(session.text(".room_master_id", [room.roomMasterId]));
  buffer.push(
    session.text(".room_availability", [
      await checkConversationRoomAvailability(ctx, room)
    ])
  );
  buffer.push("\n");
  return buffer.join("\n");
}
__name(formatRoomInfo, "formatRoomInfo");

// src/middlewares/room/resolve_room.ts
var import_koishi11 = require("koishi");
var import_logger7 = require("koishi-plugin-chatluna/utils/logger");
var import_types12 = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_crypto7 = require("crypto");
var logger12;
function apply57(ctx, config, chain) {
  logger12 = (0, import_logger7.createLogger)(ctx);
  const selectRoomForSession = /* @__PURE__ */ __name(async (session, joinedRooms) => pickContextualRoom(ctx, session, config, joinedRooms), "selectRoomForSession");
  chain.middleware("resolve_room", async (session, context) => {
    let joinRoom = await queryJoinedConversationRoom(
      ctx,
      session,
      context.options?.room_resolve?.name
    );
    if (config.allowChatWithRoomName) {
      const needContinue = context.command == null;
      const rawMessageContent = context.message;
      const messageContent = typeof rawMessageContent === "string" ? rawMessageContent : import_koishi11.h.select(rawMessageContent, "text").join("").trimStart();
      const splitContent = messageContent.split(" ");
      let matchedRoom;
      if (splitContent.length > 1) {
        matchedRoom = await queryJoinedConversationRoom(
          ctx,
          session,
          splitContent.shift()
        );
      }
      if (matchedRoom == null || !needContinue) {
        return 1 /* STOP */;
      }
      if (matchedRoom != null) {
        joinRoom = matchedRoom;
        context.options.inputMessage = await ctx.chatluna.messageTransformer.transform(
          session,
          [import_koishi11.h.text(splitContent.concat(" "))],
          matchedRoom.model,
          void 0,
          {
            quote: false,
            includeQuoteReply: config.includeQuoteReply
          }
        );
      }
    }
    if (joinRoom == null) {
      const joinedRooms = await getAllJoinedConversationRoom(
        ctx,
        session
      );
      if (joinedRooms.length > 0) {
        joinRoom = await selectRoomForSession(session, joinedRooms);
      }
      if (joinRoom != null) {
        await switchConversationRoom(ctx, session, joinRoom.roomId);
        logger12.success(
          session.text("chatluna.room.auto_switch", [
            session.userId,
            joinRoom.roomName
          ])
        );
      }
    }
    if (joinRoom == null && config.autoCreateRoomFromUser !== true && !session.isDirect && (context.command?.length ?? 0) < 1) {
      joinRoom = await queryPublicConversationRoom(ctx, session);
      if (joinRoom != null) {
        logger12.success(
          session.text("chatluna.room.auto_switch", [
            session.userId,
            joinRoom.roomName
          ])
        );
      }
    }
    if (joinRoom == null && (context.command?.length ?? 0) < 1) {
      if ((config.defaultModel === "无" || (config.defaultModel?.trim()?.length || 0) < 1) && ctx.chatluna.platform.listAllModels(import_types12.ModelType.llm).value.length < 1) {
        return session.text("chatluna.not_available_model");
      }
      const templateRoom = await getTemplateConversationRoom(
        ctx,
        config
      );
      if (templateRoom == null) {
        return 0 /* SKIPPED */;
      }
      const cloneRoom = structuredClone(templateRoom);
      cloneRoom.conversationId = (0, import_crypto7.randomUUID)();
      if (config.autoCreateRoomFromUser || session.isDirect) {
        cloneRoom.roomMasterId = session.userId;
        cloneRoom.visibility = "private";
        cloneRoom.roomId = await getConversationRoomCount(ctx) + 1;
        cloneRoom.roomName = session.text(
          "chatluna.room.room_name",
          [
            session.isDirect ? `${session.username ?? session.userId}` : `${session.event.guild.name ?? session.username ?? session.event.guild.id.toString()}`
          ]
        );
        logger12.success(
          session.text("chatluna.room.auto_create", [
            session.userId,
            cloneRoom.roomName
          ])
        );
      } else {
        cloneRoom.roomMasterId = session.userId;
        cloneRoom.visibility = "template_clone";
        cloneRoom.roomId = await getConversationRoomCount(ctx) + 1;
        cloneRoom.roomName = session.text(
          "chatluna.room.template_clone_room_name",
          [
            session.isDirect ? `${session.username ?? session.userId}` : `${session.event.guild.name ?? session.username ?? session.event.guild.id.toString()}`
          ]
        );
        logger12.success(
          session.text("chatluna.room.auto_create_template", [
            session.userId,
            cloneRoom.roomName
          ])
        );
      }
      cloneRoom.autoUpdate = config.autoUpdateRoomMode !== "disable" || cloneRoom.visibility === "template_clone";
      await createConversationRoom(ctx, session, cloneRoom);
      joinRoom = cloneRoom;
    }
    if (joinRoom != null && joinRoom.autoUpdate !== true && config.autoUpdateRoomMode === "all") {
      joinRoom.autoUpdate = true;
    }
    if (joinRoom?.autoUpdate === true) {
      let needUpdate = false;
      if (joinRoom.preset !== config.defaultPreset || joinRoom.chatMode !== config.defaultChatMode || joinRoom.model !== config.defaultModel) {
        needUpdate = true;
      }
      joinRoom.model = config.defaultModel;
      joinRoom.preset = config.defaultPreset;
      joinRoom.chatMode = config.defaultChatMode;
      if (joinRoom.preset !== config.defaultPreset) {
        logger12.debug(
          `The room ${joinRoom.roomName} preset changed to ${joinRoom.preset}. Clearing chat history.`
        );
        await ctx.chatluna.clearChatHistory(joinRoom);
      }
      if (needUpdate) {
        await ctx.chatluna.clearCache(joinRoom);
        await ctx.database.upsert("chathub_room", [joinRoom]);
        logger12.debug(
          session.text("chatluna.room.config_changed", [
            joinRoom.roomName
          ])
        );
      }
    }
    context.options.room = joinRoom;
    return 2 /* CONTINUE */;
  }).after("lifecycle-prepare");
}
__name(apply57, "apply");
async function pickContextualRoom(ctx, session, config, joinedRooms) {
  if (joinedRooms.length === 0) {
    return void 0;
  }
  if (!session.isDirect && config.autoCreateRoomFromUser !== true) {
    const groupRooms = await ctx.database.get("chathub_room_group_member", {
      groupId: session.guildId,
      roomId: { $in: joinedRooms.map((room) => room.roomId) }
    });
    if (groupRooms.length > 0) {
      const scopedRoomIds = new Set(groupRooms.map((room) => room.roomId));
      const findScopedRoom = /* @__PURE__ */ __name((matcher) => joinedRooms.find((room) => {
        if (!scopedRoomIds.has(room.roomId)) {
          return false;
        }
        return matcher ? matcher(room) : true;
      }), "findScopedRoom");
      return findScopedRoom(
        (room) => room.visibility === "template_clone"
      ) ?? findScopedRoom();
    }
    return void 0;
  }
  return joinedRooms.find(
    (room) => room.visibility === "private" && room.roomMasterId === session.userId
  ) ?? joinedRooms.find((room) => room.visibility === "private") ?? joinedRooms.find((room) => room.visibility !== "template_clone") ?? joinedRooms[0];
}
__name(pickContextualRoom, "pickContextualRoom");

// src/middlewares/room/room_info.ts
function apply58(ctx, config, chain) {
  chain.middleware("room_info", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "room_info") return 0 /* SKIPPED */;
    let room = context.options.room;
    if (room == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      room = rooms.find(
        (room2) => room2.roomName === context.options.room_resolve?.name || room2.roomId === roomId
      );
    }
    if (room == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    const buffer = [session.text(".header") + "\n"];
    buffer.push(session.text(".room_name", [room.roomName]));
    buffer.push(session.text(".room_id", [room.roomId]));
    buffer.push(session.text(".room_preset", [room.preset]));
    buffer.push(
      session.text(".room_model", [
        room.model,
        await checkConversationRoomAvailability(ctx, room)
      ])
    );
    buffer.push(session.text(".room_visibility", [room.visibility]));
    buffer.push(
      session.text(".room_chat_mode", [
        room.chatMode
      ])
    );
    buffer.push(session.text(".room_master_id", [room.roomMasterId]));
    context.message = buffer.join("\n");
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply58, "apply");

// src/middlewares/room/room_permission.ts
function apply59(ctx, config, chain) {
  chain.middleware("room_permission", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "room_permission")
      return 0 /* SKIPPED */;
    let targetRoom = context.options.room;
    if (targetRoom == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      targetRoom = rooms.find(
        (room) => room.roomName === context.options.room_resolve?.name || room.roomId === roomId
      );
    }
    if (targetRoom == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (targetRoom.roomMasterId !== session.userId && !await checkAdmin(session)) {
      context.message = session.text(".not_admin");
      return 1 /* STOP */;
    }
    const user = context.options.resolve_user.id;
    await context.send(
      session.text(".confirm_set", [user, targetRoom.roomName])
    );
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    } else if (["admin", "member", "a", "m"].every(
      (text) => result.toLowerCase() !== text
    )) {
      context.message = session.text(".invalid_permission");
      return 1 /* STOP */;
    }
    const currentPermission = result.startsWith("a") ? "admin" : "member";
    await setUserPermission(
      ctx,
      session,
      targetRoom,
      currentPermission,
      user
    );
    context.message = session.text(".success", [
      user,
      targetRoom.roomName,
      currentPermission
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply59, "apply");

// src/middlewares/room/set_auto_update_room.ts
function apply60(ctx, config, chain) {
  chain.middleware("set_auto_update_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "set_auto_update_room")
      return 0 /* SKIPPED */;
    let { room: targetRoom, auto_update_room: autoUpdateRoom } = context.options;
    if (targetRoom == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      targetRoom = rooms.find(
        (room) => room.roomName === context.options.room_resolve?.name || room.roomId === roomId
      );
    }
    if (targetRoom == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (targetRoom.roomMasterId !== session.userId && !await checkAdmin(session)) {
      context.message = session.text(".not_admin");
      return 1 /* STOP */;
    }
    targetRoom.autoUpdate = context.options.auto_update_room;
    await ctx.database.upsert("chathub_room", [targetRoom]);
    context.message = session.text(".success", [
      targetRoom.roomName,
      autoUpdateRoom
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply60, "apply");

// src/middlewares/room/set_room.ts
var import_types13 = require("koishi-plugin-chatluna/llm-core/platform/types");
function apply61(ctx, config, chain) {
  const service = ctx.chatluna.platform;
  chain.middleware("set_room", async (session, context) => {
    let {
      command: command2,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      options: { room_resolve, room }
    } = context;
    if (command2 !== "set_room") return 0 /* SKIPPED */;
    if (room == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      room = rooms.find(
        (room2) => room2.roomName === context.options.room_resolve?.name || room2.roomId === roomId
      );
    }
    if (room == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (room.roomMasterId !== session.userId && !await checkAdmin(session)) {
      context.message = session.text(".not_room_master");
      return 1 /* STOP */;
    }
    const oldPreset = room.preset;
    if (Object.values(room_resolve).filter((value) => value != null).length > 0 && room_resolve.visibility !== "template") {
      await context.send(session.text(".confirm_update"));
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      }
      if (result2 === "Y") {
        if ((!session.isDirect || room.visibility !== "private") && room_resolve.password != null) {
          context.message = session.text(".no_password_in_public");
          return 1 /* STOP */;
        }
        room.preset = room_resolve.preset ?? room.preset;
        room.roomName = room_resolve.name ?? room.roomName;
        room.chatMode = room_resolve.chatMode ?? room.chatMode;
        room.password = room_resolve.password ?? room.password;
        room.visibility = room_resolve.visibility ?? room.visibility;
        room.model = room_resolve.model ?? room.model;
        if (!await checkRoomAvailability(
          context,
          session,
          ctx,
          room
        )) {
          context.message = session.text(".failed", [
            room.roomName
          ]);
          return 1 /* STOP */;
        }
        await ctx.database.upsert("chathub_room", [room]);
        if (room.preset !== oldPreset) {
          await ctx.chatluna.clearChatHistory(room);
          context.message = session.text(".success_with_clear", [
            room.roomName
          ]);
        } else {
          await ctx.chatluna.clearCache(room);
          context.message = session.text(".success", [
            room.roomName
          ]);
        }
        return 1 /* STOP */;
      } else if (result2 !== "N") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      }
    }
    let {
      model,
      preset,
      roomName: name2,
      chatMode,
      password,
      visibility
    } = room;
    await context.send(
      session.text(".change_or_keep", [
        session.text(".field.name"),
        name2
      ])
    );
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    } else if (result === "Q") {
      context.message = session.text(".cancelled");
      return 1 /* STOP */;
    } else if (result !== "N") {
      name2 = result.trim();
      room.roomName = name2;
    }
    while (true) {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".field.model"),
          model
        ])
      );
      const result2 = (await session.prompt(1e3 * 30))?.trim();
      if (!result2) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        break;
      }
      const findModel = service.listAllModels(import_types13.ModelType.llm).value.find(
        (searchModel) => searchModel.toModelName() === result2
      );
      if (findModel == null) {
        await context.send(
          session.text(".model_not_found", [result2])
        );
        continue;
      }
      model = result2;
      room.model = model;
      break;
    }
    const presetInstance = ctx.chatluna.preset;
    while (true) {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".field.preset"),
          preset
        ])
      );
      const result2 = (await session.prompt(1e3 * 30))?.trim();
      if (!result2) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        break;
      }
      try {
        await presetInstance.getPreset(result2);
        room.preset = preset = result2;
        break;
      } catch (e) {
        await context.send(
          session.text(".preset_not_found", [result2])
        );
        continue;
      }
    }
    while (true) {
      await context.send(
        session.text(".change_or_keep", [
          session.text(".field.visibility"),
          visibility
        ])
      );
      const result2 = (await session.prompt(1e3 * 30))?.trim();
      if (!result2) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        break;
      }
      if (result2 === "private" || result2 === "public") {
        visibility = room.visibility = result2;
        break;
      }
      await context.send(
        session.text(".invalid_visibility", [result2])
      );
    }
    while (true) {
      if (chatMode == null) {
        await context.send(session.text(".enter_chat_mode"));
        const result2 = await session.prompt(1e3 * 30);
        if (result2 == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result2 === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result2 === "N") {
          room.chatMode = "chat";
        } else {
          room.chatMode = result2.trim();
        }
      } else {
        await context.send(
          session.text(".change_or_keep", [
            session.text(".field.chat_mode"),
            chatMode
          ])
        );
        const result2 = await session.prompt(1e3 * 30);
        if (result2 == null) {
          context.message = session.text(".timeout");
          return 1 /* STOP */;
        } else if (result2 === "Q") {
          context.message = session.text(".cancelled");
          return 1 /* STOP */;
        } else if (result2 !== "N") {
          room.chatMode = result2.trim();
        }
      }
      chatMode = room.chatMode;
      const availableChatModes = ctx.chatluna.platform.chatChains.value.map(
        (chain2) => chain2.name
      );
      if (availableChatModes.includes(chatMode)) {
        break;
      }
      await context.send(
        session.text(".invalid_chat_mode", [
          visibility,
          availableChatModes.join(", ")
        ])
      );
    }
    if (session.isDirect && visibility === "private" && password == null) {
      await context.send(session.text(".enter_password"));
      const result2 = await session.prompt(1e3 * 30);
      if (result2 == null) {
        context.message = session.text(".timeout");
        return 1 /* STOP */;
      } else if (result2 === "Q") {
        context.message = session.text(".cancelled");
        return 1 /* STOP */;
      } else if (result2 === "N") {
        room.password = null;
      } else {
        room.password = result2.trim();
      }
    }
    await ctx.database.upsert("chathub_room", [room]);
    if (room.preset !== oldPreset) {
      await ctx.chatluna.clearChatHistory(room);
      context.message = session.text(".success_with_clear", [
        room.roomName
      ]);
    } else {
      await ctx.chatluna.clearCache(room);
      context.message = session.text(".success", [room.roomName]);
    }
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply61, "apply");
async function checkRoomAvailability(context, session, ctx, room) {
  const availableChatModes = ctx.chatluna.platform.chatChains.value.map(
    (chain) => chain.name
  );
  if (!availableChatModes.includes(room.chatMode)) {
    await context.send(
      session.text(".invalid_chat_mode", [
        room.chatMode,
        availableChatModes.join(", ")
      ])
    );
    return false;
  }
  const findModel = ctx.chatluna.platform.listAllModels(import_types13.ModelType.llm).value.find((searchModel) => searchModel.toModelName() === room.model);
  if (findModel == null) {
    await context.send(session.text(".model_not_found", [room.model]));
    return false;
  }
  try {
    await ctx.chatluna.preset.getPreset(room.preset);
  } catch (e) {
    await context.send(session.text(".preset_not_found", [room.preset]));
    return false;
  }
  const visibility = room.visibility;
  if (visibility === "private" || visibility === "public") {
    return true;
  }
  await context.send(session.text(".invalid_visibility", [visibility]));
}
__name(checkRoomAvailability, "checkRoomAvailability");

// src/middlewares/room/switch_room.ts
function apply62(ctx, config, chain) {
  chain.middleware("switch_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "switch_room")
      return 0 /* SKIPPED */;
    const targetConversationRoom = await switchConversationRoom(
      ctx,
      session,
      context.options.room_resolve?.name
    );
    if (!targetConversationRoom) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    context.message = session.text(".success", [
      targetConversationRoom.roomName
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply62, "apply");

// src/middlewares/room/transfer_room.ts
function apply63(ctx, config, chain) {
  chain.middleware("transfer_room", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "transfer_room")
      return 0 /* SKIPPED */;
    let room = context.options.room;
    if (room == null && context.options.room_resolve != null) {
      const rooms = await getAllJoinedConversationRoom(
        ctx,
        session,
        true
      );
      const roomId = parseInt(context.options.room_resolve?.name);
      room = rooms.find(
        (room2) => room2.roomName === context.options.room_resolve?.name || room2.roomId === roomId
      );
    }
    if (room == null) {
      context.message = session.text(".room_not_found");
      return 1 /* STOP */;
    }
    if (room.roomMasterId !== session.userId && !await checkAdmin(session)) {
      context.message = session.text(".not_room_master");
      return 1 /* STOP */;
    }
    const targetUser = context.options.resolve_user.id;
    await context.send(
      session.text(".confirm_transfer", [room.roomName, targetUser])
    );
    const result = await session.prompt(1e3 * 30);
    if (result == null) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    } else if (result !== "Y") {
      context.message = session.text(".cancelled");
      return 1 /* STOP */;
    }
    await transferConversationRoom(ctx, session, room, targetUser);
    context.message = session.text(".success", [
      room.roomName,
      targetUser
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply63, "apply");

// src/middlewares/system/clear_balance.ts
function apply64(ctx, config, chain) {
  chain.middleware("clear_balance", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "clear_balance")
      return 0 /* SKIPPED */;
    const { authUser: userId } = context.options;
    const service = ctx.chatluna_auth;
    const modifiedBalance = await service.setBalance(session, 0, userId);
    context.message = session.text(".success", [
      userId,
      modifiedBalance
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply64, "apply");

// src/middlewares/system/query_balance.ts
function apply65(ctx, config, chain) {
  chain.middleware("query_balance", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "query_balance")
      return 0 /* SKIPPED */;
    const { authUser: userId } = context.options;
    const service = ctx.chatluna_auth;
    const user = await service.getUser(session, userId);
    context.message = session.text(".success", [userId, user.balance]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply65, "apply");

// src/middlewares/system/restart.ts
function apply66(ctx, config, chain) {
  chain.middleware("restart", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "restart") return 0 /* SKIPPED */;
    const appContext = ctx.scope.parent;
    appContext.scope.update(appContext.config, true);
    context.message = session.text(".success");
    return 1 /* STOP */;
  }).before("black_list");
}
__name(apply66, "apply");

// src/middlewares/system/set_balance.ts
function apply67(ctx, config, chain) {
  chain.middleware("set_balance", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "set_balance")
      return 0 /* SKIPPED */;
    const { authUser: userId, balance } = context.options;
    const service = ctx.chatluna_auth;
    const modifiedBalance = await service.setBalance(
      session,
      balance,
      userId
    );
    context.message = session.text(".success", [
      userId,
      modifiedBalance
    ]);
    return 1 /* STOP */;
  }).after("lifecycle-handle_command").before("lifecycle-request_model");
}
__name(apply67, "apply");

// src/middlewares/system/wipe.ts
var import_logger8 = require("koishi-plugin-chatluna/utils/logger");
var import_promises5 = __toESM(require("fs/promises"), 1);
var logger13;
function apply68(ctx, config, chain) {
  logger13 = (0, import_logger8.createLogger)(ctx);
  chain.middleware("wipe", async (session, context) => {
    const { command: command2 } = context;
    if (command2 !== "wipe") return 0 /* SKIPPED */;
    const expression = generateExpression();
    await context.send(
      session.text(".confirm_wipe", [expression.expression])
    );
    const result = await session.prompt(1e3 * 30);
    if (!result) {
      context.message = session.text(".timeout");
      return 1 /* STOP */;
    }
    if (result !== expression.result.toString()) {
      context.message = session.text(".incorrect_input");
      return 1 /* STOP */;
    }
    await ctx.database.drop("chathub_room_member");
    await ctx.database.drop("chathub_conversation");
    await ctx.database.drop("chathub_message");
    await ctx.database.drop("chathub_room");
    await ctx.database.drop("chathub_room_group_member");
    await ctx.database.drop("chathub_user");
    await ctx.database.drop("chathub_auth_group");
    await ctx.database.drop("chathub_auth_joined_user");
    await ctx.database.drop("chathub_auth_user");
    await ctx.database.drop("chatluna_docstore");
    try {
      await ctx.database.drop("chathub_knowledge");
    } catch (e) {
      logger13.warn(`wipe: ${e}`);
    }
    await ctx.chatluna.cache.clear("chatluna/chat_limit");
    await ctx.chatluna.cache.clear("chatluna/keys");
    try {
      await import_promises5.default.rm("data/chathub/vector_store", { recursive: true });
    } catch (e) {
      logger13.warn(`wipe: ${e}`);
    }
    try {
      await import_promises5.default.rm("data/chatluna/temp", { recursive: true });
    } catch (e) {
      logger13.warn(`wipe: ${e}`);
    }
    context.message = session.text(".success");
    const appContext = ctx.scope.parent;
    appContext.scope.update(appContext.config, true);
    return 1 /* STOP */;
  }).before("black_list");
}
__name(apply68, "apply");
function generateExpression() {
  const operators = ["+", "-", "*"];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const a = Math.floor(Math.random() * 1e3);
  const b = Math.floor(Math.random() * 1e3);
  let result;
  switch (operator) {
    case "+":
      result = a + b;
      break;
    case "-":
      result = a - b;
      break;
    case "*":
      result = a * b;
      break;
    default:
      result = 0;
  }
  return {
    expression: `${a}${operator}${b}`,
    result
  };
}
__name(generateExpression, "generateExpression");

// src/middleware.ts
async function middleware(ctx, config) {
  const middlewares = (
    // middleware start
    [
      apply13,
      apply14,
      apply15,
      apply16,
      apply17,
      apply18,
      apply19,
      apply20,
      apply21,
      apply22,
      apply23,
      apply24,
      apply25,
      apply26,
      apply27,
      apply28,
      apply30,
      apply31,
      apply32,
      apply33,
      apply34,
      apply35,
      apply36,
      apply29,
      apply37,
      apply38,
      apply39,
      apply40,
      apply41,
      apply42,
      apply43,
      apply44,
      apply45,
      apply46,
      apply47,
      apply48,
      apply49,
      apply50,
      apply51,
      apply52,
      apply53,
      apply54,
      apply55,
      apply56,
      apply57,
      apply58,
      apply59,
      apply60,
      apply61,
      apply62,
      apply63,
      apply64,
      apply12,
      apply65,
      apply66,
      apply67,
      apply68
    ]
  );
  for (const middleware2 of middlewares) {
    await middleware2(ctx, config, ctx.chatluna.chatChain);
  }
}
__name(middleware, "middleware");

// src/services/types.ts
var types_exports = {};
__reExport(types_exports, require("@chatluna/shared-prompt-renderer"));

// src/index.ts
var import_chains2 = require("koishi-plugin-chatluna/chains");

// src/config.ts
var import_koishi12 = require("koishi");
var Config2 = import_koishi12.Schema.intersect([
  import_koishi12.Schema.object({
    botNames: import_koishi12.Schema.array(import_koishi12.Schema.string()).default(["香草"]),
    isNickname: import_koishi12.Schema.boolean().default(true),
    isNickNameWithContent: import_koishi12.Schema.boolean().default(false)
  }),
  import_koishi12.Schema.object({
    allowPrivate: import_koishi12.Schema.boolean().default(true),
    allowAtReply: import_koishi12.Schema.boolean().default(true),
    allowQuoteReply: import_koishi12.Schema.boolean().default(false),
    privateChatWithoutCommand: import_koishi12.Schema.boolean().default(true),
    allowChatWithRoomName: import_koishi12.Schema.boolean().default(false),
    includeQuoteReply: import_koishi12.Schema.boolean().default(true),
    randomReplyFrequency: import_koishi12.Schema.percent().min(0).max(1).step(0.01).default(0).computed(),
    attachForwardMsgIdToContext: import_koishi12.Schema.boolean().default(false)
  }),
  import_koishi12.Schema.intersect([
    import_koishi12.Schema.object({
      isForwardMsg: import_koishi12.Schema.boolean().default(false)
    }),
    import_koishi12.Schema.union([
      import_koishi12.Schema.object({
        isForwardMsg: import_koishi12.Schema.const(true).required(),
        forwardMsgMinLength: import_koishi12.Schema.number().min(0).max(400).step(1).default(0)
      }),
      import_koishi12.Schema.object({})
    ])
  ]),
  import_koishi12.Schema.intersect([
    import_koishi12.Schema.object({
      isReplyWithAt: import_koishi12.Schema.boolean().default(false)
    }),
    import_koishi12.Schema.union([
      import_koishi12.Schema.object({
        isReplyWithAt: import_koishi12.Schema.const(true).required(),
        replyQuoteThreshold: import_koishi12.Schema.number().min(0).max(600).step(1).default(0)
      }),
      import_koishi12.Schema.object({})
    ])
  ]),
  import_koishi12.Schema.object({
    sendThinkingMessage: import_koishi12.Schema.boolean().default(true),
    sendThinkingMessageTimeout: import_koishi12.Schema.number().default(15e3),
    msgCooldown: import_koishi12.Schema.number().min(0).max(3600).step(1).default(0),
    messageQueue: import_koishi12.Schema.boolean().default(true),
    messageQueueDelay: import_koishi12.Schema.number().min(0).max(60 * 30).default(0),
    showThoughtMessage: import_koishi12.Schema.boolean().default(false)
  }),
  import_koishi12.Schema.object({
    outputMode: import_koishi12.Schema.dynamic("output-mode").default("text"),
    splitMessage: import_koishi12.Schema.boolean().default(false),
    censor: import_koishi12.Schema.boolean().default(false),
    rawOnCensor: import_koishi12.Schema.boolean().default(false),
    streamResponse: import_koishi12.Schema.boolean().default(false)
  }),
  import_koishi12.Schema.object({
    blackList: import_koishi12.Schema.number().min(0).max(1).step(1).default(0).computed().default(0)
  }),
  import_koishi12.Schema.object({
    infiniteContext: import_koishi12.Schema.boolean().default(true),
    infiniteContextThreshold: import_koishi12.Schema.percent().min(0.5).max(0.95).step(0.01).default(0.85),
    autoDelete: import_koishi12.Schema.boolean().default(false),
    autoDeleteTimeout: import_koishi12.Schema.number().default(import_koishi12.Time.day * 10 / import_koishi12.Time.second).min(import_koishi12.Time.hour / import_koishi12.Time.second)
  }),
  import_koishi12.Schema.object({
    defaultEmbeddings: import_koishi12.Schema.dynamic("embeddings").default("无"),
    defaultVectorStore: import_koishi12.Schema.dynamic("vector-store").default("无")
  }),
  import_koishi12.Schema.object({
    autoCreateRoomFromUser: import_koishi12.Schema.boolean().default(false),
    defaultChatMode: import_koishi12.Schema.dynamic("chat-mode").default("plugin"),
    defaultModel: import_koishi12.Schema.dynamic("model").default("无"),
    defaultPreset: import_koishi12.Schema.dynamic("preset").default("sydney"),
    autoUpdateRoomMode: import_koishi12.Schema.union([
      import_koishi12.Schema.const("all"),
      import_koishi12.Schema.const("manual"),
      import_koishi12.Schema.const("disable")
    ]).default("manual")
  }),
  import_koishi12.Schema.object({
    authSystem: import_koishi12.Schema.boolean().experimental().hidden().default(false),
    isProxy: import_koishi12.Schema.boolean().default(false),
    voiceSpeakId: import_koishi12.Schema.number().default(0),
    isLog: import_koishi12.Schema.boolean().default(false)
  }),
  import_koishi12.Schema.union([
    import_koishi12.Schema.object({
      isProxy: import_koishi12.Schema.const(true).required(),
      proxyAddress: import_koishi12.Schema.string().default("")
    }),
    import_koishi12.Schema.object({})
  ]),
  import_koishi12.Schema.union([
    import_koishi12.Schema.object({
      authSystem: import_koishi12.Schema.const(true).required(),
      authUserDefaultGroup: import_koishi12.Schema.tuple([
        import_koishi12.Schema.number().default(0),
        import_koishi12.Schema.number().default(1),
        import_koishi12.Schema.string().default("guest")
      ]).computed().default([0, 1, "guest"])
    }),
    import_koishi12.Schema.object({})
  ])
]).i18n({
  "zh-CN": require_zh_CN_schema(),
  "en-US": require_en_US_schema()
});

// src/render.ts
var import_koishi20 = require("koishi");
var import_error7 = require("koishi-plugin-chatluna/utils/error");

// src/renders/default.ts
var Renderer = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  static {
    __name(this, "Renderer");
  }
};

// src/renders/text.ts
var import_koishi13 = require("koishi-plugin-chatluna/utils/koishi");
var import_koishi14 = require("koishi");
var import_string7 = require("koishi-plugin-chatluna/utils/string");
var TextRenderer = class extends Renderer {
  static {
    __name(this, "TextRenderer");
  }
  async render(message, options) {
    if (options.session != null && options.session.platform === "qq" && options.session.isDirect) {
      return {
        element: [
          import_koishi14.h.text((0, import_string7.getMessageContent)(message.content)),
          ...import_koishi14.h.parse("<markdown-qq></markdown-qq>")
        ]
      };
    }
    let transformed = (0, import_string7.transformMessageContentToElements)(message.content);
    transformed = transformAndEscape(
      transformed,
      options.session?.platform ?? "sandbox"
    );
    if (options.split) {
      transformed = transformed.map((element) => (0, import_koishi14.h)("message", element));
    }
    if (transformed[0]?.type === "p") {
      const pElement = transformed.shift();
      const pElementContent = pElement.attrs["content"];
      if (pElementContent) {
        transformed.unshift(import_koishi14.h.text(pElementContent));
      } else {
        transformed.unshift(...pElement.children);
      }
    }
    return {
      element: transformed
    };
  }
  schema = import_koishi14.Schema.const("text").i18n({
    "zh-CN": "将回复作为 markdown 进行渲染",
    "en-US": "Render as markdown"
  });
};
function transformAndEscape(source, platform = "sandbox") {
  return source.flatMap((element) => {
    if (element.type === "text") {
      const base = (0, import_koishi13.transformToMarkdown)(element.attrs["content"], platform);
      return base;
    }
    return element;
  });
}
__name(transformAndEscape, "transformAndEscape");

// src/renders/voice.ts
var import_koishi_plugin_chatluna6 = require("koishi-plugin-chatluna");
var import_koishi15 = require("koishi");
var import_string8 = require("koishi-plugin-chatluna/utils/string");
var VoiceRenderer = class extends Renderer {
  static {
    __name(this, "VoiceRenderer");
  }
  async render(message, options) {
    const baseElements = (0, import_string8.transformMessageContentToElements)(message.content);
    const splitMessages = this._splitMessage(baseElements).flatMap((text) => text.trim().split("\n\n")).filter((text) => text.length > 0);
    import_koishi_plugin_chatluna6.logger?.debug(`splitMessages: ${JSON.stringify(splitMessages)}`);
    if (splitMessages.length === 0) {
      return {
        element: []
      };
    }
    if (options.split) {
      return {
        element: await Promise.all(
          splitMessages.map(async (text) => {
            return (0, import_koishi15.h)(
              "message",
              await this._renderToVoice(text, options)
            );
          })
        )
      };
    } else {
      return {
        element: await this._renderToVoice(
          splitMessages.join(""),
          options
        )
      };
    }
  }
  _splitMessage(messages) {
    return messages.flatMap((message) => message.toString()).filter(Boolean);
  }
  _renderToVoice(text, options) {
    return this.ctx.vits.say(
      Object.assign(
        {
          speaker_id: options?.voice?.speakerId ?? 0,
          input: text
        },
        {
          session: options.session
        }
      )
    );
  }
  schema = import_koishi15.Schema.const("voice").i18n({
    "zh-CN": "将回复渲染为语音",
    "en-US": "Render as voice"
  });
};

// src/renders/raw.ts
var import_string9 = require("koishi-plugin-chatluna/utils/string");
var import_koishi16 = require("koishi");
var RawRenderer = class extends Renderer {
  static {
    __name(this, "RawRenderer");
  }
  async render(message, options) {
    if (typeof message.content === "string") {
      return {
        element: import_koishi16.h.text(message.content)
      };
    }
    return {
      element: (0, import_string9.transformMessageContentToElements)(message.content)
    };
  }
  schema = import_koishi16.Schema.const("raw").i18n({
    "zh-CN": "原始输出",
    "en-US": "Raw text"
  });
};

// src/renders/koishi-element.ts
var import_koishi17 = require("koishi");
var import_he = __toESM(require("he"), 1);
var import_koishi_plugin_chatluna7 = require("koishi-plugin-chatluna");
var import_string10 = require("koishi-plugin-chatluna/utils/string");
var KoishiElementRenderer = class extends Renderer {
  static {
    __name(this, "KoishiElementRenderer");
  }
  async render(message, options) {
    let transformed = (0, import_string10.transformMessageContentToElements)(message.content);
    transformed = transformAndEscape2(transformed);
    if (options.split) {
      transformed = transformed.map((element) => {
        return (0, import_koishi17.h)("message", element);
      });
    }
    return {
      element: transformed
    };
  }
  schema = import_koishi17.Schema.const("koishi-element").i18n({
    "zh-CN": "将回复作为 koishi 消息元素进行渲染",
    "en-US": "Render as koishi message element template"
  });
};
function unescape(element) {
  if (element.type === "text") {
    element.attrs["content"] = import_he.default.decode(element.attrs["content"]);
  }
  if (element.children && element.children.length > 0) {
    element.children = element.children.map(unescape);
  }
  return element;
}
__name(unescape, "unescape");
function transformAndEscape2(source) {
  return source.flatMap((element) => {
    if (element.type !== "text") {
      return element;
    }
    try {
      return import_koishi17.h.parse(element.attrs["content"]).map(unescape);
    } catch (e) {
      import_koishi_plugin_chatluna7.logger.error(e);
      return [import_koishi17.h.text(source)];
    }
  });
}
__name(transformAndEscape2, "transformAndEscape");

// src/renders/mixed-voice.ts
var import_koishi_plugin_chatluna8 = require("koishi-plugin-chatluna");
var import_koishi18 = require("koishi");
var import_string11 = require("koishi-plugin-chatluna/utils/string");
var MixedVoiceRenderer = class extends Renderer {
  static {
    __name(this, "MixedVoiceRenderer");
  }
  async render(message, options) {
    const elements = [];
    const baseElements = (0, import_string11.transformMessageContentToElements)(message.content);
    const renderText = (await this.renderText(baseElements, options)).element;
    if (renderText instanceof Array) {
      elements.push(...renderText);
    } else {
      elements.push(renderText);
    }
    const renderVoice = (await this.renderVoice(baseElements, options)).element;
    if (renderVoice instanceof Array) {
      elements.push(...renderVoice);
    } else {
      elements.push(renderVoice);
    }
    return {
      element: elements
    };
  }
  async renderText(messages, options) {
    let transformed = transformAndEscape(messages);
    if (options.split) {
      transformed = transformed.map((element) => {
        return (0, import_koishi18.h)("message", element);
      });
    }
    return {
      element: transformed
    };
  }
  async renderVoice(messages, options) {
    const splitMessages = this._splitMessage(messages).flatMap((text) => text.trim().split("\n\n")).filter((text) => text.length > 0);
    import_koishi_plugin_chatluna8.logger?.debug(`splitMessages: ${JSON.stringify(splitMessages)}`);
    if (splitMessages.length === 0) {
      return {
        element: []
      };
    }
    return {
      element: await this._renderToVoice(splitMessages.join(""), options)
    };
  }
  _splitMessage(messages) {
    return messages.flatMap((message) => message.toString()).filter(Boolean);
  }
  _renderToVoice(text, options) {
    return this.ctx.vits.say(
      Object.assign(
        {
          speaker_id: options?.voice?.speakerId ?? 0,
          input: text
        },
        {
          session: options.session
        }
      )
    );
  }
  schema = import_koishi18.Schema.const("mixed-voice").i18n({
    "zh-CN": "同时输出语音和文本",
    "en-US": "Output both voice and text"
  });
};

// src/renders/pure-text.ts
var import_koishi_plugin_markdown = require("koishi-plugin-markdown");
var import_koishi19 = require("koishi");

// src/utils/remove-markdown.ts
function removeMarkdown(md, options = {}) {
  options.listUnicodeChar = Object.prototype.hasOwnProperty.call(
    options,
    "listUnicodeChar"
  ) ? options.listUnicodeChar : false;
  options.stripListLeaders = Object.prototype.hasOwnProperty.call(
    options,
    "stripListLeaders"
  ) ? options.stripListLeaders : true;
  options.gfm = Object.prototype.hasOwnProperty.call(options, "gfm") ? options.gfm : true;
  options.useImgAltText = Object.prototype.hasOwnProperty.call(
    options,
    "useImgAltText"
  ) ? options.useImgAltText : true;
  options.abbr = Object.prototype.hasOwnProperty.call(options, "abbr") ? options.abbr : false;
  options.replaceLinksWithURL = Object.prototype.hasOwnProperty.call(
    options,
    "replaceLinksWithURL"
  ) ? options.replaceLinksWithURL : false;
  options.htmlTagsToSkip = Object.prototype.hasOwnProperty.call(
    options,
    "htmlTagsToSkip"
  ) ? options.htmlTagsToSkip : [];
  options.throwError = Object.prototype.hasOwnProperty.call(
    options,
    "throwError"
  ) ? options.throwError : false;
  let output = md || "";
  output = output.replace(
    /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/gm,
    ""
  );
  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar)
        output = output.replace(
          /^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm,
          options.listUnicodeChar + " $1"
        );
      else
        output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, "$1");
    }
    if (options.gfm) {
      output = output.replace(/\n={2,}/g, "\n").replace(/~{3}.*\n/g, "").replace(/~~/g, "").replace(/```(?:.*)\n([\s\S]*?)```/g, (_, code) => code.trim());
    }
    if (options.abbr) {
      output = output.replace(/\*\[.*\]:.*\n/, "");
    }
    let htmlReplaceRegex = /<[^>]*>/g;
    if (options.htmlTagsToSkip && options.htmlTagsToSkip.length > 0) {
      const joinedHtmlTagsToSkip = options.htmlTagsToSkip.join("|");
      htmlReplaceRegex = new RegExp(
        `<(?!/?(${joinedHtmlTagsToSkip})(?=>|s[^>]*>))[^>]*>`,
        "g"
      );
    }
    output = output.replace(htmlReplaceRegex, "").replace(/^[=\-]{2,}\s*$/g, "").replace(/\[\^.+?\](\: .*?$)?/g, "").replace(/\s{0,2}\[.*?\]: .*?$/g, "").replace(
      /\!\[(.*?)\][\[\(].*?[\]\)]/g,
      options.useImgAltText ? "$1" : ""
    ).replace(
      /\[([\s\S]*?)\]\s*[\(\[].*?[\)\]]/g,
      options.replaceLinksWithURL ? "$2" : "$1"
    ).replace(/^(\n)?\s{0,3}>\s?/gm, "$1").replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, "").replace(
      /^(\n)?\s{0,}#{1,6}\s*( (.+))? +#+$|^(\n)?\s{0,}#{1,6}\s*( (.+))?$/gm,
      "$1$3$4$6"
    ).replace(/([\*]+)(\S)(.*?\S)??\1/g, "$2$3").replace(/(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g, "$1$3$4$5").replace(/(`{3,})(.*?)\1/gm, "$2").replace(/`(.+?)`/g, "$1").replace(/~(.*?)~/g, "$1");
  } catch (e) {
    if (options.throwError) throw e;
    console.error("remove-markdown encountered error: %s", e);
    return md;
  }
  return output;
}
__name(removeMarkdown, "removeMarkdown");

// src/renders/pure-text.ts
var import_he2 = __toESM(require("he"), 1);
var import_string12 = require("koishi-plugin-chatluna/utils/string");
var PureTextRenderer = class extends Renderer {
  static {
    __name(this, "PureTextRenderer");
  }
  async render(message, options) {
    let transformed = (0, import_string12.transformMessageContentToElements)(message.content);
    if (options.split) {
      transformed = transformed.flatMap((element) => {
        if (element.type !== "text") {
          return element;
        }
        const content = element.attrs["content"];
        return content.split("\n\n\n").map((paragraph) => {
          return import_koishi19.h.text(paragraph);
        });
      });
    }
    transformed = transformed.map((element) => {
      if (element.type !== "text") {
        return element;
      }
      const content = element.attrs["content"];
      return import_koishi19.h.text(stripMarkdown(content));
    });
    return {
      element: transformed
    };
  }
  schema = import_koishi19.Schema.const("pure-text").i18n({
    "zh-CN": "将回复渲染为纯文本（去除 markdown 格式）",
    "en-US": "Render as pure text (remove markdown format)"
  });
};
function stripMarkdown(source) {
  return removeMarkdown(source);
}
__name(stripMarkdown, "stripMarkdown");

// src/render.ts
var DefaultRenderer = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.defaultOptions = {
      type: config.outputMode,
      split: config.splitMessage,
      voice: {
        speakerId: config.voiceSpeakId
      }
    };
    ctx.inject(["chatluna"], (ctx2) => {
      this.addRenderer("text", () => new TextRenderer(ctx2));
      this.addRenderer("voice", () => new VoiceRenderer(ctx2));
      this.addRenderer("raw", () => new RawRenderer(ctx2));
      this.addRenderer("mixed-voice", () => new MixedVoiceRenderer(ctx2));
      this.addRenderer(
        "koishi-element",
        () => new KoishiElementRenderer(ctx2)
      );
      this.addRenderer("pure-text", () => new PureTextRenderer(ctx2));
    });
  }
  static {
    __name(this, "DefaultRenderer");
  }
  defaultOptions;
  renderers = {};
  async render(message, options = this.defaultOptions) {
    try {
      const result = [];
      options = Object.assign({}, this.defaultOptions, options);
      const currentRenderer = this.getRenderer(options.type);
      const rawRenderer = options.type === "raw" ? currentRenderer : this.getRenderer("raw");
      if (message.additionalReplyMessages) {
        for (const additionalMessage of message.additionalReplyMessages) {
          const elements = await rawRenderer.render(additionalMessage, options).then((r) => r.element);
          result.push({
            element: (0, import_koishi20.h)(
              "message",
              { forward: true },
              Array.isArray(elements) ? elements : [elements]
            )
          });
        }
      }
      result.push(await currentRenderer.render(message, options));
      return result;
    } catch (e) {
      throw new import_error7.ChatLunaError(import_error7.ChatLunaErrorCode.RENDER_ERROR, e);
    }
  }
  addRenderer(type, renderer) {
    this.renderers[type] = renderer(this.ctx, this.config);
    this.updateSchema();
    return () => this.removeRenderer(type);
  }
  removeRenderer(type) {
    delete this.renderers[type];
    this.updateSchema();
  }
  getRenderer(type) {
    return this.renderers[type];
  }
  updateSchema() {
    if (!this.ctx.scope.isActive) {
      return;
    }
    this.ctx.schema.set(
      "output-mode",
      import_koishi20.Schema.union(this._getAllRendererScheme())
    );
  }
  _getAllRendererScheme() {
    return Object.values(this.renderers).map((key) => key.schema);
  }
  get rendererTypeList() {
    return Object.keys(this.renderers);
  }
};

// src/index.ts
__reExport(index_exports, require("@vue/reactivity"), module.exports);
var name = "chatluna";
var inject = {
  required: ["database"],
  optional: ["censor", "vits", "sst", "chatluna_storage"]
};
var inject2 = {
  database: { required: true },
  censor: { required: false },
  vits: { required: false },
  chatluna_storage: { required: false }
};
var logger8;
var usage = `
## chatluna v1.3

ChatLuna 插件交流 QQ 群：282381753 （有问题或出现 Bug 先加群问）

群里目前没有搭载该插件的 bot，加群的话最好是来询问问题或者提出意见的。

访问 [https://chatluna.chat](https://chatluna.chat) 来了解如何使用 Chatluna。
也可以访问 [https://preset.chatluna.chat](https://preset.chatluna.chat) 进入在线预设编辑器。更有预设广场来浏览和下载你心仪的预设。
`;
function apply69(ctx, config) {
  logger8 = (0, import_logger9.createLogger)(ctx);
  setupLogger(config);
  setupI18n(ctx);
  const disposables = [];
  ctx.on("ready", async () => {
    setupProxy(ctx, config);
    setupServices(ctx, config, disposables);
    setupPermissions(ctx, disposables);
    setupEntryPoint(ctx, config, disposables);
  });
  ctx.on("dispose", async () => {
    (0, import_logger9.clearLogger)();
    disposables.forEach((disposable) => disposable());
  });
}
__name(apply69, "apply");
function setupEntryPoint(ctx, config, disposables) {
  const entryPointPlugin = /* @__PURE__ */ __name((ctx2, config2) => {
    ctx2.on("ready", async () => {
      await initializeComponents(ctx2, config2);
      setupMiddleware(ctx2);
    });
  }, "entryPointPlugin");
  const entryPointDisposable = (0, import_koishi22.forkScopeToDisposable)(
    ctx.plugin(
      {
        apply: entryPointPlugin,
        inject: {
          ...inject2,
          chatluna: { required: true },
          chatluna_auth: { required: false },
          chatluna_storage: { required: false },
          database: { required: false },
          notifier: { required: false }
        },
        name: "chatluna_entry_point"
      },
      config
    )
  );
  disposables.push(entryPointDisposable);
}
__name(setupEntryPoint, "setupEntryPoint");
async function initializeComponents(ctx, config) {
  await defaultFactory(ctx, ctx.chatluna.platform);
  await middleware(ctx, config);
  await command(ctx, config);
  await ctx.chatluna.preset.init();
  await setupAutoDelete(ctx, config);
  apply10(ctx, config);
  apply11(ctx, config);
}
__name(initializeComponents, "initializeComponents");
function setupMiddleware(ctx) {
  ctx.middleware((session, next) => {
    if (ctx.chatluna == null || ctx.chatluna.chatChain == null) {
      return next();
    }
    return next(async (nextMiddleware) => {
      const messageHandled = await ctx.chatluna.chatChain.receiveMessage(
        session,
        ctx
      );
      if (!messageHandled) {
        return await nextMiddleware();
      }
    });
  });
}
__name(setupMiddleware, "setupMiddleware");
function setupLogger(config) {
  if (config.isLog) {
    (0, import_logger9.setLoggerLevel)(import_koishi21.Logger.DEBUG);
  }
}
__name(setupLogger, "setupLogger");
function setupI18n(ctx) {
  ctx.i18n.define("zh-CN", require_zh_CN());
  ctx.i18n.define("en-US", require_en_US());
}
__name(setupI18n, "setupI18n");
function setupProxy(ctx, config) {
  if (config.isProxy) {
    request.setGlobalProxyAddress(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config.proxyAddress || (ctx.http["config"] ?? ctx.http["currentConfig"])?.proxyAgent
    );
    logger8.debug("global proxy %c", config.proxyAddress);
  }
}
__name(setupProxy, "setupProxy");
function setupServices(ctx, config, disposables) {
  disposables.push(
    (0, import_koishi22.forkScopeToDisposable)(ctx.plugin(import_chat2.ChatLunaService, config)),
    (0, import_koishi22.forkScopeToDisposable)(ctx.plugin(ChatLunaAuthService, config))
  );
}
__name(setupServices, "setupServices");
function setupPermissions(ctx, disposables) {
  const adminPermissionDisposable = ctx.permissions.define("chatluna:admin", {
    inherits: ["authority.3"]
  });
  disposables.push(() => {
    adminPermissionDisposable();
  });
  const adminProviderDisposable = ctx.permissions.provide(
    "chatluna:admin",
    async (name2, session) => {
      return (await session.getUser(session.userId, [
        "authority"
      ]))?.authority >= 3;
    }
  );
  disposables.push(() => {
    adminProviderDisposable();
  });
}
__name(setupPermissions, "setupPermissions");
async function setupAutoDelete(ctx, config) {
  if (!config.autoDelete) {
    return;
  }
  async function execute() {
    if (!ctx.scope.isActive) {
      return;
    }
    const rooms = await ctx.database.get("chathub_room", {
      updatedTime: {
        $lt: new Date(Date.now() - config.autoDeleteTimeout * 1e3)
      }
    });
    if (rooms.length === 0) {
      return;
    }
    logger8.info("Auto delete task running");
    const success = [];
    for (const room of rooms) {
      try {
        await (0, import_chains2.deleteConversationRoom)(ctx, room);
        success.push(room);
      } catch (e) {
        logger8.error(e);
      }
    }
    logger8.success(
      `Successfully deleted %d rooms: %s`,
      rooms.length,
      success.map((room) => room.roomName).join(",")
    );
  }
  __name(execute, "execute");
  await execute();
  ctx.setInterval(async () => {
    await execute();
  }, import_koishi21.Time.minute * 5);
}
__name(setupAutoDelete, "setupAutoDelete");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  DefaultRenderer,
  Renderer,
  apply,
  inject,
  inject2,
  logger,
  name,
  usage,
  ...require("@vue/reactivity")
});
