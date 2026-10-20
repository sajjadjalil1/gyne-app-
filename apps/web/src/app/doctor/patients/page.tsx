import Link from "next/link";
import { prisma } from "@gyne/db";
import { requireStaffPage } from "@/lib/staff";
import { audit } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { Avatar } from "@/components/severity";
import { ageYears, formatGA, gaOnDate, methodLabel } from "@gyne/core";

export const dynamic = "force-dynamic";

export default async function Patients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireStaffPage();
  const { q } = await searchParams;
  if (q) await audit("patient.search", { actorId: user.id, meta: { q: q.slice(0, 40) } });
  const patients = await prisma.patient.findMany({
    where: { clinicId: user.clinicId, ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}) },
    include: { pregnancies: { where: { active: true } }, contraceptions: { where: { endedAt: null } } },
    orderBy: { name: "asc" },
    take: 200,
  });
  return (
    <Shell user={user} clinic={user.clinic} active="patients">
      <section className="glass-lg p-5">
        <form className="flex gap-2 mb-4"><input name="q" defaultValue={q} placeholder="ابحثي بالاسم أو الهاتف" /><button className="btn">بحث</button></form>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {patients.map((p) => {
            const preg = p.pregnancies[0];
            const c = p.contraceptions[0];
            return (
              <Link key={p.id} href={`/doctor/patients/${p.id}`} className="glass p-3 flex items-center gap-3 hover:bg-lav-soft transition-colors">
                <Avatar name={p.name} tone={preg ? "bg-lav" : "bg-rose"} />
                <span className="min-w-0"><span className="font-medium">{p.name}</span><span className="text-faint text-xs ms-2 num">{ageYears(p.birthDate)} س</span><br />
                  <span className="text-xs text-muted">{preg ? `حمل ${formatGA(gaOnDate(preg.eddFinal))}` : c && c.method !== "NONE" ? methodLabel(c.method) : "متابعة دورة"}</span></span>
              </Link>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}
