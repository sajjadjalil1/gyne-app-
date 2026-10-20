"use client";
import { useRef, useState } from "react";
import { FORMULARY, TIMING_LABEL, formularyItem } from "@gyne/core";

/** Add-medicine form: picks a formulary item, prefills dose and timing, lets the doctor set start/stop by week or date. */
export function RxForm({ patientId, pregnant, action }: { patientId: string; pregnant: boolean; action: (fd: FormData) => Promise<void> }) {
  const ref = useRef<HTMLFormElement>(null);
  const [drug, setDrug] = useState("IRON");
  const [open, setOpen] = useState(false);
  const f = formularyItem(drug);
  if (!open) return <button type="button" className="btn btn-ghost text-sm" onClick={() => setOpen(true)}>+ وصف دواء</button>;
  return (
    <form ref={ref} action={async (fd) => { await action(fd); ref.current?.reset(); setOpen(false); }} className="glass p-3 grid sm:grid-cols-2 gap-2 text-sm">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="flex flex-col gap-1">الدواء
        <select name="drug" value={drug} onChange={(e) => setDrug(e.target.value)}>{FORMULARY.map((x) => <option key={x.key} value={x.key}>{x.emoji} {x.label}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1">الاسم كما تراه المريضة<input name="label" placeholder={f.label} /></label>
      <label className="flex flex-col gap-1">الجرعة<input name="dose" defaultValue={f.defaultDose} key={drug + "d"} /></label>
      <label className="flex flex-col gap-1">التركيز<input name="strength" placeholder="75 mg" /></label>
      <label className="flex flex-col gap-1">مرات باليوم<input name="timesPerDay" type="number" min={1} max={4} defaultValue={f.timesPerDay} key={drug + "n"} /></label>
      <label className="flex flex-col gap-1">التوقيت
        <select name="timing" defaultValue={f.timing} key={drug + "t"}>{(Object.keys(TIMING_LABEL) as (keyof typeof TIMING_LABEL)[]).map((k) => <option key={k} value={k}>{TIMING_LABEL[k]}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1">أوقات ثابتة (اختياري)<input name="times" placeholder="10:30, 21:00" dir="ltr" /></label>
      {pregnant ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">من أسبوع<input name="startWeek" type="number" min={1} max={42} /></label>
          <label className="flex flex-col gap-1">إلى أسبوع<input name="stopWeek" type="number" min={1} max={42} /></label>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">من تاريخ<input name="startAt" type="date" /></label>
          <label className="flex flex-col gap-1">إلى تاريخ<input name="stopAt" type="date" /></label>
        </div>
      )}
      <label className="flex flex-col gap-1">الدواعي (للطبيب فقط)<input name="indication" placeholder="preeclampsia prophylaxis" /></label>
      <label className="flex flex-col gap-1">الأهمية
        <select name="criticality" defaultValue={f.criticality} key={drug + "c"}><option value="NORMAL">عادية (لا تظهر الفوائت في قائمة العمل)</option><option value="HIGH">مهمة (3 أيام فائتة تظهر في قائمة العمل)</option></select>
      </label>
      <label className="flex flex-col gap-1">عدد الحبات المصروفة<input name="supplyCount" type="number" min={1} /></label>
      <div className="sm:col-span-2 flex gap-2 justify-end"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>إلغاء</button><button className="btn">حفظ الوصفة</button></div>
    </form>
  );
}
