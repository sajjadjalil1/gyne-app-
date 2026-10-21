import { prisma } from "@gyne/db";
import { requireStaffPage } from "@/lib/staff";
import { PRESCRIBERS } from "@/lib/roles";
import { Shell } from "@/components/shell";
import { Avatar } from "@/components/severity";
import { StaffForm } from "./staff-form";
import { setStaffActive } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { DOCTOR: "طبيب", NURSE: "ممرضة", RECEPTION: "استقبال", PATIENT: "مريضة" } as const;

export default async function Staff() {
  const user = await requireStaffPage(PRESCRIBERS);
  const staff = await prisma.user.findMany({
    where: { clinicId: user.clinicId, role: { not: "PATIENT" } },
    select: { id: true, name: true, phone: true, role: true, totpEnabledAt: true, disabledAt: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <Shell user={user} clinic={user.clinic} active="staff">
      <div className="grid lg:grid-cols-2 gap-4">
        <section className="glass-lg p-5">
          <h1 className="text-lg font-semibold mb-4">طاقم العيادة</h1>
          <div className="flex flex-col gap-2">
            {staff.map((s) => (
              <div key={s.id} className={`glass p-3 flex items-center gap-3 ${s.disabledAt ? "opacity-60" : ""}`}>
                <Avatar name={s.name} tone="bg-lav" />
                <span className="min-w-0 flex-1"><span className="font-medium">{s.name}</span><span className="text-xs text-muted ms-2">{ROLE_LABEL[s.role]}</span><br />
                  <span className="text-xs text-faint num" dir="ltr">{s.phone}</span></span>
                {s.disabledAt
                  ? <span className="text-xs text-crit">موقوف</span>
                  : <span className={`text-xs ${s.totpEnabledAt ? "text-ok" : "text-faint"}`}>{s.totpEnabledAt ? "مفعّل" : "ما فعّل بعد"}</span>}
                {s.id !== user.id && (
                  <form action={setStaffActive}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={s.disabledAt ? "1" : "0"} />
                    <button className="chip text-xs" title={s.disabledAt ? "يرجع يكدر يدخل بنفس كلمة السر وتطبيق المصادقة" : "يطلع من كل الأجهزة فوراً وما يكدر يدخل"}>{s.disabledAt ? "إرجاع" : "إيقاف"}</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="glass-lg p-5">
          <h2 className="text-lg font-semibold mb-1">إضافة موظف</h2>
          <p className="text-sm text-muted mb-4">يدخل أول مرة برمز يوصله برسالة، بعدين يختار كلمة سر ويربط تطبيق المصادقة.</p>
          <StaffForm />
        </section>
      </div>
    </Shell>
  );
}
