import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendSms } from "../src/lib/sms";

describe("SMS gateway call", () => {
  beforeEach(() => {
    vi.stubEnv("SMS_WEBHOOK_URL", "https://gateway.example/send");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("sends once when the gateway answers OK, with a timeout attached", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    await sendSms("07801234567", "code");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("retries once after a gateway error or timeout", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new DOMException("timed out", "TimeoutError")).mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    const p = sendSms("07801234567", "code");
    await vi.runAllTimersAsync();
    await p;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not retry a 4xx (the request itself is wrong)", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", fetch);
    await sendSms("07801234567", "code");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("gives up after two tries and never throws to the login screen", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const p = sendSms("07801234567", "code");
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
