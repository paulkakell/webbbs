-- Stop webbbs_app first. Archive saves outside Prisma's managed public schema.
-- An existing archive causes this transaction to fail rather than overwrite data.
BEGIN;
CREATE SCHEMA IF NOT EXISTS webbbs_rollback_000400;
ALTER TABLE public."DoorSave" SET SCHEMA webbbs_rollback_000400;
UPDATE public."DoorPackage" SET "enabled" = false
WHERE "doorId" IN ('world-conquest', 'lantern-hollow', 'modem-mogul');
COMMIT;
