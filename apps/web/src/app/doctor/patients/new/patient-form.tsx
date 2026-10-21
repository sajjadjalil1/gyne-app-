"use client";
import { startTransition, useActionState, useState } from "react";
import { addPatient } from "./actions";

const label = "text-sm text-muted";

export function PatientForm() {
  const [state, action, pending] = useActionState(addPatient, undefined);
  const [mode, setMode] = useState<"pregnancy" | "cycle">("pregnancy");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="flex flex-col gap-3 max-w-md">
      <label className={label} htmlFor="name">الاسم الثلاثي</label>
      <input id="name" name="name" required minLength={2} maxLength={80} />
      <label className={label} htmlFor="phone">رقم الموبايل (هو اللي تدخل بيه على التطبيق)</label>
      <input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="07801234567" required />
      <label className={label} htmlFor="birthDate">تاريخ الميلاد</label>
      <input id="birthDate" name="birthDate" type="date" dir="ltr" required />
      <label className={label} htmlFor="bloodGroup">فصيلة الدم (اختياري)</label>
      <select id="bloodGroup" name="bloodGroup" defaultValue="" dir="ltr">
        <option value="">لا أعرف</option>
        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      <div className="flex gap-2 mt-2">
        <button type="button" className="chip" data-on={mode === "pregnancy"} onClick={() => setMode("pregnancy")}>حامل</button>
        <button type="button" className="chip" data-on={mode === "cycle"} onClick={() => setMode("cycle")}>متابعة دورة أو منع حمل</button>
      </div>
      <input type="hidden" name="mode" value={mode} />

      {mode === "pregnancy" ? (
        <>
          <label className={label} htmlFor="lmp">أول يوم من آخر دورة</label>
          <input id="lmp" name="lmp" type="date" dir="ltr" />
          <p className="text-xs text-faint">أو إذا عندها سونار مبكر:</p>
          <div className="flex gap-2">
            <span className="flex-1 flex flex-col gap-1"><label className={label} htmlFor="usDate">تاريخ السونار</label><input id="usDate" name="usDate" type="date" dir="ltr" /></span>
            <span className="w-28 flex flex-col gap-1"><label className={label} htmlFor="usWeeks">عمر الحمل (أسابيع)</label><input id="usWeeks" name="usWeeks" type="number" min={5} max={40} dir="ltr" /></span>
          </div>
        </>
      ) : (
        <>
          <label className={label} htmlFor="lastPeriod">أول يوم من آخر دورة (اختياري)</label>
          <input id="lastPeriod" name="lastPeriod" type="date" dir="ltr" />
        </>
      )}

      {state?.error && <p className="text-sm text-crit" role="alert">{state.error}</p>}
      <button className="btn self-start mt-2" disabled={pending}>{pending ? "يحفظ…" : "إضافة المريضة"}</button>
    </form>
  );
}
