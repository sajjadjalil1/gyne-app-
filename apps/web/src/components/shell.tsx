import Link from "next/link";
import { fmtDate } from "@gyne/core";
import { LogoutButton } from "./logout-button";

export function Shell({ user, clinic, active, children }: { user: { name: string }; clinic: { name: string }; active: "work" | "appts" | "patients"; children: React.ReactNode }) {
  const tabs = [
    { key: "work", href: "/doctor", label: "قائمة العمل" },
    { key: "appts", href: "/doctor/appointments", label: "المواعيد" },
    { key: "patients", href: "/doctor/patients", label: "المريضات" },
  ] as const;
  return (
    <div className="min-h-dvh px-4 pb-10 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center gap-3 py-4">
        <div className="flex items-center gap-2 font-semibold"><span className="w-8 h-8 rounded-lg bg-lav text-white grid place-items-center text-sm">ع</span>{clinic.name}</div>
        <span className="text-muted text-sm">{fmtDate(new Date(), { weekday: true })}</span>
        <nav className="ms-auto flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <Link key={t.key} href={t.href} className="chip" data-on={active === t.key}>{t.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm text-muted"><span className="w-7 h-7 rounded-full bg-lav-soft text-lav-deep grid place-items-center text-xs font-semibold">{user.name.replace("د. ", "").slice(0, 1)}</span>{user.name}<LogoutButton /></div>
      </header>
      {children}
    </div>
  );
}
