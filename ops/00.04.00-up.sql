-- Optional explicit equivalent of the existing startup `prisma db push`.
-- Stop webbbs_app and back up the database before applying schema changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public."DoorSave" (
  "doorId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoorSave_pkey" PRIMARY KEY ("doorId", "scope")
);
CREATE INDEX IF NOT EXISTS "DoorSave_doorId_score_idx" ON public."DoorSave" ("doorId", "score");
COMMIT;
