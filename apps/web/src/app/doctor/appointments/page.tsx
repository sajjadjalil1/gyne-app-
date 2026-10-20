import Link from "next/link";
import { prisma } from "@gyne/db";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { requireStaffPage } from "@/lib/staff";
import { FRONT_DESK } from "@/lib/roles";
import { Shell } from "@/components/shell";
import { APPT_TYPE_LABEL, fmtDate, fmtTime } from "@gyne/core";

export const dynamic = "force-dynamic";

export default async function Appointments() {
  const user = await requireStaffPage(FRONT_DESK);
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i));
  const appts = await prisma.appointment.findMany({ where: { patient: { clinicId: user.clinicId }, startsAt: { gte: days[0], lte: endOfDay(days[6]) } }, include: { patient: true }, orderBy: { startsAt: "asc" } });
  return (
    <Shell user={user} clinic={user.clinic} active="appts">
      <section className="glass-lg p-5">
        <h1 className="text-lg font-semibold mb-4">المواعيد، الأسبوع القادم</h1>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {days.map((d) => {
            const list = appts.filter((a) => a.startsAt >= d && a.startsAt <= endOfDay(d));
            return (
              <div key={d.toISOString()} className="glass p-3">
                <div className="font-semibold mb-2">{fmtDate(d, { weekday: true, year: false })} <span className="text-muted text-xs font-normal num">({list.length})</span></div>
                <div className="flex flex-col gap-1">
                  {list.length === 0 && <span className="text-faint text-xs">لا مواعيد</span>}
                  {list.map((a) => (
                    <Link key={a.id} href={`/doctor/patients/${a.patientId}`} className="flex gap-2 text-sm py-1 border-t border-(--glass-line) first:border-0">
                      <span className="num w-16 text-muted">{fmtTime(a.startsAt)}</span><span className="flex-1 min-w-0 truncate">{a.patient.name}</span><span className="text-xs text-faint">{APPT_TYPE_LABEL[a.type]}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}
