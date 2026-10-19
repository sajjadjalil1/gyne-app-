import Link from "next/link";
import { requireStaffPage } from "@/lib/staff";
import { buildWorklist } from "@/lib/worklist";
import { Shell } from "@/components/shell";
import { Avatar, sevColor } from "@/components/severity";
import { relTime, fmtTime, APPT_TYPE_LABEL } from "@gyne/core";

export const dynamic = "force-dynamic";

export default async function Worklist() {
  const user = await requireStaffPage();
  const { items, stats, todayAppts } = await buildWorklist(user.clinicId);
  return (
    <Shell user={user} clinic={user.clinic} active="work">
      <section className="glass-lg p-5 flex flex-col gap-4">
        <div className="flex items-baseline gap-3"><h1 className="text-lg font-semibold">قائمة العمل اليوم</h1><span className="text-muted text-sm">مرتّبة حسب الأولوية</span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat k="تحتاج تدخّلاً" v={stats.critical} crit />
          <Stat k="مواعيد اليوم" v={stats.apptsToday} sub={stats.noShows ? `${stats.noShows} غياب` : undefined} />
          <Stat k="حوامل تحت المتابعة" v={stats.pregnant} />
          <Stat k="تجديد منع حمل خلال 30 يوماً" v={stats.contraDue} />
        </div>
        <div className="flex flex-col gap-2">
          {items.length === 0 && <p className="text-muted text-sm py-6 text-center">لا شيء يحتاج انتباهك الآن.</p>}
          {items.map((it, i) => (
            <Link key={i} href={`/doctor/patients/${it.patientId}`} className="glass grid grid-cols-[44px_1fr_auto] gap-3 items-center p-3 hover:bg-lav-soft transition-colors">
              <Avatar name={it.patientName} tone={sevColor[it.severity]} />
              <span className="min-w-0">
                <span className="font-semibold">{it.patientName}</span><span className="text-faint text-xs ms-2 num">{it.patientAge} س</span>
                {it.gaLabel && <span className="tag bg-lav ms-2 num">حمل {it.gaLabel}</span>}
                <br />
                <span className="text-sm text-muted"><b className="text-fg font-medium">{it.title}</b> · {it.detail}</span>
              </span>
              <span className="text-faint text-xs whitespace-nowrap">{relTime(it.at)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="glass-lg p-5 mt-5">
        <h2 className="font-semibold mb-3">مواعيد اليوم <span className="text-muted text-sm font-normal num">({todayAppts.length})</span></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {todayAppts.map((a) => (
            <Link key={a.id} href={`/doctor/patients/${a.patientId}`} className="glass p-3 flex items-center gap-3">
              <span className="num text-sm font-semibold w-16">{fmtTime(a.startsAt)}</span>
              <span className="min-w-0 flex-1"><span className="font-medium">{a.patient.name}</span><br /><span className="text-xs text-muted">{APPT_TYPE_LABEL[a.type]}{a.reason ? ` · ${a.reason}` : ""}</span></span>
              {a.status === "NO_SHOW" && <span className="tag bg-faint">غياب</span>}
              {a.status === "COMPLETED" && <span className="tag bg-ok">تمت</span>}
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ k, v, sub, crit }: { k: string; v: number; sub?: string; crit?: boolean }) {
  return <div className="glass p-3"><div className="text-xs text-muted">{k}</div><div className={`text-2xl font-semibold num flex items-baseline gap-2 ${crit ? "text-crit" : ""}`}><span>{v}</span>{sub && <span className="text-xs text-muted font-normal">{sub}</span>}</div></div>;
}
