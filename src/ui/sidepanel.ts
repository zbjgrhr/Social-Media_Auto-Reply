import { generateDraftBatch, type DraftPair } from "@core/draftGenerator";
import type { DmRuntimeMessage, DmStartResponse } from "@core/dmMessages";
import { isSupportedDmHost } from "@core/script";

/** START 自动发送：每条草稿之间的默认间隔（1 分钟） */
const DEFAULT_INTERVAL_MS = 60_000;

let lastDrafts: DraftPair[] = [];

function selectedLang(): "zh" | "en" | "both" {
  const r = document.querySelector(
    'input[name="lang"]:checked'
  ) as HTMLInputElement | null;
  const v = r?.value;
  if (v === "en") return "en";
  if (v === "both") return "both";
  return "zh";
}

function setTip(text: string) {
  const tip = document.getElementById("copiedTip");
  if (tip) tip.textContent = text;
}

function renderDrafts() {
  const root = document.getElementById("drafts")!;
  root.innerHTML = "";
  lastDrafts.forEach((d) => {
    const div = document.createElement("div");
    div.className = "draft";
    div.innerHTML = `<div class="zh">${escapeHtml(d.zh)}</div><div class="en">${escapeHtml(d.en)}</div>`;
    div.addEventListener("click", () => copyDraft(d));
    root.appendChild(div);
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function copyDraft(d: DraftPair) {
  const lang = selectedLang();
  const text =
    lang === "en" ? d.en : lang === "both" ? `${d.zh}\n\n${d.en}` : d.zh;
  void navigator.clipboard?.writeText(text);
  setTip("已复制到剪贴板。");
}

/**
 * 从侧边栏发消息时以「当前浏览器窗口」为准，避免焦点在侧边栏或
 * DevTools 时 `lastFocusedWindow` 指向错误窗口，导致消息发到非私信页。
 */
async function getDmTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  const win = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: win.id });
  const active = tabs.find((t) => t.active);
  const activeHost = active ? tabHostname(active) : null;
  if (active?.id && activeHost && isSupportedDmHost(activeHost)) {
    return active;
  }
  return tabs.find((t) => {
    const h = tabHostname(t);
    return t.id != null && h != null && isSupportedDmHost(h);
  });
}

function tabHostname(tab: chrome.tabs.Tab): string | null {
  const u = tab.url;
  if (!u || !/^https?:/i.test(u)) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

document.getElementById("btnStart")!.addEventListener("click", () => {
  lastDrafts = generateDraftBatch(10);
  renderDrafts();
  setTip("已生成 10 条草稿。");
});

document.getElementById("startBtn")!.addEventListener("click", async () => {
  if (lastDrafts.length === 0) {
    lastDrafts = generateDraftBatch(10);
    renderDrafts();
  }

  const tab = await getDmTargetTab();
  if (!tab?.id) {
    setTip("未找到当前窗口内的 Twitter/X、Facebook 或 Instagram 标签页。");
    return;
  }
  const host = tabHostname(tab);
  if (!host || !isSupportedDmHost(host)) {
    setTip(
      "请先在 Twitter/X、Facebook 或 Instagram 的私信对话页打开标签，再点 START。"
    );
    return;
  }

  const msg: DmRuntimeMessage = {
    type: "DM_AUTO_SEND_START",
    payload: {
      drafts: lastDrafts,
      lang: selectedLang(),
      intervalMs: DEFAULT_INTERVAL_MS,
    },
  };

  try {
    const res = (await chrome.tabs.sendMessage(
      tab.id,
      msg
    )) as DmStartResponse;
    if (!res?.ok) {
      setTip(res?.error ?? "启动失败。");
      return;
    }
    setTip("已启动：对当前标签页按间隔自动发送（点 STOP 停止）。");
  } catch {
    setTip(
      "无法连接页面脚本：请刷新该社交页面后重试，并确认扩展已启用。"
    );
  }
});

document.getElementById("stopBtn")!.addEventListener("click", async () => {
  const tab = await getDmTargetTab();
  if (!tab?.id) {
    setTip("未找到当前窗口内的目标标签页。");
    return;
  }
  const msg: DmRuntimeMessage = { type: "DM_AUTO_SEND_STOP" };
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
    setTip("已发送停止指令。");
  } catch {
    setTip("停止指令未送达（页面可能已关闭或未注入脚本）。");
  }
});

document.getElementById("autoReplyStartBtn")!.addEventListener("click", async () => {
  const tab = await getDmTargetTab();
  if (!tab?.id) {
    setTip("未找到当前窗口内的 Twitter/X 等标签页。");
    return;
  }
  const host = tabHostname(tab);
  if (!host || !isSupportedDmHost(host)) {
    setTip("请先在 X（Twitter）私信对话页打开标签，再开自动回复。");
    return;
  }
  const msg: DmRuntimeMessage = { type: "DM_AUTO_REPLY_START" };
  try {
    const res = (await chrome.tabs.sendMessage(tab.id, msg)) as DmStartResponse;
    if (!res?.ok) {
      setTip(res?.error ?? "自动回复启动失败。");
      return;
    }
    setTip(
      "已开启自动回复（仅 X / Twitter；对方新消息后约 1～30 秒内随机发一条；点 AUTO REPLY 关 停止）。"
    );
  } catch {
    setTip("无法连接页面脚本：请刷新 X 页面后重试。");
  }
});

document.getElementById("autoReplyStopBtn")!.addEventListener("click", async () => {
  const tab = await getDmTargetTab();
  if (!tab?.id) {
    setTip("未找到当前窗口内的目标标签页。");
    return;
  }
  const msg: DmRuntimeMessage = { type: "DM_AUTO_REPLY_STOP" };
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
    setTip("已关闭自动回复。");
  } catch {
    setTip("关闭指令未送达（页面可能已关闭或未注入脚本）。");
  }
});
