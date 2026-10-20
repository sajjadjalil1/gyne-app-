-- Staff sign-in with password + authenticator app
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "totpSecret" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN "totpLastStep" INTEGER,
ADD COLUMN "recoveryCodes" TEXT,
ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3);
