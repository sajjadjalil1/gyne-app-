"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "password" | "mfa" | "first-phone" | "first-sms" | "first-password" | "first-qr" | "recovery";

async function post(url: string, body: unknown): Promise<{ ok: boolean; j: Record<string, unknown> }> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

/**
 * Staff sign-in.
 * Daily: phone + password, then the 6-digit code from the authenticator app (or a recovery code).
 * First time: SMS code to prove the phone, choose a password, scan the QR, confirm one code, save the recovery codes.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [qr, setQr] = useState<{ img: string; secret: string } | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const go = (s: Step) => { setStep(s); setError(null); setCode(""); };
  const enter = () => {
    const next = params.get("next");
    // Only same-site dashboard paths: "?next=https://evil" or "//evil" must not leave the app.
    router.replace(next && /^\/doctor(\/|$|\?)/.test(next) ? next : "/doctor");
  };
  async function run(e: FormEvent, fn: () => Promise<void>) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await fn(); } catch { setError("تعذّر الاتصال. حاول مرة ثانية."); }
    setBusy(false);
  }
  const err = (j: Record<string, unknown>, fallback: string) => setError((j.error as string) ?? fallback);

  const login = (e: FormEvent) => run(e, async () => {
    const { ok, j } = await post("/api/auth/staff/login", { phone, password });
    if (!ok) return err(j, "تعذّر الدخول");
    setToken(j.mfaToken as string); setPassword(""); go("mfa");
  });
  const mfa = (e: FormEvent) => run(e, async () => {
    const { ok, j } = await post("/api/auth/staff/mfa", { mfaToken: token, code });
    if (!ok) return err(j, "الرمز غير صحيح");
    if (typeof j.recoveryLeft === "number" && j.recoveryLeft <= 3) {
      setNote(`بقى عندك ${j.recoveryLeft} رموز احتياطية بس. إذا ضاع الموبايل، مسؤول السيرفر يگدر يعيد ضبط دخولك.`);
    }
    enter();
  });
  const sendSms = (e: FormEvent) => run(e, async () => {
    const { ok, j } = await post("/api/auth/otp/request", { phone });
    if (!ok) return err(j, "تعذّر الإرسال");
    setNote(j.devCode ? `وضع التطوير: الرمز هو ${j.devCode}` : null);
    go("first-sms");
  });
  const checkSms = (e: FormEvent) => run(e, async () => {
    const { ok, j } = await post("/api/auth/otp/verify", { phone, code, client: "web" });
    if (!ok) return err(j, "الرمز غير صحيح");
    setNote(null); setToken(j.setupToken as string); go("first-password");
  });
  const savePassword = (e: FormEvent) => run(e, async () => {
    if (password !== password2) return setError("كلمتا السر مو نفس الشي");
    const { ok, j } = await post("/api/auth/staff/setup", { setupToken: token, password });
    if (!ok) return err(j, "تعذّر الحفظ");
    setToken(j.setupToken as string); setQr({ img: j.qr as string, secret: j.secret as string }); setPassword(""); setPassword2(""); go("first-qr");
  });
  const confirm = (e: FormEvent) => run(e, async () => {
    const { ok, j } = await post("/api/auth/staff/setup/confirm", { setupToken: token, code });
    if (!ok) return err(j, "الرمز غير صحيح");
    setRecovery(j.recoveryCodes as string[]); setQr(null); go("recovery");
  });

  const titles: Record<Step, [string, string]> = {
    password: ["دخول طاقم العيادة", "رقم هاتفك وكلمة السر."],
    mfa: ["رمز التطبيق", "افتح تطبيق المصادقة واكتب الرمز الحالي (6 أرقام). إذا ضاع موبايلك اكتب رمز احتياطي."],
    "first-phone": ["أول دخول", "نرسل رمز على هاتفك حتى نتأكد إنه رقمك، وبعدها تختار كلمة سر وتربط تطبيق المصادقة."],
    "first-sms": ["رمز الرسالة", "اكتب الرمز اللي وصلك برسالة."],
    "first-password": ["اختار كلمة سر", "10 أحرف أو أكثر. جملة قصيرة تتذكرها أحسن من كلمة معقدة."],
    "first-qr": ["اربط تطبيق المصادقة", "افتح Google Authenticator أو Microsoft Authenticator، اختار إضافة حساب، وصوّر هذا الرمز. بعدها اكتب الرمز اللي يطلع بالتطبيق."],
    recovery: ["رموز احتياطية", "احفظها بمكان آمن (ورقة أو مدير كلمات سر). كل رمز يشتغل مرة وحدة إذا ضاع موبايلك. ما راح تشوفها مرة ثانية."],
  };

  const codeInput = (allowRecovery = false) => (
    <input id="code" inputMode={allowRecovery ? "text" : "numeric"} autoComplete="one-time-code" dir="ltr" maxLength={allowRecovery ? 12 : 6} value={code} onChange={(e) => setCode(e.target.value)} required autoFocus className="text-center tracking-[.4em] text-lg" />
  );
  const Form = ({ onSubmit, children, label }: { onSubmit: (e: FormEvent) => void; children: ReactNode; label: string }) => (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">{children}<button className="btn mt-2" disabled={busy}>{busy ? "لحظة…" : label}</button></form>
  );
  const phoneInput = <><label className="text-sm text-muted" htmlFor="phone">رقم الهاتف</label><input id="phone" inputMode="tel" autoComplete="username" dir="ltr" placeholder="07801234567" value={phone} onChange={(e) => setPhone(e.target.value)} required /></>;

  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="glass-lg w-full max-w-sm p-7 flex flex-col gap-5">
        <div>
          <div className="w-12 h-12 rounded-full bg-lav text-white grid place-items-center text-lg font-bold mb-3">ع</div>
          <h1 className="text-xl font-semibold">{titles[step][0]}</h1>
          <p className="text-muted text-sm mt-1">{titles[step][1]}</p>
        </div>

        {step === "password" && (
          <>
            {Form({ onSubmit: login, label: "التالي", children: <>{phoneInput}<label className="text-sm text-muted" htmlFor="pw">كلمة السر</label><input id="pw" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required /></> })}
            <button type="button" className="btn btn-ghost" onClick={() => go("first-phone")}>أول مرة؟ فعّل حسابك</button>
          </>
        )}
        {step === "mfa" && (
          <>
            {Form({ onSubmit: mfa, label: "دخول", children: <><label className="text-sm text-muted" htmlFor="code">الرمز</label>{codeInput(true)}</> })}
            <button type="button" className="btn btn-ghost" onClick={() => go("password")}>رجوع</button>
          </>
        )}
        {step === "first-phone" && (
          <>
            {Form({ onSubmit: sendSms, label: "أرسل الرمز", children: phoneInput })}
            <button type="button" className="btn btn-ghost" onClick={() => go("password")}>عندي كلمة سر</button>
          </>
        )}
        {step === "first-sms" && Form({ onSubmit: checkSms, label: "التالي", children: <><label className="text-sm text-muted" htmlFor="code">رمز الرسالة</label>{codeInput()}</> })}
        {step === "first-password" && Form({ onSubmit: savePassword, label: "حفظ", children: <>
          <label className="text-sm text-muted" htmlFor="npw">كلمة السر الجديدة</label><input id="npw" type="password" autoComplete="new-password" dir="ltr" minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          <label className="text-sm text-muted" htmlFor="npw2">أعد كتابتها</label><input id="npw2" type="password" autoComplete="new-password" dir="ltr" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
        </> })}
        {step === "first-qr" && qr && Form({ onSubmit: confirm, label: "تفعيل", children: <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.img} alt="رمز QR لتطبيق المصادقة" width={200} height={200} className="mx-auto rounded-xl bg-white p-2" />
          <p className="text-xs text-muted text-center">ما يشتغل التصوير؟ اكتب هذا المفتاح بالتطبيق:<br /><b className="num" dir="ltr">{qr.secret}</b></p>
          <label className="text-sm text-muted" htmlFor="code">الرمز من التطبيق</label>{codeInput()}
        </> })}
        {step === "recovery" && (
          <div className="flex flex-col gap-3">
            <ol className="grid grid-cols-2 gap-2 num text-center" dir="ltr">{recovery.map((c) => <li key={c} className="glass py-1.5 font-mono text-sm">{c}</li>)}</ol>
            <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(recovery.join("\n"))}>نسخ الرموز</button>
            <button type="button" className="btn" onClick={enter}>حفظتها، ادخل</button>
          </div>
        )}

        {note && <p className="text-xs text-muted">{note}</p>}
        {error && <p className="text-crit text-sm">{error}</p>}
      </div>
    </main>
  );
}
