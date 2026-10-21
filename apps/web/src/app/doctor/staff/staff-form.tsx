"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { addStaff } from "./actions";

const label = "text-sm text-muted";

export function StaffForm() {
  const [state, action, pending] = useActionState(addStaff, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="flex flex-col gap-3 max-w-md">
      <label className={label} htmlFor="name">الاسم</label>
      <input id="name" name="name" required minLength={2} maxLength={80} placeholder="مثلاً: الممرضة هبة" />
      <label className={label} htmlFor="phone">رقم الموبايل</label>
      <input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="07801234567" required />
      <label className={label} htmlFor="role">الدور</label>
      <select id="role" name="role" defaultValue="RECEPTION">
        <option value="RECEPTION">استقبال (المواعيد بس)</option>
        <option value="NURSE">ممرضة (الملفات والرسائل، بدون وصفات)</option>
        <option value="DOCTOR">طبيب (كل شي)</option>
      </select>
      {state?.error && <p className="text-sm text-crit" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok" role="status">{state.ok}</p>}
      <button className="btn self-start mt-2" disabled={pending}>{pending ? "يحفظ…" : "إضافة"}</button>
    </form>
  );
}
