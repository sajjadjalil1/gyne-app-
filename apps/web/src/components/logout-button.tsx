"use client";
import { useRouter } from "next/navigation";
export function LogoutButton() {
  const router = useRouter();
  return <button className="text-xs text-faint hover:text-fg" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }}>خروج</button>;
}
