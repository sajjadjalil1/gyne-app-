"use client";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function requestOtp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const r = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "تعذّر الإرسال");
    if (j.devCode) setDevCode(j.devCode);
    setStep("code");
  }
  async function verify(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const r = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, code, client: "web" }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "الرمز غير صحيح");
    const next = params.get("next");
    // Only same-site dashboard paths: "?next=https://evil" or "//evil" must not leave the app.
    router.replace(next && /^\/doctor(\/|$|\?)/.test(next) ? next : "/doctor");
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="glass-lg w-full max-w-sm p-7 flex flex-col gap-5">
        <div>
          <div className="w-12 h-12 rounded-full bg-lav text-white grid place-items-center text-lg font-bold mb-3">ع</div>
          <h1 className="text-xl font-semibold">دخول طاقم العيادة</h1>
          <p className="text-muted text-sm mt-1">يصلك رمز بستّة أرقام على هاتفك.</p>
        </div>
        {step === "phone" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-3">
            <label className="text-sm text-muted" htmlFor="phone">رقم الهاتف</label>
            <input id="phone" inputMode="tel" dir="ltr" placeholder="07801234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <button className="btn mt-2" disabled={busy}>{busy ? "جارٍ الإرسال…" : "أرسل الرمز"}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-3">
            <label className="text-sm text-muted" htmlFor="code">رمز الدخول</label>
            <input id="code" inputMode="numeric" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required className="text-center tracking-[.4em] text-lg" />
            {devCode && <p className="text-xs text-muted">وضع التطوير: الرمز هو <b className="num" dir="ltr">{devCode}</b></p>}
            <button className="btn mt-2" disabled={busy}>{busy ? "جارٍ التحقق…" : "دخول"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep("phone")}>تغيير الرقم</button>
          </form>
        )}
        {error && <p className="text-crit text-sm">{error}</p>}
      </div>
    </main>
  );
}
