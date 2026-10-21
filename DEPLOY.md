# Deploying عيادتي

The server (`apps/web`: JSON API + doctor dashboard) runs anywhere Docker runs. The patient app is built separately with EAS (`apps/mobile/eas.json`).

## Render (recommended, one click)

1. Render dashboard → **New → Blueprint** → pick this repository. `render.yaml` creates a Docker web service and a PostgreSQL 16 database in Frankfurt.
2. Enter `BOOTSTRAP_DOCTOR_PHONE` (the doctor's phone, `07XXXXXXXXX`). On the first start with an empty database the server creates the clinic and that doctor's login.
3. Wait for the deploy, then open `https://<service>.onrender.com/api/health` → `{"ok":true,"db":true}`.
4. Login codes: until an SMS/WhatsApp gateway is connected, `OTP_DELIVERY=log` writes them to the service log (`[otp] …`). When `SMS_WEBHOOK_URL` is set, delete `OTP_DELIVERY`.
5. Put the service URL into `apps/mobile/eas.json` (`EXPO_PUBLIC_API_URL`) and build the app with `eas build`.

Migrations run before every deploy (`preDeployCommand: sh deploy/migrate.sh`). Backups: the database page → Recovery / Exports.

## Own server (docker-compose)

```bash
cp .env.deploy.example .env   # set DOMAIN, DB_PASSWORD, AUTH_SECRET, BOOTSTRAP_*
docker compose up -d --build
```

Caddy terminates HTTPS for `DOMAIN`, migrations run on container start, and the `backup` container writes a daily `pg_dump` to `./backups/` (30 days kept).

## Environment variables (server)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | 32+ random characters, signs sessions; also encrypts staff authenticator secrets unless `TOTP_ENCRYPTION_KEY` is set. Changing it later means every staff member re-runs first-time setup, so set `TOTP_ENCRYPTION_KEY` separately if you may rotate it |
| `BOOTSTRAP_CLINIC_NAME`, `BOOTSTRAP_DOCTOR_NAME`, `BOOTSTRAP_DOCTOR_PHONE` | first-run clinic and doctor (ignored once any user exists) |
| `SMS_WEBHOOK_URL`, `SMS_WEBHOOK_TOKEN` | OTP delivery gateway |
| `OTP_DELIVERY=log` | pilot only: codes go to the log instead |
| `ALLOWED_ORIGINS` | browser origins allowed on `/api` (native app needs none; empty in production unless set) |
| `RUN_MIGRATIONS_ON_START` | `0` when the platform runs `deploy/migrate.sh` itself (Render) |

## Mobile (EAS)

```bash
cd apps/mobile
npx eas-cli login && npx eas-cli init          # once, links the Expo project
npx eas-cli build --profile preview --platform android   # APK for testers
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform all   # needs the store credentials in eas.json
```
