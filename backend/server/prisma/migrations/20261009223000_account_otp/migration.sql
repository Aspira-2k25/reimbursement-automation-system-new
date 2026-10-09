BEGIN;
CREATE TABLE "account_otp_challenges" (
  "id" SERIAL NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "otp" VARCHAR(255) NOT NULL,
  "purpose" VARCHAR(20) NOT NULL,
  "target_username" VARCHAR(100),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiry_time" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_otp_challenges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "account_otp_challenges_email_purpose_key" ON "account_otp_challenges"("email", "purpose");
COMMIT;
