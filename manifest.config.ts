import { defineManifest } from "@crxjs/vite-plugin";

const dmMatches = [
  "https://twitter.com/*",
  "https://www.twitter.com/*",
  "https://x.com/*",
  "https://www.x.com/*",
  "https://www.facebook.com/*",
  "https://facebook.com/*",
  "https://m.facebook.com/*",
  "https://www.messenger.com/*",
  "https://messenger.com/*",
  "https://www.instagram.com/*",
  "https://instagram.com/*",
] as const;

export default defineManifest({
  manifest_version: 3,
  name: "自动回复插件",
  description:
    "自动回复插件：侧边栏生成中英草稿；在 Twitter/X、Facebook、Instagram 私信页由你控制 Start/Stop 自动发送；X 私信页可开 AUTO REPLY 对对方新消息回复固定文案。",
  version: "1.0.0",
  permissions: ["sidePanel", "tabs", "alarms"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  host_permissions: [...dmMatches],
  action: {
    default_title: "打开自动回复侧边栏",
  },
  side_panel: {
    default_path: "src/ui/sidepanel.html",
  },
  content_scripts: [
    {
      matches: [...dmMatches],
      js: ["src/content/dmAutoSend.ts"],
      run_at: "document_idle",
    },
  ],
});