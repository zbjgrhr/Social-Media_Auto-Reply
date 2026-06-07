import type {
  DmAutoSendStartPayload,
  DmContentToBgMessage,
  DmRuntimeMessage,
  DmStartResponse,
} from "@core/dmMessages";
import {
  DM_AUTO_SEND_MIN_INTERVAL_MS,
  fillComposerAndSendAsync,
  isSupportedDmHost,
} from "@core/script";

/**
 * 架构说明（DM 自动发 / 自动回复）
 *
 * - 本文件作为 **content script** 注入在匹配站点的标签页中运行。用户关闭该标签、离开匹配
 *   URL 或站点卸载脚本后，一切定时与观察器即停止；**无法**在「无页面」时通过 DOM 填发私信。
 *   「离线发送」若不做官方 API、常驻隐藏页或其它后台页方案，则不在本扩展能力范围内。
 *
 * - **START** 与 **AUTO REPLY** 使用互不干扰的状态机（`intervalId`/`payload` vs `autoReply*`）；
 *   开启其一不会清除另一者的开关状态。
 *
 * - 浏览器对**非活动 / 后台标签**中的 `setInterval` / `setTimeout` 会节流，**不保证**墙钟
 *   精度的长周期。当 `intervalMs >= DM_AUTO_SEND_USE_ALARMS_MIN_MS` 时，START 改由 service
 *   worker 的 `chrome.alarms` 按墙钟触发，再向本标签发 `DM_AUTO_SEND_ALARM_TICK`；更短间隔
 *   仍用页面内 `setInterval`（Chrome `periodInMinutes` 最小约 1 分钟）。
 *
 * - START 与 AUTO REPLY 均调用 `fillComposerAndSendAsync`，经 `enqueueComposerSend` **串行**
 *   化，避免同时抢同一 composer。
 */

/** 首帧 tick：给 SPA 留出挂载 composer 的时间（原 900ms 在 XChat 上偏紧）。 */
const DM_AUTO_SEND_INITIAL_DELAY_MS = 2_500;
/** 大于等于此间隔时由 `chrome.alarms` 驱动 START，减轻后台标签 timer 节流。 */
const DM_AUTO_SEND_USE_ALARMS_MIN_MS = 60_000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = false;
let payload: DmAutoSendStartPayload | null = null;

/** START 与 AUTO REPLY 共用，保证对 composer 的填发串行。 */
let composerSendChain: Promise<unknown> = Promise.resolve();

function enqueueComposerSend<T>(task: () => Promise<T>): Promise<T> {
  const run = composerSendChain.then(() => task());
  composerSendChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function clearDmAutoSendAlarm(): void {
  const msg: DmContentToBgMessage = { type: "DM_AUTO_SEND_BG_CLEAR" };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function stopInternal(): void {
  running = false;
  payload = null;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  clearDmAutoSendAlarm();
}

function pickMessageText(): string | null {
  if (!payload || payload.drafts.length === 0) return null;
  const d = payload.drafts[Math.floor(Math.random() * payload.drafts.length)]!;
  if (payload.lang === "en") return d.en;
  if (payload.lang === "zh") return d.zh;
  return `${d.zh}\n\n${d.en}`;
}

async function tick(): Promise<void> {
  if (!running || !payload) return;
  const text = pickMessageText();
  if (!text) {
    console.warn("[dmAutoSend] 无草稿，跳过本轮");
    return;
  }
  const r = await enqueueComposerSend(() =>
    fillComposerAndSendAsync(location.hostname, text)
  );
  if (!r.ok) {
    console.warn("[dmAutoSend]", r.error);
  }
}

// --- X / Twitter 自动回复（对方新消息 → 固定回复） ---

const AUTO_REPLY_TEXT = "回复TD退订";
/**
 * DOM 突变后推迟到下一 macrotask 再检测（0 = 近乎即时，同时合并同一次事件循环内的多次同步变更）。
 * 勿用大防抖：X 渲染一条消息时可能持续改 DOM，长 debounce 会一直被重置导致「不即时」。
 */
const AUTO_REPLY_DEBOUNCE_MS = 0;
/** 检测到对方新消息后，随机等待再发送（毫秒，含端点）。 */
const AUTO_REPLY_DELAY_MIN_MS = 1_000;
const AUTO_REPLY_DELAY_MAX_MS = 30_000;
/** MutationObserver 未覆盖时的兜底轮询（毫秒）。 */
const AUTO_REPLY_POLL_MS = 1_000;

function randomAutoReplyDelayMs(): number {
  const span = AUTO_REPLY_DELAY_MAX_MS - AUTO_REPLY_DELAY_MIN_MS + 1;
  return AUTO_REPLY_DELAY_MIN_MS + Math.floor(Math.random() * span);
}

function isTwitterDmHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "x.com" ||
    h === "www.x.com" ||
    h === "twitter.com" ||
    h === "www.twitter.com"
  );
}

/** 去掉被其它候选行包含的节点（避免 cellInner 嵌套重复）。 */
function pruneContainedRows(rows: HTMLElement[]): HTMLElement[] {
  return rows.filter(
    (row) => !rows.some((other) => other !== row && other.contains(row))
  );
}

/**
 * 遍历同源 iframe / open shadow，收集会话气泡。
 * Jetfuel `/i/chat` 往往用 `cellInnerDiv` 而非 `messageEntry*`，需一并收集。
 */
function collectBubbleRowsDeep(): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const visited = new Set<Document | ShadowRoot>();
  const queue: Array<Document | ShadowRoot> = [document];
  while (queue.length > 0) {
    const root = queue.shift()!;
    if (visited.has(root)) continue;
    visited.add(root);

    const composerForm = root.querySelector("form[data-testid=\"dm-composer-form\"]");

    root.querySelectorAll<HTMLElement>('[data-testid^="messageEntry"]').forEach((el) => {
      seen.add(el);
    });
    root.querySelectorAll<HTMLElement>('[data-testid^="dmMessage"]').forEach((el) => {
      if (!composerForm?.contains(el)) seen.add(el);
    });

    /** XChat `/i/chat`：外层一行是 `message-<uuid>`，内层气泡是 `message-text-<uuid>`，只收外层。 */
    root.querySelectorAll<HTMLElement>('[data-testid^="message-"]').forEach((el) => {
      if (composerForm?.contains(el)) return;
      const mt = (el.getAttribute("data-testid") || "").toLowerCase();
      if (mt.startsWith("message-text-")) return;
      seen.add(el);
    });

    root.querySelectorAll<HTMLElement>('[data-testid="cellInnerDiv"]').forEach((cell) => {
      if (composerForm?.contains(cell)) return;
      const t = (cell.innerText || "").trim();
      if (t.length < 2) return;
      seen.add(cell);
    });

    root.querySelectorAll("*").forEach((el) => {
      const sr = el.shadowRoot;
      if (sr && !visited.has(sr)) {
        queue.push(sr);
      }
    });
    root.querySelectorAll("iframe,frame").forEach((fr) => {
      try {
        const d = (fr as HTMLIFrameElement).contentDocument;
        if (d && !visited.has(d)) {
          queue.push(d);
        }
      } catch {
        /* cross-origin */
      }
    });
  }
  const out = Array.from(seen);
  out.sort((a, b) => {
    try {
      const p = a.compareDocumentPosition(b);
      if (p & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (p & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    } catch {
      return 0;
    }
    return 0;
  });
  return pruneContainedRows(out);
}

/** 无 messageEntry testid 时，用气泡在会话栏内的左右位置推断是否为自己发的。 */
function isCellLikelyOutgoing(cell: HTMLElement): boolean {
  const rect = cell.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 6) return true;

  const ta = document.querySelector<HTMLElement>(
    'textarea[data-testid="dm-composer-textarea"]'
  );
  const main = ta?.closest("main") ?? document.querySelector("main");
  const col = main?.getBoundingClientRect();
  if (col && col.width > 80) {
    const midCol = col.left + col.width / 2;
    const cx = (rect.left + rect.right) / 2;
    const rtl = (document.documentElement.dir || "").toLowerCase() === "rtl";
    if (rtl) return cx < midCol - col.width * 0.02;
    return cx > midCol + col.width * 0.02;
  }

  const w = window.innerWidth;
  if (w < 80) return true;
  const cx = (rect.left + rect.right) / 2;
  const rtl = (document.documentElement.dir || "").toLowerCase() === "rtl";
  if (rtl) return cx < w * 0.48;
  return cx > w * 0.52;
}

function isRowOutgoing(row: HTMLElement): boolean {
  const tidRaw = row.getAttribute("data-testid") || "";
  const tid = tidRaw.toLowerCase();
  /** Jetfuel：一行 `div.flex...justify-end|justify-start` + `data-testid="message-..."`。 */
  if (tid.startsWith("message-") && !tid.startsWith("message-text-")) {
    if (row.classList.contains("justify-end")) return true;
    if (row.classList.contains("justify-start")) return false;
    return isCellLikelyOutgoing(row);
  }
  if (tid.startsWith("messageentry")) {
    if (tid.includes("outgoing")) return true;
    if (tid.includes("incoming")) return false;
    if (row.querySelector('[data-testid="messageEntryOutgoing"]')) return true;
    if (row.querySelector('[data-testid="messageEntryIncoming"]')) return false;
  }
  if (tid === "cellinnerdiv") {
    return isCellLikelyOutgoing(row);
  }
  if (tid.startsWith("dmmessage")) {
    if (tid.includes("outgoing") || tid.includes("sent") || tid.includes("self")) {
      return true;
    }
    if (tid.includes("incoming") || tid.includes("received")) return false;
    return isCellLikelyOutgoing(row);
  }
  return true;
}

function signatureForMessageRow(row: HTMLElement): string {
  const text = row.innerText?.replace(/\s+/g, " ").trim().slice(0, 400) || "";
  return `${text}::${row.getAttribute("data-testid") || ""}`;
}

let autoReplyEnabled = false;
let autoReplyObserver: MutationObserver | null = null;
let autoReplyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let autoReplyDelayTimer: ReturnType<typeof setTimeout> | null = null;
let autoReplyPollId: ReturnType<typeof setInterval> | null = null;
/** 防止在 fill/send 完成前并发进入，避免双发。 */
let autoReplySendInFlight = false;
/** 当前随机延迟所针对的末尾 incoming 签名（对方连发时会被更新并重新计时）。 */
let autoReplyQueuedSig: string | null = null;
/** 已处理过的末尾对方消息签名；开启时预填当前最后一条 incoming，避免立刻误发。 */
let autoReplyConsumedSig: string | null = null;

function stopAutoReplyInternal(): void {
  autoReplyEnabled = false;
  autoReplyConsumedSig = null;
  if (autoReplyObserver) {
    autoReplyObserver.disconnect();
    autoReplyObserver = null;
  }
  if (autoReplyDebounceTimer !== null) {
    clearTimeout(autoReplyDebounceTimer);
    autoReplyDebounceTimer = null;
  }
  if (autoReplyPollId !== null) {
    clearInterval(autoReplyPollId);
    autoReplyPollId = null;
  }
  if (autoReplyDelayTimer !== null) {
    clearTimeout(autoReplyDelayTimer);
    autoReplyDelayTimer = null;
  }
  autoReplyQueuedSig = null;
  autoReplySendInFlight = false;
}

function queueAutoReplyAfterRandomDelay(sig: string): void {
  if (!autoReplyEnabled || !isTwitterDmHost(location.hostname)) return;
  if (autoReplySendInFlight) return;

  if (autoReplyDelayTimer !== null) {
    if (autoReplyQueuedSig === sig) return;
    clearTimeout(autoReplyDelayTimer);
    autoReplyDelayTimer = null;
  }

  autoReplyQueuedSig = sig;
  const delayMs = randomAutoReplyDelayMs();
  autoReplyDelayTimer = window.setTimeout(() => {
    autoReplyDelayTimer = null;
    autoReplyQueuedSig = null;
    void executeAutoReplySend();
  }, delayMs);
}

async function executeAutoReplySend(): Promise<void> {
  if (!autoReplyEnabled || !isTwitterDmHost(location.hostname)) return;
  if (autoReplySendInFlight) return;
  const rows = collectBubbleRowsDeep();
  const last = rows.length ? rows[rows.length - 1]! : null;
  if (!last || isRowOutgoing(last)) return;

  const sigNow = signatureForMessageRow(last);
  if (sigNow === autoReplyConsumedSig) return;

  autoReplySendInFlight = true;
  autoReplyConsumedSig = sigNow;
  try {
    const r = await enqueueComposerSend(() =>
      fillComposerAndSendAsync(location.hostname, AUTO_REPLY_TEXT)
    );
    if (!r.ok) {
      autoReplyConsumedSig = null;
      console.warn("[dmAutoReply]", r.error);
    }
  } finally {
    autoReplySendInFlight = false;
  }
}

function maybeAutoReply(): void {
  if (!autoReplyEnabled || !isTwitterDmHost(location.hostname)) return;
  if (autoReplySendInFlight) return;
  const rows = collectBubbleRowsDeep();
  const last = rows.length ? rows[rows.length - 1]! : null;
  if (!last || isRowOutgoing(last)) return;

  const sig = signatureForMessageRow(last);
  if (sig === autoReplyConsumedSig) return;

  queueAutoReplyAfterRandomDelay(sig);
}

function scheduleMaybeAutoReply(): void {
  if (!autoReplyEnabled) return;
  if (autoReplyDebounceTimer !== null) {
    clearTimeout(autoReplyDebounceTimer);
  }
  autoReplyDebounceTimer = window.setTimeout(() => {
    autoReplyDebounceTimer = null;
    maybeAutoReply();
  }, AUTO_REPLY_DEBOUNCE_MS);
}

function startAutoReplyInternal(): void {
  stopAutoReplyInternal();
  autoReplyEnabled = true;
  const rows = collectBubbleRowsDeep();
  const last = rows.length ? rows[rows.length - 1]! : null;
  if (last && !isRowOutgoing(last)) {
    autoReplyConsumedSig = signatureForMessageRow(last);
  } else {
    autoReplyConsumedSig = null;
  }

  autoReplyObserver = new MutationObserver(() => {
    scheduleMaybeAutoReply();
  });
  autoReplyObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  scheduleMaybeAutoReply();

  autoReplyPollId = window.setInterval(() => {
    if (autoReplyEnabled) maybeAutoReply();
  }, AUTO_REPLY_POLL_MS);
}

chrome.runtime.onMessage.addListener(
  (msg: DmRuntimeMessage, _sender, sendResponse: (r: DmStartResponse) => void) => {
    if (msg.type === "DM_AUTO_SEND_ALARM_TICK") {
      void tick();
      sendResponse({ ok: true });
      return undefined;
    }
    if (msg.type === "DM_AUTO_REPLY_STOP") {
      stopAutoReplyInternal();
      sendResponse({ ok: true });
      return undefined;
    }
    if (msg.type === "DM_AUTO_REPLY_START") {
      if (!isSupportedDmHost(location.hostname)) {
        sendResponse({
          ok: false,
          error: `当前页面不支持自动回复: ${location.hostname}`,
        });
        return undefined;
      }
      if (!isTwitterDmHost(location.hostname)) {
        sendResponse({
          ok: false,
          error: "自动回复目前仅支持 X / Twitter 私信页。",
        });
        return undefined;
      }
      startAutoReplyInternal();
      sendResponse({ ok: true });
      return undefined;
    }

    if (msg.type === "DM_AUTO_SEND_STOP") {
      stopInternal();
      sendResponse({ ok: true });
      return undefined;
    }
    if (msg.type !== "DM_AUTO_SEND_START") return undefined;

    if (!isSupportedDmHost(location.hostname)) {
      sendResponse({
        ok: false,
        error: `当前页面不支持自动发送: ${location.hostname}`,
      });
      return undefined;
    }

    const intervalMs = Math.max(
      DM_AUTO_SEND_MIN_INTERVAL_MS,
      msg.payload.intervalMs
    );
    stopInternal();
    running = true;
    payload = { ...msg.payload, intervalMs };

    function installDmAutoSendIntervalFallback(): void {
      if (!running || !payload || intervalId !== null) return;
      window.setTimeout(() => {
        void tick();
      }, DM_AUTO_SEND_INITIAL_DELAY_MS);
      intervalId = window.setInterval(() => {
        void tick();
      }, intervalMs);
    }

    if (intervalMs >= DM_AUTO_SEND_USE_ALARMS_MIN_MS) {
      const arm: DmContentToBgMessage = {
        type: "DM_AUTO_SEND_BG_ARM",
        intervalMs,
        initialDelayMs: DM_AUTO_SEND_INITIAL_DELAY_MS,
      };
      void chrome.runtime
        .sendMessage(arm)
        .then((res: unknown) => {
          if (
            res &&
            typeof res === "object" &&
            "ok" in res &&
            (res as { ok: boolean }).ok === false
          ) {
            console.warn("[dmAutoSend] alarms 注册被拒绝，回退 setInterval");
            installDmAutoSendIntervalFallback();
          }
        })
        .catch((e) => {
          console.warn("[dmAutoSend] alarms 不可用，回退 setInterval:", e);
          installDmAutoSendIntervalFallback();
        });
    } else {
      installDmAutoSendIntervalFallback();
    }

    sendResponse({ ok: true });
    return undefined;
  }
);
