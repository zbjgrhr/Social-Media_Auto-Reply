/**
 * Page-DOM helpers for DM auto-send (content script context only).
 * No chrome.* APIs here.
 */

export const DM_AUTO_SEND_MIN_INTERVAL_MS = 5_000;

/** React 受控的 input/textarea 需走原型 setter，否则界面与内部 state 不同步（中英合并含换行时尤易坏）。 */
function setNativeFormControlValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string
): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  el.focus();
  if (setter) {
    setter.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setter.call(el, text);
  } else {
    el.value = text;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function isSupportedDmHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "x.com" || h === "www.x.com") return true;
  if (h === "twitter.com" || h === "www.twitter.com") return true;
  if (h === "instagram.com" || h === "www.instagram.com") return true;
  if (h.endsWith("facebook.com") || h.endsWith("messenger.com")) return true;
  return false;
}

function setEditableText(el: HTMLElement, text: string): void {
  el.focus();
  const doc = el.ownerDocument;
  if (
    el.isContentEditable ||
    el.getAttribute("contenteditable") === "true"
  ) {
    const sel = doc.getSelection();
    const range = doc.createRange();
    if (el.childNodes.length) {
      range.selectNodeContents(el);
    } else {
      range.setStart(el, 0);
      range.setEnd(el, 0);
    }
    sel?.removeAllRanges();
    sel?.addRange(range);
    if (
      doc.queryCommandSupported?.("insertText") &&
      doc.execCommand("insertText", false, text)
    ) {
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: text,
        })
      );
      return;
    }
    el.textContent = text;
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text,
      })
    );
    return;
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeFormControlValue(el, text);
  }
}

/** X/Twitter DM 多为 Draft.js：清空子节点再插入文本节点，并派发 beforeinput/input。 */
function setTwitterDmText(el: HTMLElement, text: string): void {
  el.focus();
  const doc = el.ownerDocument;
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(doc.createTextNode(text));
  el.dispatchEvent(
    new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: text,
    })
  );
  el.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: text,
    })
  );
}

/** 在单个 root 内查找（不含子 iframe / 嵌套 shadow）。 */
function queryTwitterComposerInRoot(root: Document | ShadowRoot): HTMLElement | null {
  /** XChat `/i/chat`：Jetfuel 私信框为 textarea，不再是 contenteditable。 */
  const earlySelectors = [
    'textarea[data-testid="dm-composer-textarea"]',
    '[data-testid="dm-composer-form"] textarea',
    '[data-testid="dm-composer-container"] textarea',
  ];
  for (const sel of earlySelectors) {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) return el;
  }

  const legacyIds = ["dmComposerTextInput", "dmComposerTextInput_Enter"];
  for (const id of legacyIds) {
    const el = root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (el) return el;
  }
  const fuzzy = root.querySelectorAll<HTMLElement>(
    '[data-testid^="dmComposer"][role="textbox"], [data-testid*="dmComposerTextInput"]'
  );
  for (const el of Array.from(fuzzy)) {
    if (el.getAttribute("contenteditable") === "true" || el.isContentEditable) {
      return el;
    }
  }
  return null;
}

function enqueueTwitterSearchRoots(
  root: Document | ShadowRoot,
  queue: Array<Document | ShadowRoot>,
  visited: Set<Document | ShadowRoot>
): void {
  const nodes = root.querySelectorAll("*");
  for (let i = 0; i < nodes.length; i += 1) {
    const sr = nodes[i]!.shadowRoot;
    if (sr && !visited.has(sr)) {
      queue.push(sr);
    }
  }
  const frames = root.querySelectorAll("iframe,frame");
  for (let i = 0; i < frames.length; i += 1) {
    try {
      const idoc = (frames[i] as HTMLIFrameElement).contentDocument;
      if (idoc && !visited.has(idoc)) {
        queue.push(idoc);
      }
    } catch {
      /* 跨域 iframe 无法遍历 */
    }
  }
}

/**
 * Jetfuel 可能把 composer 放在同源子 iframe 或 open shadow 内；
 * 仅用 `document` 会找不到或找到后仍在顶层 `document` 点发送导致失败。
 */
function queryTwitterComposer(): HTMLElement | null {
  const visited = new Set<Document | ShadowRoot>();
  const queue: Array<Document | ShadowRoot> = [document];
  while (queue.length > 0) {
    const root = queue.shift()!;
    if (visited.has(root)) continue;
    visited.add(root);
    const found = queryTwitterComposerInRoot(root);
    if (found) return found;
    enqueueTwitterSearchRoots(root, queue, visited);
  }
  return null;
}

function queryTwitterSendButtonInRoot(root: Document | ShadowRoot): HTMLElement | null {
  const selectors = [
    'form[data-testid="dm-composer-form"] button[type="submit"]',
    '[data-testid="dm-composer-container"] button[type="submit"]',
    'button[data-testid="dmComposerSendButton"]',
    'button[data-testid="dmComposerSendButton_Action"]',
    'div[role="button"][data-testid="dmComposerSendButton"]',
  ];
  for (const sel of selectors) {
    const b = root.querySelector<HTMLElement>(sel);
    if (b) return b;
  }
  return null;
}

/** 按钮可能与输入框同在 shadow 内，不能只在 `document` 上 query。 */
function queryTwitterSendButtonForComposer(input: HTMLElement): HTMLElement | null {
  const rn = input.getRootNode();
  if (rn instanceof ShadowRoot) {
    const b = queryTwitterSendButtonInRoot(rn);
    if (b) return b;
  }
  return queryTwitterSendButtonInRoot(input.ownerDocument);
}

/** 新版 XChat 有时仅响应 Enter 提交。 */
function tryTwitterSendEnterKey(textarea: HTMLTextAreaElement): void {
  const evInit: KeyboardEventInit = {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  };
  textarea.focus();
  textarea.dispatchEvent(new KeyboardEvent("keydown", evInit));
  textarea.dispatchEvent(new KeyboardEvent("keypress", evInit));
  textarea.dispatchEvent(new KeyboardEvent("keyup", evInit));
}

function tryClickTwitterSendForComposer(input: HTMLElement): boolean {
  const btn = queryTwitterSendButtonForComposer(input);
  if (!btn) return false;
  if (btn instanceof HTMLButtonElement && btn.disabled) return false;
  if (btn.getAttribute("aria-disabled") === "true") return false;
  btn.click();
  return true;
}

/** 最小化 / 切走标签时 document 为 hidden；此时 rAF 常被暂停，应用 timer 驱动发送与重试。 */
function isComposerDocumentHidden(doc: Document): boolean {
  return doc.visibilityState === "hidden";
}

/** React 更新后发送按钮才可用：仅在未成功点击时重试，避免连发两条。 */
function scheduleTwitterSendUntilOk(
  input: HTMLElement,
  maxAttempts: number,
  delayMs: number,
  opts?: { enterFallback?: HTMLTextAreaElement; hidden?: boolean }
): void {
  const attempts = opts?.hidden ? 24 : maxAttempts;
  const delay = opts?.hidden ? 250 : delayMs;
  let n = 0;
  const step = (): void => {
    if (tryClickTwitterSendForComposer(input)) return;
    n += 1;
    if (n < attempts) {
      window.setTimeout(step, delay);
    } else if (opts?.enterFallback) {
      tryTwitterSendEnterKey(opts.enterFallback);
    }
  };
  window.setTimeout(step, delay);
}

/** XChat 首屏常晚于 content script：在超时内轮询再填发。 */
const TWITTER_COMPOSER_WAIT_MS = 15_000;
const TWITTER_COMPOSER_POLL_MS = 150;

/**
 * 前台仍用 rAF 迁就 Jetfuel/React 一帧内启用发送按钮；`visibilityState === "hidden"`
 * 时 rAF 不可靠，改用 `setTimeout(0)` 触发首击并重试（后台标签的 timer 仍可能被节流）。
 */
function sendWithTwitterComposer(input: HTMLElement, text: string): void {
  const doc = input.ownerDocument;
  const hiddenNow = isComposerDocumentHidden(doc);
  const raf =
    doc.defaultView?.requestAnimationFrame.bind(doc.defaultView) ??
    window.requestAnimationFrame.bind(window);

  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    setEditableText(input, text);
    const enterFallback =
      input instanceof HTMLTextAreaElement ? input : undefined;
    const trySend = (): void => {
      const hidden = isComposerDocumentHidden(doc);
      if (!tryClickTwitterSendForComposer(input)) {
        scheduleTwitterSendUntilOk(input, 12, 100, { enterFallback, hidden });
      }
    };
    if (hiddenNow) {
      window.setTimeout(trySend, 0);
    } else {
      raf(trySend);
    }
  } else {
    setTwitterDmText(input, text);
    const afterText = (): void => {
      const hidden = isComposerDocumentHidden(doc);
      if (!tryClickTwitterSendForComposer(input)) {
        scheduleTwitterSendUntilOk(input, 12, 100, { hidden });
      }
    };
    if (hiddenNow) {
      window.setTimeout(afterText, 0);
    } else {
      afterText();
    }
  }
}

async function waitForTwitterComposer(
  maxWaitMs: number,
  stepMs: number
): Promise<HTMLElement | null> {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    const el = queryTwitterComposer();
    if (el) return el;
    if (Date.now() >= deadline) return null;
    await new Promise<void>((resolve) => setTimeout(resolve, stepMs));
  }
}

async function tryTwitterXAsync(
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = await waitForTwitterComposer(
    TWITTER_COMPOSER_WAIT_MS,
    TWITTER_COMPOSER_POLL_MS
  );
  if (!input) {
    return {
      ok: false,
      error:
        "X/Twitter: 未找到私信输入框。请打开具体对话；若界面已改版请反馈。",
    };
  }
  sendWithTwitterComposer(input, text);
  return { ok: true };
}

function tryTwitterX(text: string): { ok: true } | { ok: false; error: string } {
  const input = queryTwitterComposer();
  if (!input) {
    return {
      ok: false,
      error:
        "X/Twitter: 未找到私信输入框。请打开具体对话；若界面已改版请反馈。",
    };
  }
  sendWithTwitterComposer(input, text);
  return { ok: true };
}

function queryFacebookComposer(): HTMLElement | null {
  const selectors = [
    'div[contenteditable="true"][role="textbox"][aria-label*="essage"]',
    'div[contenteditable="true"][aria-label="Message"]',
    'div[contenteditable="true"][data-lexical-editor="true"]',
    'p[contenteditable="true"][data-lexical-editor="true"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && el.offsetParent !== null) return el;
  }
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'div[contenteditable="true"][role="textbox"]'
    )
  );
  for (const el of candidates) {
    const label = (el.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("message") || label.includes("消息")) return el;
  }
  return null;
}

function clickFacebookSend(): boolean {
  const byAria = document.querySelector<HTMLElement>(
    'div[role="button"][aria-label="Press enter to send"]'
  );
  if (byAria) {
    byAria.click();
    return true;
  }
  const sendSvg = document.querySelector(
    'svg[aria-label="Send"], svg[aria-label="发送"]'
  );
  const btn =
    sendSvg?.closest<HTMLElement>("div[role=button]") ||
    document.querySelector<HTMLElement>(
      'div[role="button"][aria-label="Send"], div[role="button"][aria-label="发送"]'
    );
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

function tryFacebook(text: string): { ok: true } | { ok: false; error: string } {
  const input = queryFacebookComposer();
  if (!input) {
    return { ok: false, error: "Facebook: 未找到私信输入框（请在对话页重试）。" };
  }
  setEditableText(input, text);
  if (!clickFacebookSend()) {
    return { ok: false, error: "Facebook: 未找到发送按钮。" };
  }
  return { ok: true };
}

function queryInstagramComposer(): HTMLElement | null {
  const ta = document.querySelector<HTMLTextAreaElement>(
    'textarea[placeholder*="Message"], textarea[placeholder*="消息"]'
  );
  if (ta) return ta;
  return document.querySelector<HTMLElement>(
    'div[contenteditable="true"][role="textbox"]'
  );
}

function clickInstagramSend(): boolean {
  const btn = document.querySelector<HTMLButtonElement>(
    'div[role="button"] svg[aria-label="Send"]'
  )?.closest<HTMLButtonElement>("button");
  if (btn && !btn.disabled) {
    btn.click();
    return true;
  }
  const divSend = document.querySelector<HTMLElement>(
    'div[role="button"] svg[aria-label="Send"]'
  )?.parentElement;
  if (divSend) {
    divSend.click();
    return true;
  }
  return false;
}

function tryInstagram(text: string): { ok: true } | { ok: false; error: string } {
  const input = queryInstagramComposer();
  if (!input) {
    return { ok: false, error: "Instagram: 未找到私信输入框（请先打开对话）。" };
  }
  setEditableText(input, text);
  if (!clickInstagramSend()) {
    return { ok: false, error: "Instagram: 未找到发送按钮。" };
  }
  return { ok: true };
}

/**
 * Fill the active site's DM composer and click send. Best-effort per host.
 */
export function fillComposerAndSend(
  hostname: string,
  text: string
): { ok: true } | { ok: false; error: string } {
  const h = hostname.toLowerCase();
  if (h === "x.com" || h === "www.x.com" || h === "twitter.com" || h === "www.twitter.com") {
    return tryTwitterX(text);
  }
  if (h === "instagram.com" || h === "www.instagram.com") {
    return tryInstagram(text);
  }
  if (
    h.endsWith("facebook.com") ||
    h.endsWith("messenger.com")
  ) {
    return tryFacebook(text);
  }
  return { ok: false, error: `不支持的站点: ${hostname}` };
}

/**
 * 与 {@link fillComposerAndSend} 相同，但 X/Twitter 会在若干秒内轮询直到出现私信框再填发
 *（适合 Jetfuel 首帧较晚的 `/i/chat`）。
 */
export async function fillComposerAndSendAsync(
  hostname: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const h = hostname.toLowerCase();
  if (h === "x.com" || h === "www.x.com" || h === "twitter.com" || h === "www.twitter.com") {
    return tryTwitterXAsync(text);
  }
  return fillComposerAndSend(hostname, text);
}
