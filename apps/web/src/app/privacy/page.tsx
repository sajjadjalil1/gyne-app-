import type { Metadata } from "next";
import { prisma } from "@gyne/db";
import { DELETE_GRACE_DAYS, PRIVACY_VERSION } from "@gyne/core";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "سياسة الخصوصية | عيادتي", description: "شلون نجمع معلومات المريضة ونحميها ونحذفها" };

/** Public privacy policy: linked from the app's consent screen and needed by the App Store and Google Play. */
export default async function PrivacyPage() {
  const clinic = await prisma.clinic.findFirst({ orderBy: { createdAt: "asc" }, select: { name: true, phone: true, address: true } }).catch(() => null);
  const name = clinic?.name ?? "العيادة";
  return (
    <main className="max-w-2xl mx-auto p-5 sm:p-8 leading-8">
      <div className="glass-lg p-6 sm:p-8 flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-bold">سياسة الخصوصية</h1>
          <p className="text-muted text-sm">تطبيق «عيادتي» ولوحة {name} · النسخة {PRIVACY_VERSION}</p>
        </header>

        <Section title="منو المسؤول عن معلوماتچ">
          <p>{name} هي المسؤولة عن معلوماتچ الصحية. التطبيق أداة تستعملها العيادة حتى تتابعچ.{clinic?.phone ? <> للتواصل: <bdi dir="ltr">{clinic.phone}</bdi>{clinic.address ? ` · ${clinic.address}` : ""}.</> : null}</p>
        </Section>

        <Section title="شنو المعلومات اللي نجمعها">
          <ul className="list-disc pr-5">
            <li>اسمچ ورقم موبايلچ وتاريخ ميلادچ وفصيلة دمچ: تكتبها العيادة لما تسجلچ.</li>
            <li>معلومات الحمل أو الدورة أو موانع الحمل، والأدوية اللي كتبتها الطبيبة.</li>
            <li>اللي تسجلينه بالتطبيق: شعورچ اليومي، الأعراض، الضغط، حركة الجنين، أخذ الدوا، والرسائل للعيادة.</li>
            <li>المواعيد وملاحظات الزيارات اللي تكتبها العيادة.</li>
            <li>سجل أمان: منو فتح ملفچ ومتى، وعنوان الجهاز (IP) لحماية الحساب.</li>
          </ul>
          <p>ما نجمع موقعچ، ولا جهات اتصالچ، ولا صورچ. ماكو إعلانات ولا أدوات تتبع أو تحليل بالتطبيق.</p>
        </Section>

        <Section title="ليش نستعملها">
          <p>بس حتى طبيبتچ تتابع حالتچ، وتذكرچ بالدوا والمواعيد، وتنبه العيادة إذا سجلتي علامة خطر. ما نبيع معلوماتچ، وما نستعملها للتسويق، وما نشاركها ويا أي جهة ثانية إلا إذا القانون العراقي ألزم العيادة.</p>
        </Section>

        <Section title="منو يشوفها">
          <ul className="list-disc pr-5">
            <li>الطبيبة والممرضة بعيادتچ: ملفچ كامل.</li>
            <li>الاستقبال: المواعيد بس.</li>
            <li>شركة الاستضافة (Render، سيرفرات بمدينة فرانكفورت بألمانيا) تخزن المعلومات نيابة عن العيادة وما تستعملها.</li>
            <li>رمز الدخول يوصلچ برسالة عن طريق شركة رسائل، تشوف رقمچ والرمز بس.</li>
          </ul>
        </Section>

        <Section title="شلون نحميها">
          <p>الاتصال بين موبايلچ والسيرفر مشفّر (HTTPS). الدخول برمز يوصل لموبايلچ، والطاقم يدخل بكلمة سر وتطبيق مصادقة. كل فتح لملفچ ينسجل باسم الموظف ووقته. رمز دخولچ محفوظ بمكان مشفّر بموبايلچ.</p>
        </Section>

        <Section title="حقوقچ">
          <ul className="list-disc pr-5">
            <li><b>تشوفين معلوماتچ:</b> كلها موجودة بالتطبيق، أو اطلبي نسخة من العيادة.</li>
            <li><b>تصححينها:</b> گولي للعيادة وتعدلها.</li>
            <li><b>تحذفين حسابچ:</b> من «أنا» ← «احذفي حسابي» بالتطبيق، أو اطلبيها من العيادة. ينقفل حسابچ فوراً، وتنمسح معلوماتچ نهائياً بعد {DELETE_GRACE_DAYS} يوم (المدة حتى نگدر نرجعها إذا صار غلط).</li>
            <li><b>تسحبين موافقتچ:</b> بأي وقت، بنفس طريقة حذف الحساب.</li>
          </ul>
        </Section>

        <Section title="الأطفال">
          <p>التطبيق للمريضات البالغات. إذا عمر المريضة أقل من 18، وليّ أمرها يوافق ويا العيادة.</p>
        </Section>

        <Section title="إذا تغيّرت هاي السياسة">
          <p>نحدث رقم النسخة فوق، والتطبيق يطلب موافقتچ مرة ثانية قبل ما يكمل.</p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
