"use client";
import { useRef } from "react";

export function ReplyForm({ patientId, action }: { patientId: string; action: (fd: FormData) => Promise<void> }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={async (fd) => { await action(fd); ref.current?.reset(); }} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <textarea name="body" rows={3} placeholder="اكتبي ردّك للمريضة…" required maxLength={1000} />
      <button className="btn self-end">إرسال</button>
    </form>
  );
}
