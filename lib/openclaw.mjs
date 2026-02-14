import fs from 'fs';
import path from 'path';
import { expandHome } from './paths.mjs';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function getOpenclawHome(config) {
  const fromCfg = config?.paths?.openclawHome || '~/.openclaw';
  return expandHome(fromCfg);
}

export function getOpenclawConfigPath(openclawHome) {
  return path.join(openclawHome, 'openclaw.json');
}

export function readOpenclawConfig(openclawHome) {
  const p = getOpenclawConfigPath(openclawHome);
  try {
    if (!fs.existsSync(p)) return null;
    return readJson(p);
  } catch {
    return null;
  }
}

export function listAgents(openclawHome) {
  const agentsDir = path.join(openclawHome, 'agents');
  try {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    return [];
  }
}

export function getAgentSessionsDir(openclawHome, agentId) {
  return path.join(openclawHome, 'agents', agentId, 'sessions');
}

export function readSessionsIndex(openclawHome, agentId) {
  const dir = getAgentSessionsDir(openclawHome, agentId);
  const p = path.join(dir, 'sessions.json');
  try {
    if (!fs.existsSync(p)) return { sessions: [] };
    const data = readJson(p);
    // sessions.json is a map keyed by sessionKey
    const sessions = Object.entries(data).map(([key, s]) => ({ key, ...s }));
    sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return { sessions };
  } catch {
    return { sessions: [] };
  }
}

export function tailSessionMessages(openclawHome, agentId, sessionId, limit = 50) {
  const dir = getAgentSessionsDir(openclawHome, agentId);
  const p = path.join(dir, sessionId + '.jsonl');
  try {
    if (!fs.existsSync(p)) return [];
    const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
    const slice = lines.slice(Math.max(0, lines.length - limit));
    const msgs = [];
    for (const line of slice) {
      try {
        const d = JSON.parse(line);
        if (d.type !== 'message') continue;
        const m = d.message;
        if (!m) continue;
        let text = '';
        if (typeof m.content === 'string') text = m.content;
        else if (Array.isArray(m.content)) {
          const t = m.content.find(b => b?.type === 'text' && b?.text);
          if (t) text = t.text;
        }
        msgs.push({
          timestamp: d.timestamp || null,
          role: m.role || 'unknown',
          model: m.model || null,
          text: text || '',
          usage: m.usage || null,
        });
      } catch {}
    }
    return msgs;
  } catch {
    return [];
  }
}

export function computeSessionCostFromJsonl(openclawHome, agentId, sessionId) {
  const dir = getAgentSessionsDir(openclawHome, agentId);
  const p = path.join(dir, sessionId + '.jsonl');
  try {
    if (!fs.existsSync(p)) return 0;
    let total = 0;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line);
        if (d.type !== 'message') continue;
        const c = d.message?.usage?.cost?.total || 0;
        if (c > 0) total += c;
      } catch {}
    }
    return Math.round(total * 100) / 100;
  } catch {
    return 0;
  }
}

export function findAgentWorkspaces(openclawHome, config) {
  const oc = readOpenclawConfig(openclawHome);
  const map = {};
  const defaults = config?.paths?.defaultWorkspace ? expandHome(config.paths.defaultWorkspace) : null;

  // OpenClaw config shapes:
  // - agents.entries[agentId].workspace
  // - agents.entries[agentId].workspaceRoot + agents.entries[agentId].workspaceName
  try {
    const entries = oc?.agents?.entries || {};
    for (const [id, a] of Object.entries(entries)) {
      if (a?.workspace) {
        map[id] = a.workspace;
        continue;
      }
      if (a?.workspaceRoot && a?.workspaceName) {
        map[id] = path.join(String(a.workspaceRoot), String(a.workspaceName));
        continue;
      }
    }
  } catch {}

  // Convention: /home/anri/.openclaw/workspace-<agentId>
  try {
    const agentIds = listAgents(openclawHome);
    for (const id of agentIds) {
      if (map[id]) continue;
      const guess = path.join(path.dirname(openclawHome), `workspace-${id}`);
      if (fs.existsSync(guess)) map[id] = guess;
    }
  } catch {}

  if (!map.main && defaults) map.main = defaults;

  for (const [id, p] of Object.entries(map)) map[id] = expandHome(p);
  return map;
}

export function summarizeAgent(openclawHome, agentId) {
  const idx = readSessionsIndex(openclawHome, agentId);
  const sessions = idx.sessions || [];
  const sessionsCount = sessions.length;
  const lastUpdatedAt = sessionsCount ? (sessions[0].updatedAt || 0) : 0;
  const activeCount = sessions.filter(s => (Date.now() - (s.updatedAt || 0)) < 15 * 60 * 1000).length;
  return { sessionsCount, lastUpdatedAt, activeCount };
}
