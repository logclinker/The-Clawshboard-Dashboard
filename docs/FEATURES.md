# Clawshboard — Feature/Design Tracker

This file is the non-negotiable checklist so we don’t forget what “good” looks like.

## North Star
A LAN-first, mobile-friendly mission-control dashboard for OpenClaw:
- Multi-agent visibility
- Fast hardware/health HUD
- Safe edit surface for agent training files
- A real sense of “what’s happening now” + “what happened” + “what’s next”

## Must-have (v1)

### Persistent HUD (header)
- [x] Sticky thick header
- [x] CPU + Memory sparklines
- [x] Disk snapshot
- [ ] Network: IP + link status
- [ ] Gateway: openclaw-gateway up/down + PID + uptime
- [ ] Alerts: thresholds + warning states

### Views
- [x] BirdView (team map)
- [x] AgentView (agent detail)
- [ ] SessionView (deep dive) — click a session → messages + usage + tools

### Multi-agent
- [x] Detect agents from `~/.openclaw/agents/*`
- [~] Map agent → workspace (config + conventional guesses)
- [ ] Show agent “profile” (from SOUL/USER summary)

### Editing (safe)
- [x] Allowlisted file editor: SOUL/USER/HEARTBEAT/MEMORY/TASKS
- [ ] Unsaved-change indicator + keyboard shortcuts (Cmd/Ctrl+S)
- [ ] Per-agent file existence badges
- [ ] Prevent accidental overwrite: optional backups/versions
- [ ] Confirm modals for *all* writes (no browser alerts): explain risk + final confirm

### AI actions (per block)
- [ ] Explain (AI): per box (session, agent, cron, etc.) → layman summary + suggested next action
- [ ] Improve/Generate (AI): for docs/files (SOUL/USER/MEMORY/TASKS) → prompt user for improvement intent + propose diff
- [ ] Safety: always show preview + require confirmation before applying AI changes
- [ ] Config: support OPENCLAW gateway URL + token via env (never hardcode token in repo)

### Tasks & follow-up
- [ ] TASKS.md as structured UI (inbox / next / doing / done)
- [ ] Results log (append-only) per agent
- [ ] WHATSNEXT.md cards/page (per agent + per project)
- [ ] Link tasks ↔ sessions ↔ outputs

## Nice-to-have (later)
- [ ] Cron panel (jobs.json): enable/disable + run (read-only first)
- [ ] Nodes panel (paired nodes + last seen + snapshots) — needs Gateway tool integration
- [ ] Tool inventory (skills/tools enabled) + approvals state
- [ ] Search across sessions + memory
- [ ] Auth (basic auth / token) before enabling any “control” actions

## Design principles
- Mobile-first layouts; no tiny click targets
- “Looks alive”: subtle animations, skeleton loading
- Never block rendering on one failing component
- Read-only by default; editing is explicit and safe
- Clear visual hierarchy: HUD → view selector → content
