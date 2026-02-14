# The Clawshboard Dashboard

LAN-first mission control for OpenClaw.

## What it is
A lightweight web dashboard you can run on your OpenClaw gateway host to:
- monitor host health (CPU/RAM/disk)
- visualize your OpenClaw setup (BirdView)
- drill into agents/sessions (AgentView)
- track next actions via `WHATSNEXT.md` (WhatsNext view)
- safely edit allowlisted agent files (with confirmation + backups)

## Features (current)
- Sticky “thick” hardware HUD header (sparklines)
- Views: BirdView / AgentView / WhatsNext
- Multi-agent discovery (from `~/.openclaw/agents/*`)
- Safe editor (allowlist): `SOUL.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md`, `TASKS.md`, `WHATSNEXT.md`
- Session detail modal (tail messages + cost)

## Install & run

```bash
git clone <YOUR_REPO_URL>
cd clawshboard
npm i
cp config.example.json config.json
npm run start
```

Open: `http://<host>:7010`

## Configuration
Edit `config.json`:
- `server.host` (default `0.0.0.0`)
- `server.port` (default `7010`)
- `paths.openclawHome` (default `~/.openclaw`)
- `paths.defaultWorkspace` (default `~/.openclaw/workspace`)

## Security
No auth yet. Do **not** expose to the public internet.

All writes are:
- allowlisted by filename
- constrained to the agent workspace
- confirmed in UI
- backed up server-side (`.bak.<timestamp>`) best-effort

## Roadmap
See `docs/FEATURES.md`.
