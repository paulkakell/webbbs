-- Stop the app BEFORE starting 00.04.00 again. A public DoorSave already present
-- causes failure instead of destroying either copy. Resolve that case manually.
BEGIN;
ALTER TABLE webbbs_rollback_000400."DoorSave" SET SCHEMA public;
COMMIT;
-- Deliberately do not re-enable doors: review each setting in Admin first.
