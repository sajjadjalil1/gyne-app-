import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMessages, deadTokens, isExpoToken, pushText, sendExpo } from "../src/lib/push";

const A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const B = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

describe("push notifications", () => {
  beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("accepts only Expo push tokens", () => {
    expect(isExpoToken(A)).toBe(true);
    expect(isExpoToken("ExpoPushToken[xxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isExpoToken("https://evil.example")).toBe(false);
    expect(isExpoToken("ExponentPushToken[<script>]")).toBe(false);
  });
  it("keeps the lock screen generic unless she chose detailed notifications", () => {
    expect(pushText("message", false, "الممرضة هبة: نتيجة التحليل طبيعية").body).not.toContain("التحليل");
    expect(pushText("message", true, "الممرضة هبة: نتيجة التحليل طبيعية").body).toContain("التحليل");
    expect(pushText("message", true, "ا".repeat(300)).body.length).toBeLessThanOrEqual(118);
  });
  it("builds one high-priority message per valid token on the messages channel", () => {
    const m = buildMessages([A, "bad", B], { title: "t", body: "b" }, { kind: "message", id: "m1" });
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ to: A, channelId: "messages", priority: "high", data: { kind: "message", id: "m1" } });
  });
  it("finds the phones where the app was uninstalled", () => {
    const m = buildMessages([A, B], { title: "t", body: "b" }, { kind: "message" });
    expect(deadTokens(m, [{ status: "ok", id: "1" }, { status: "error", details: { error: "DeviceNotRegistered" } }])).toEqual([B]);
  });
  it("sends with a timeout, counts accepted phones and returns the dead tokens", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: [{ status: "ok", id: "1" }, { status: "error", details: { error: "DeviceNotRegistered" } }] }));
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("EXPO_ACCESS_TOKEN", "secret");
    const r = await sendExpo(buildMessages([A, B], { title: "t", body: "b" }, { kind: "message" }));
    expect(r).toEqual({ sent: 1, dead: [B] });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetch.mock.calls[0][1].headers.authorization).toBe("Bearer secret");
  });
  it("splits more than 100 phones into several requests", async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetch);
    const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[${String(i).padStart(12, "x")}]`);
    await sendExpo(buildMessages(tokens, { title: "t", body: "b" }, { kind: "message" }));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("never throws when Expo is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    await expect(sendExpo(buildMessages([A], { title: "t", body: "b" }, { kind: "message" }))).resolves.toEqual({ sent: 0, dead: [] });
  });
});
