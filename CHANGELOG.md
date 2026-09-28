# Changelog

## 00.04.00 (2026-09-27)

### Additive

- Bundle and enable three original native doors: World Conquest (territory
  strategy with shared 2-4 player matches and private CPU campaigns), Lantern
  Hollow (shared fantasy exploration, live combat and room chat), and Modem Mogul
  (a persistent BBS management simulation).
- Add PostgreSQL DoorSave storage, versioned JSON, atomic world/player writes,
  bounded serializable-transaction retries, per-account input throttling,
  leaderboards, and timer cleanup.
- Add gameplay, store, security, retry, timer, manifest, and performance tests;
  add disposable real-PostgreSQL concurrency and upgrade/rollback/restore checks.
- Add command documentation with examples, architectural notes, operational
  limits, SQL upgrade/rollback/restore scripts, and copyable commit notes.

### Fix and compatibility

- Recheck account existence and enabled-door state for every bundled-game action;
  reject terminal control characters, malformed quantities, and unknown save
  versions without committing a partial action.
- Keep the existing door contract, sample doors, WebSocket fix, APIs, CLI flags,
  account tables, and environment names unchanged. No dependency changes.
- The schema addition is non-destructive when upgrading. Downgrading requires the
  documented save-table archival step before starting a pre-00.04.00 image.
- Preserve disabled admin settings on startup/rescan. New manifests are enabled
  on first discovery for both new installations and upgraded installations.
- Increment the feature version from 00.03.03 / 0.3.3 to 00.04.00 / 0.4.0.

### Traceability

User request: generate the territory-strategy, MUD, and sysop-simulation doors as
part of the default product. These are original games, not redistributions of the
commercial titles previously discussed. No issue number was supplied.
Baseline commit: `7739893538c0ff0101aac52197224b69fa2a2dbd`.
The source tag `v00.04.00`, release commit, and image revision/digest identify the
resulting release. Existing tags are not moved. Publication depends on CI success.

Earlier release history is preserved without edits in
[CHANGELOG-00.03.03.md](CHANGELOG-00.03.03.md).
