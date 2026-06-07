import type { DmContentToBgMessage } from "@core/dmMessages";

const ALARM_PREFIX = "dmAutoSend-";

function alarmNameForTab(tabId: number): string {
  return `${ALARM_PREFIX}${tabId}`;
}

function tabIdFromAlarmName(name: string): number | null {
  if (!name.startsWith(ALARM_PREFIX)) return null;
  const n = Number(name.slice(ALARM_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

function clearAlarmForTab(tabId: number): void {
  chrome.alarms.clear(alarmNameForTab(tabId));
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const tabId = tabIdFromAlarmName(alarm.name);
  if (tabId == null) return;
  chrome.tabs
    .sendMessage(tabId, { type: "DM_AUTO_SEND_ALARM_TICK" })
    .catch(() => {
      chrome.alarms.clear(alarm.name);
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearAlarmForTab(tabId);
});

chrome.runtime.onMessage.addListener(
  (
    msg: DmContentToBgMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (r: { ok: true } | { ok: false; error?: string }) => void
  ): boolean | undefined => {
    const tabId = sender.tab?.id;
    if (msg.type === "DM_AUTO_SEND_BG_ARM") {
      if (tabId == null) {
        sendResponse({ ok: false, error: "no tab" });
        return undefined;
      }
      const name = alarmNameForTab(tabId);
      const delayInMinutes = msg.initialDelayMs / 60_000;
      const periodInMinutes = Math.max(msg.intervalMs / 60_000, 1);
      chrome.alarms.clear(name, () => {
        try {
          chrome.alarms.create(name, {
            delayInMinutes,
            periodInMinutes,
          });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true;
    }
    if (msg.type === "DM_AUTO_SEND_BG_CLEAR") {
      if (tabId != null) clearAlarmForTab(tabId);
      sendResponse({ ok: true });
      return undefined;
    }
    return undefined;
  }
);
