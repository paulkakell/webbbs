---
title: Bundled doors
permalink: /bundled-doors/
---

# Bundled doors in 00.04.00

[Home]({{ '/' | relative_url }}) | [Containers]({{ '/containers/' | relative_url }}) | [Release notes]({{ '/release-notes/' | relative_url }})

World Conquest, Lantern Hollow, and Modem Mogul are original webBBS games. They
cover the categories requested for Global War, DoorMUD, and Virtual Sysop III;
they are not ports, licensed distributions, or feature-complete replicas of those
titles. No external binaries, servers, or paid licenses are required.

## Starting, saving, and administration

Log in to `/bbs`, open Doors, and select the displayed game number. `HELP` explains
commands. `Q`, `QUIT`, `B`, and `BACK` return to the BBS. Successful actions commit
to PostgreSQL before the result is displayed. Reconnect with the same account to
resume. No browser storage, cookies containing game state, or separate credentials
are used. Game names and chat support printable ASCII only.

The default image includes all three manifests with `enabled: true`. Startup
scans and installs them. In Admin, use the existing Doors controls to disable or
re-enable a game. Rescanning or restarting does not overwrite a disabled setting.
A disabled game rejects new actions even from an already open game session.
Existing Guess The Number and ANSI Clock packages are unchanged.

## World Conquest

Conquer all 12 territories on a three-row, four-column map. Adjacent cells share
an edge, never just a corner. A die comparison resolves one battle volley;
defenders win ties. A captured territory receives up to three surviving attacking
troops while its source retains at least one. Complete rows give two bonus
reinforcements per turn. There is a limit of 10,000 troops per territory; automatic
deployment discards excess at that limit.

A shared match supports 2-4 local accounts, with one active match per BBS. Solo
campaigns are private, saved separately for each account, and do not occupy that
shared lobby. CPU turns run immediately after the human ends a solo turn and
perform at most ten battle volleys. The leaderboard counts victories from both
modes; this is a casual scoreboard, not an anti-collusion ranking.

| Command | Purpose and example |
| --- | --- |
| `SOLO` | Create or resume your CPU campaign. Use it when no other callers are playing. |
| `LOBBY` | Switch back to the shared match without deleting your solo save. |
| `JOIN` | Take one of four seats before the shared match begins. |
| `LEAVE` | Give up a seat in an unstarted shared lobby. This does not surrender an active match. |
| `START` | The host starts after at least two players join. After 30 minutes, another joined player may start. |
| `MAP`, `LOOK`, `STATUS` | Show owners, troops, current player, reserves, and the UTC turn deadline. |
| `REINFORCE 1 3` | Add three reserves to your territory 1. Deploy all reserves before attacking or fortifying. |
| `ATTACK 1 2` | Attack adjacent enemy territory 2 from territory 1. The source needs at least two troops. |
| `FORTIFY 1 5 2` | Move two troops between adjacent territories you own, once per turn. Leave one at the source. |
| `END` | Deploy unused reserves automatically and advance to the next surviving player. |
| `CLAIM` | A joined player skips a shared turn after its 24-hour deadline. No automatic background turn scheduler runs. |
| `NEW CONFIRM` | Clear a finished match. In solo mode this returns you to the lobby; `SOLO` starts again. |
| `SCORES` | Display the ten leading victory totals. |

Example solo opening: `SOLO`, `REINFORCE 1 3`, `ATTACK 1 2`, then `END`.
Read the map before repeating attacks: ownership and available troops change.
For multiplayer, two accounts use `LOBBY` and `JOIN`, then the host uses `START`.
`Q` leaves the door but retains the player's seat and turn.

## Lantern Hollow

Explore nine connected rooms, including a safe town, forest road, crypt, vault,
river crossing, quarry, and tower. Enemies and room messages are shared across
callers. Characters have individual health, gold, equipment, and experience.
Multiple players can damage the same enemy, but the final blow receives its gold
and XP. There is no party reward splitting, PvP, or item trading in this release.

`ATTACK` enables combat on a three-second timer for up to 60 seconds. Other
adventurers' room events arrive on the same interval. `STOP`, moving away, quitting,
or becoming idle stops combat. Reconnecting never silently restarts a fight.
Enemies return 30 seconds after defeat, evaluated when the world is next accessed.
With no active sessions, the server does not simulate an unattended world.

| Command | Purpose and example |
| --- | --- |
| `LOOK`, `STATUS` | Read the room, exits, enemy health, and your character statistics. |
| `MAP` | Display both travel routes and their direction labels. |
| `NORTH`, `SOUTH`, `EAST`, `WEST`, `UP`, `DOWN` | Move using a listed exit. `N/S/E/W/U/D` are aliases. Moving also lets you flee combat. |
| `WHO` | List up to 30 recently active adventurers and their rooms. Presence is approximate within 15 seconds. |
| `ATTACK` | Start or renew a minute of live combat against the room enemy. |
| `STOP` | Stop attacking and receiving encounter counterattacks. |
| `POTION` | Consume one potion to restore up to 20 health. |
| `REST` | Fully restore health for free in Lantern Square. |
| `SHOP` | Read prices and item limits; purchases require being in town. |
| `BUY POTION` | Spend 15 gold, up to a stock of 20 potions. |
| `BUY SWORD` | Improve weapon strength, costing 60 times current weapon level, up to level 10. |
| `BUY ARMOR` | Improve protection, costing 50 times the next armor level, up to level 8. |
| `SAY Hello travelers` | Send a room message of 1-90 printable characters. Only the last 40 world events are retained. |
| `INVENTORY` | Show equipment, currency, and quest completion. |
| `SCORES` | Display the ten highest lifetime XP totals. |

Example: `NORTH`, `ATTACK`, `STOP`, `SOUTH`, `REST`, `SHOP`, `BUY POTION`.
Players can work together against tougher enemies by entering the same room and
attacking. To complete the quest, defeat the Brass sentinel at Storm Tower and
relight its lantern. The first completion awards an extra 100 gold.

Defeat returns a character to town at half health and removes 20% of their gold.
Levels cap at 20. Two minutes without a user command marks the character idle and
stops combat. A disconnected timer is removed on its next three-second check;
explicit quitting clears it immediately. An action already committing may finish.
Live output can arrive while a user is typing; use short commands or `STOP` when
reading long help text.

## Modem Mogul

Run a fictional BBS with starting cash of $500, ten members, one modem, one disk,
ten files, and reputation 50. All money is fictional. Each `NEXT` advances one
simulated day. Ten advances are available per UTC calendar day; unused advances
do not accumulate. Equipment changes do not consume daily advances.

| Command | Purpose and example |
| --- | --- |
| `STATUS`, `LOOK` | Display cash, membership, hardware, files, staff, quality, company value, and remaining advances. |
| `NAME Copper Line` | Give your simulated BBS a name of 1-32 printable characters. |
| `BUY MODEM` | Spend $200 for 30 additional member capacity, up to 100 modems. |
| `BUY DISK` | Spend $100 for 50 more file slots, up to 100 disks. |
| `BUY FILES` | Spend $40 to add ten files, provided storage is available. |
| `UPGRADE` | Increase quality for $150 times current quality; maximum quality is 10. |
| `HIRE` | Pay $150 to add a worker who reduces outage risk; maximum staff is 20. |
| `FIRE` | Remove one worker to reduce daily wages. |
| `ADVERTISE` | Spend $50 to add five reputation, capped at 100. |
| `NEXT` | Calculate membership growth, collect income, pay expenses, and resolve an event. |
| `SCORES` | Compare the ten highest current company values. |
| `RESTART CONFIRM` | Reset a closed business or one that has reached 1,000 members. Remaining daily advances are preserved. |

Each day earns $2 per member and costs $10 per modem, $5 per disk, and $20 per
worker. Quality, files, and reputation contribute to growth, bounded by modem
capacity. Fully occupied lines reduce reputation. Equipment faults cost $40 and
five reputation; favorable reviews provide a $50 donation and four reputation.
Cash below zero closes the company. Reach 1,000 members to achieve the main goal,
then continue building or restart. Cash caps at $100,000,000.

Company value is cash + $150/modem + $80/disk + $2/file + $100/quality level +
$5/member. Buying at retail can initially lower this resale-style value. Example:
`NAME Copper Line`, `BUY MODEM`, `BUY FILES`, `NEXT`, `STATUS`. Add capacity before
the member count reaches the displayed limit; avoid hiring more workers than the
business can support.

## Architecture and operational limits

```text
BBS WebSocket session
  -> existing door menu and createModule contract
  -> native-door adapter (prompt, bounded input, live timer, exit)
  -> door-store (account + enable check, serializable transaction, retry)
  -> pure game engine
  -> PostgreSQL DoorSave rows (world and u:<authenticated user ID>)
```

Saves use JSON envelope `{schema: 1, value: ...}`. Unknown save versions fail closed
instead of being overwritten. A composite `(doorId, scope)` key separates worlds
and players; a `(doorId, score)` index supports bounded top-ten leaderboards.
World/player writes commit together. Retryable database conflicts get at most
four attempts and reuse the same random draws. Commands are limited to 120
printable ASCII characters and at least 350 milliseconds apart per account/game.
Overlapping commands in one terminal are dropped rather than queued indefinitely.
Wait for the prompt before entering another command.

Each JSON save is limited to 128 KiB. Room-event history and presence queries are
bounded. This design targets a small BBS, not thousands of simultaneous MUD
players; its shared world row is a write-contention point. The included benchmark
measures in-memory actions, not network capacity. The container integration check
separately reports timings for 50 real database actions without claiming a load
test or service-level guarantee.

No new environment variables, dependencies, external network calls, shell
execution, or authentication endpoints are introduced by the runtime. Expected
errors explain the rejected action; unexpected storage errors produce structured
`door_action_failed` records containing the door ID and error code, not passwords,
chat text, save contents, or connection strings. Existing application logging and
CodeQL configuration are retained; no new metrics exporter or alert is installed.

Saved game rows are not automatically removed when an account is deleted. The
runtime rechecks that the account exists and refuses further access. A sysop
performing account erasure should also remove that account's `u:<id>` game rows
and review the bounded shared chat/lobby history. Preserve database backups under
the same access restrictions as other BBS data.

For upgrades, rollback, and restoring archived saves, follow the release notes.
