import type { DraftPair } from "./draftGenerator";

export type DmLang = "zh" | "en" | "both";

export interface DmAutoSendStartPayload {
  drafts: DraftPair[];
  lang: DmLang;
  /** Interval between sends in ms; callers should enforce a minimum (e.g. 5s). */
  intervalMs: number;
}

export type DmRuntimeMessage =
  | { type: "DM_AUTO_SEND_START"; payload: DmAutoSendStartPayload }
  | { type: "DM_AUTO_SEND_STOP" }
  /** Service worker → content：墙钟周期触发一轮 START 发送（与侧栏消息同源扩展通道）。 */
  | { type: "DM_AUTO_SEND_ALARM_TICK" }
  | { type: "DM_AUTO_REPLY_START" }
  | { type: "DM_AUTO_REPLY_STOP" };

/** Content script → service worker（仅扩展内部使用）。 */
export type DmContentToBgMessage =
  | {
      type: "DM_AUTO_SEND_BG_ARM";
      intervalMs: number;
      initialDelayMs: number;
    }
  | { type: "DM_AUTO_SEND_BG_CLEAR" };

export type DmStartResponse = { ok: true } | { ok: false; error: string };
