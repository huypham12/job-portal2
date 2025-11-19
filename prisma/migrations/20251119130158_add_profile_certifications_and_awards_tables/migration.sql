-- CreateTable
CREATE TABLE "profile_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "issuing_org" VARCHAR(255) NOT NULL,
    "credential_id" VARCHAR(255),
    "credential_url" VARCHAR(255),
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "never_expires" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "skills_acquired" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "profile_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "issuer" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "url" VARCHAR(255),
    "category" VARCHAR(100),
    "level" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "profile_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_certifications_profile_id_idx" ON "profile_certifications"("profile_id");

-- CreateIndex
CREATE INDEX "idx_certifications_expiry" ON "profile_certifications"("expiry_date");

-- CreateIndex
CREATE INDEX "profile_awards_profile_id_idx" ON "profile_awards"("profile_id");

-- CreateIndex
CREATE INDEX "idx_awards_category" ON "profile_awards"("category");

-- AddForeignKey
ALTER TABLE "profile_certifications" ADD CONSTRAINT "profile_certifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_awards" ADD CONSTRAINT "profile_awards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
