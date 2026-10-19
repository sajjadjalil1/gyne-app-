import { useEffect, useState } from "react";
import { View } from "react-native";
import { fmtDate, fmtTime, APPT_TYPE_LABEL } from "@gyne/core";
import { Screen, Row } from "@/components/screen";
import { Glass } from "@/components/glass";
import { T } from "@/components/text";
import { api, d } from "@/lib/api";
import { useHome } from "@/lib/use-home";
import { useTheme } from "@/hooks/use-theme";

type Appt = { id: string; type: string; status: string; startsAt: string; reason: string | null; notes: string | null };
const STATUS: Record<string, string> = { SCHEDULED: "قادم", COMPLETED: "تمّت", CANCELLED: "ألغي", NO_SHOW: "لم تحضري" };

export default function Appointments() {
  const t = useTheme();
  const { data } = useHome();
  const [appts, setAppts] = useState<Appt[]>([]);
  useEffect(() => { api<{ appointments: Appt[] }>("/api/appointments").then((r) => setAppts(r.appointments)).catch(() => {}); }, []);
  const upcoming = appts.filter((a) => a.status === "SCHEDULED" && d(a.startsAt)! >= new Date()).reverse();
  const past = appts.filter((a) => !(a.status === "SCHEDULED" && d(a.startsAt)! >= new Date()));
  return (
    <Screen>
      <T kind="h1">مواعيدك</T>
      {upcoming.map((a) => (
        <Glass key={a.id} style={{ backgroundColor: t.lav, borderColor: "transparent", gap: 2 }}>
          <T kind="label" color={t.white}>{APPT_TYPE_LABEL[a.type]}</T>
          <T kind="title" color={t.white}>{fmtDate(d(a.startsAt)!, { weekday: true })} · {fmtTime(d(a.startsAt)!)}</T>
          {a.reason && <T kind="small" color={t.white}>{a.reason}</T>}
        </Glass>
      ))}
      {upcoming.length === 0 && <Glass><T>لا مواعيد قادمة. تواصلي مع العيادة من صفحة الرسائل لحجز موعد.</T></Glass>}

      {data?.pregnancy && (
        <Glass style={{ gap: 8 }}>
          <T kind="title">جدول الحمل</T>
          {data.pregnancy.upcoming.map((u) => (
            <Row key={u.key}><View style={{ flex: 1 }}><T>{u.title}</T>{u.note && <T kind="small">{u.note}</T>}</View><T kind="small">{fmtDate(d(u.from)!, { year: false })} إلى {fmtDate(d(u.to)!, { year: false })}</T></Row>
          ))}
        </Glass>
      )}

      {past.length > 0 && (
        <Glass style={{ gap: 8 }}>
          <T kind="title">السابقة</T>
          {past.map((a) => (
            <Row key={a.id}><View style={{ flex: 1 }}><T>{APPT_TYPE_LABEL[a.type]}</T>{a.notes && <T kind="small">{a.notes}</T>}</View><View><T kind="small">{fmtDate(d(a.startsAt)!, { year: false })}</T><T kind="label" color={a.status === "COMPLETED" ? t.ok : t.faint}>{STATUS[a.status]}</T></View></Row>
          ))}
        </Glass>
      )}
    </Screen>
  );
}
