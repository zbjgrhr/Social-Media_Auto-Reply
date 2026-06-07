# 自动回复插件

# Auto Reply Extension

Chrome / Edge 浏览器扩展（Manifest V3），在 Twitter / X、Facebook、Instagram 私信场景提供中英草稿生成、可控的自动发送，以及 X 私信页的自动回复。

A Chrome / Edge browser extension (Manifest V3) for Twitter / X, Facebook, and Instagram direct messages: bilingual draft generation, user-controlled auto-send, and auto-reply on X DMs.

---

## 合规声明（必读） / Compliance Notice (Required Reading)

本工具**不会**也**不应**用于：

This tool **must not** be used for:

- 自动或批量刷屏骚扰、定时连发垃圾消息  
  Automated or bulk spam, scheduled message flooding, or harassment
- 规避平台审核或举报机制  
  Evading platform moderation or reporting systems
- 生成辱骂、威胁、仇恨、歧视或煽动性内容  
  Generating abusive, threatening, hateful, discriminatory, or inciting content
- 注入、Hook 或破解第三方应用  
  Injecting, hooking, or cracking third-party applications

请理性使用，遵守各平台服务条款与当地法律法规，保护自身账号安全。

Use responsibly, follow each platform's terms of service and applicable laws, and protect your account.

---

## 功能介绍 / Features

- **随机草稿**：侧边栏一键生成 10 条随机中英草稿，可切换「中文 / 英文 / 中英一起」  
  **Random drafts**: Generate 10 random bilingual drafts in the side panel; choose Chinese, English, or both
- **START 自动发送**：在已打开的 Twitter/X、Facebook、Instagram 私信页，按你选择的语言自动填入并发送草稿；默认每 1 分钟一条，仅作用于**当前活动标签页**  
  **START auto-send**: On open DM tabs for Twitter/X, Facebook, or Instagram, fill and send drafts in your chosen language; default interval is 1 minute, **active tab only**
- **AUTO REPLY**：仅在 X / Twitter 私信页可用；检测到对方新消息后，在约 1～30 秒内随机延迟发送固定文案「回复TD退订」；对方连发时按最新消息重新计时  
  **AUTO REPLY**: X / Twitter DMs only; after a new inbound message, reply with fixed text「回复TD退订」after a random 1–30s delay; rapid consecutive messages reset the timer
- **共享核心**：草稿生成与发信逻辑位于 `packages/core`  
  **Shared core**: Draft generation and send logic live in `packages/core`

---

## 环境要求 / Requirements

- **Chrome** 或 **Edge**（支持 Manifest V3）  
  **Chrome** or **Edge** (Manifest V3)
- 扩展权限作用于：`twitter.com`、`x.com`、`facebook.com`、`messenger.com`、`instagram.com`（以构建产物 `dist/manifest.json` 为准）  
  Host permissions: `twitter.com`, `x.com`, `facebook.com`, `messenger.com`, `instagram.com` (see `dist/manifest.json` after build)

---

## 开发与构建 / Development & Build

```bash
npm install
npm run build
```

构建完成后，在浏览器「扩展程序」中加载 **`dist` 目录**（开发者模式 → 加载已解压的扩展程序）。

After building, load the **`dist`** folder in your browser (Developer mode → Load unpacked).

---

## 安装（开发者模式） / Installation (Developer Mode)

1. 在本仓库 `fixed_source(1)/farm_fixed/` 目录执行 `npm install` 与 `npm run build`。  
   Run `npm install` and `npm run build` in `fixed_source(1)/farm_fixed/`.
2. 打开浏览器「扩展程序」页面，开启「开发者模式」。  
   Open Extensions, enable Developer mode.
3. 选择「加载已解压的扩展程序」，指向 **`dist`** 目录。  
   Choose Load unpacked and select the **`dist`** folder.

---

## 基本操作流程 / Basic Workflow

### 1. 打开侧边栏 / Open the Side Panel

点击浏览器工具栏上的扩展图标，打开「自动回复插件」侧边栏（具体行为取决于 Chrome 侧栏设置）。

Click the extension icon in the toolbar to open the Auto Reply Extension side panel (behavior depends on your Chrome side panel settings).

### 2. 生成草稿 / Generate Drafts

1. 在侧边栏点击 **「仅生成草稿」**。  
   Click **「仅生成草稿」** (Generate drafts only).
2. 每次生成 10 条尽量随机的草稿（基于分片语料拼接）。  
   Each run produces 10 pseudo-random drafts from sharded phrase templates.
3. 切换「中文 / 英文 / 中英一起」；点击某条草稿可复制到剪贴板。  
   Switch language mode; click a draft to copy it.
4. 「中英一起」格式为：中文 + 空行 + 英文。  
   「Both」format: Chinese, blank line, then English.

### 3. START 自动发送 / START Auto-Send

1. 先在侧边栏生成草稿并选择语言。  
   Generate drafts and pick a language first.
2. 打开目标平台的私信页并保持为**当前活动标签页**。  
   Open the target DM page and keep it as the **active tab**.
3. 点击 **「START 自动发送」** 开始；点击 **「STOP 停止」** 结束。  
   Click **START** to begin; click **STOP** to end.
4. 复制草稿与自动发送均遵循上方语言选择。  
   Copy and auto-send both follow the selected language.

### 4. AUTO REPLY 自动回复 / AUTO REPLY

1. 在 **X / Twitter 私信页** 打开侧边栏。  
   Open the side panel on an **X / Twitter DM** page.
2. 点击 **「AUTO REPLY 开」** 启用；**「AUTO REPLY 关」** 关闭。  
   Click **AUTO REPLY 开** to enable; **AUTO REPLY 关** to disable.
3. 对方发来新消息后，扩展会在约 1～30 秒内随机延迟自动回复「回复TD退订」。  
   On a new inbound message, the extension replies with「回复TD退订」after a random 1–30s delay.

### 5. 高频发送风险提示 / High-Frequency Risk

短时间内大量自动发送可能违反平台反垃圾或反骚扰规则。请控制频率，理性使用。

High-frequency auto-sending may violate platform anti-spam or anti-harassment policies. Use moderation.

---

## 隐私说明 / Privacy

- 草稿与运行状态保存在本机，不上传服务器。  
  Drafts and runtime state stay on your device; nothing is uploaded to a server.
- 扩展仅在匹配的私信页面注入脚本，不静默抓取整页聊天记录。  
  Scripts run only on matching DM pages; full chat history is not silently scraped.

---

## 共享核心 / Shared Core

随机草稿生成、私信填发与消息协议位于 **`packages/core`**，供本扩展复用。

Random draft generation, DM composer helpers, and message types live in **`packages/core`** for reuse.

---

## 反馈与贡献 / Feedback & Contributing

欢迎提交 Issue；贡献代码时请遵守上述合规边界。

Issues are welcome. Contributions must respect the compliance boundaries above.

---

## 许可证 / License

MIT
