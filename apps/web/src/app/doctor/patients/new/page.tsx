import { requireStaffPage } from "@/lib/staff";
import { Shell } from "@/components/shell";
import { PatientForm } from "./patient-form";

export const dynamic = "force-dynamic";

export default async function NewPatient() {
  const user = await requireStaffPage();
  return (
    <Shell user={user} clinic={user.clinic} active="patients">
      <section className="glass-lg p-5">
        <h1 className="text-lg font-semibold mb-1">إضافة مريضة</h1>
        <p className="text-sm text-muted mb-4">بعد الإضافة، المريضة تنزّل التطبيق وتدخل برقمها، ويوصلها رمز برسالة.</p>
        <PatientForm />
      </section>
    </Shell>
  );
}
