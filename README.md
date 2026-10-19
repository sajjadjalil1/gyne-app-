# عيادتي · Gyne follow-up platform

منصة متابعة مريضات النسائية والتوليد: تطبيق جوّال للمريضة، ولوحة ويب للطبيب، وخادم واحد يربطهما.

## Structure

```
apps/
  mobile/   Expo (React Native) patient app — iOS, Android (and web preview)
  web/      Next.js: doctor dashboard (/doctor) + JSON API (/api/*)
packages/
  core/     Clinical engines shared by both apps: cycle prediction & flags,
            contraception expiry, ACOG-style gestation dating, antenatal schedule, Arabic formatting
  db/       Prisma schema + seed (PostgreSQL)
```

## Stack

- **Mobile:** Expo SDK 58, Expo Router, React Native 0.88, TypeScript, RTL Arabic, IBM Plex Sans Arabic, token kept in the device keychain (expo-secure-store)
- **Web/API:** Next.js 16 (App Router, Turbopack), React 19.3, Tailwind CSS 4
- **Data:** PostgreSQL 16 via Prisma 6
- **Auth:** phone number + 6-digit OTP (SMS), DB-backed sessions with revocation, signed JWT (jose), rate limiting, audit log of every clinical write
- **Security headers**, HTTP-only cookie for staff, Bearer token for the app, Zod validation on every endpoint

## Run locally

```bash
npm install
cp .env.example packages/db/.env && cp .env.example apps/web/.env   # set DATABASE_URL
npm run db:push        # create tables
npm run db:seed        # demo clinic, doctor, nurse and patients

# API + doctor dashboard
EXPOSE_DEV_OTP=1 npm run dev:web          # http://localhost:3000/login
# Patient app
npm run dev:mobile                        # scan the QR with Expo Go, or press w for web
```

Demo logins (seeded): doctor `07800000001`, nurse `07800000002`, patient Nour `07801234567`, Zahraa `07802222222`, Ruqaya `07805555555`.
With `EXPOSE_DEV_OTP=1` the OTP is returned by the API and shown on the login screen; in production set `SMS_WEBHOOK_URL` to your SMS/WhatsApp gateway and never set `EXPOSE_DEV_OTP`.

Production env for `apps/web`: `DATABASE_URL`, `AUTH_SECRET` (32+ random chars), `SMS_WEBHOOK_URL`, `SMS_WEBHOOK_TOKEN`.
Mobile: `EXPO_PUBLIC_API_URL=https://api.yourclinic.example`.

## What is in this first version

Patient app: welcome + OTP login, home (cycle or pregnancy ring, week strip, mood quick-log, next appointment, contraception card, BP and kick counts), daily log (flow, mood, symptoms, pain, note; BP; fetal kicks), calendar with logged, predicted and fertile days, appointments with the antenatal schedule, messaging with the clinic.

Doctor dashboard: OTP login, worklist sorted by priority with the reason for each flag (BP rules, unanswered messages, screening windows, contraception expiry, cycle anomalies), today's appointments, patient list and search, patient record (pregnancy dating and schedule, cycle and contraception summary, timeline of readings, visits and messages), reply to patient.

## Clinical rules (packages/core)

- EDD from LMP (Naegele) and from ultrasound; re-dating follows ACOG CO 700 thresholds.
- Antenatal windows: booking 6–10w, dating scan 8–13w, NT 11–13w, anomaly 18–22w, OGTT 24–28w, Anti-D at 28w (Rh−), GBS 36–37w, growth scan 32–36w, visits to 41w. Editable per clinic later.
- Cycle flags: <21 or >35 days, bleeding >7 days, amenorrhoea >90 days, intermenstrual bleeding.
- BP: ≥140/90 twice in 48h or ≥160/110 once = critical.
- Contraception: expiry by method and brand (implant 3y, Mirena 8y, Kyleena 5y, copper 5–10y, DMPA 13w, ring 3w, patch 1w).

Alerts are presented as "your clinic's rule", not as diagnoses. Before any regulatory claim (CE/FDA/SFDA) review which features count as clinical decision support.
