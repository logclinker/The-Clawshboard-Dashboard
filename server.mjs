import express from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import { expandHome, safeJoin } from './lib/paths.mjs';
import {
  getOpenclawHome,
  listAgents,
  readSessionsIndex,
  tailSessionMessages,
  computeSessionCostFromJsonl,
  findAgentWorkspaces,
  summarizeAgent,
  readOpenclawConfig,
} from './lib/openclaw.mjs';
import { getHealthSnapshot } from './lib/health.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(DIR, 'public');

function readConfig() {
  const p = path.join(DIR, 'config.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const config = readConfig() || JSON.parse(fs.readFileSync(path.join(DIR, 'config.example.json'), 'utf8'));
const host = config?.server?.host || '0.0.0.0';
const port = config?.server?.port || 7010;

const openclawHome = getOpenclawHome(config);
const openclawConfig = readOpenclawConfig(openclawHome);
const agentWorkspaces = findAgentWorkspaces(openclawHome, config);
const allowedFiles = new Set((config?.editing?.allowedFiles || []).map(String));

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Basic safety headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.json(getHealthSnapshot());
});

function getConfiguredAgentList() {
  // openclaw.json supports agents.list: [{id, workspace, ...}, ...]
  const list = openclawConfig?.agents?.list;
  if (!Array.isArray(list)) return [];
  return list
    .map(a => ({ id: a?.id, workspace: a?.workspace || null }))
    .filter(a => typeof a.id === 'string' && a.id.length);
}

app.get('/api/agents', (req, res) => {
  const runtimeIds = listAgents(openclawHome);
  const configured = getConfiguredAgentList();

  const allIds = new Set([...runtimeIds, ...configured.map(a => a.id)]);
  const agents = [...allIds].sort().map(id => {
    const summary = runtimeIds.includes(id) ? summarizeAgent(openclawHome, id) : { sessionsCount: 0, lastUpdatedAt: 0, activeCount: 0 };
    const conf = configured.find(a => a.id === id);
    return {
      id,
      workspace: agentWorkspaces[id] || conf?.workspace || null,
      configured: !!conf,
      active: runtimeIds.includes(id),
      ...summary,
    };
  });

  res.json({ openclawHome, agents });
});

app.get('/api/birdview', (req, res) => {
  const runtimeIds = listAgents(openclawHome);
  const configured = getConfiguredAgentList();
  const allIds = new Set([...runtimeIds, ...configured.map(a => a.id)]);

  const agents = [...allIds].sort().map(id => {
    const summary = runtimeIds.includes(id) ? summarizeAgent(openclawHome, id) : { sessionsCount: 0, lastUpdatedAt: 0, activeCount: 0 };
    const conf = configured.find(a => a.id === id);
    return {
      id,
      workspace: agentWorkspaces[id] || conf?.workspace || null,
      configured: !!conf,
      active: runtimeIds.includes(id),
      ...summary,
    };
  });

  // Skills/tools (best-effort) from openclaw.json
  const skills = [];
  try {
    const entries = openclawConfig?.skills?.entries || {};
    for (const [name, conf] of Object.entries(entries)) {
      if (conf && typeof conf === 'object') {
        skills.push({ name, enabled: conf.enabled !== false });
      } else {
        skills.push({ name, enabled: true });
      }
    }
  } catch {}
  skills.sort((a,b) => a.name.localeCompare(b.name));

  res.json({
    openclawHome,
    agents,
    skills,
    nodes: { status: 'not_connected', note: 'Nodes require Gateway tool access; not wired yet.' },
  });
});

app.get('/api/agent/:id/sessions', (req, res) => {
  const agentId = req.params.id;
  res.json(readSessionsIndex(openclawHome, agentId));
});

app.get('/api/agent/:id/session/:sessionId/messages', (req, res) => {
  const agentId = req.params.id;
  const sessionId = req.params.sessionId;
  const limit = Math.max(1, Math.min(400, parseInt(req.query.limit || '80', 10)));
  res.json({ messages: tailSessionMessages(openclawHome, agentId, sessionId, limit) });
});

app.get('/api/agent/:id/session/:sessionId/cost', (req, res) => {
  const agentId = req.params.id;
  const sessionId = req.params.sessionId;
  res.json({ cost: computeSessionCostFromJsonl(openclawHome, agentId, sessionId) });
});

app.get('/api/agent/:id/session/:sessionId/detail', (req, res) => {
  const agentId = req.params.id;
  const sessionId = req.params.sessionId;
  const limit = Math.max(1, Math.min(400, parseInt(req.query.limit || '80', 10)));
  const messages = tailSessionMessages(openclawHome, agentId, sessionId, limit);
  const cost = computeSessionCostFromJsonl(openclawHome, agentId, sessionId);
  const last = messages.length ? messages[messages.length - 1] : null;
  res.json({ agentId, sessionId, cost, last, messages });
});

const FileSpec = z.object({
  agentId: z.string().min(1),
  filename: z.string().min(1),
});

function resolveEditableFile({ agentId, filename }) {
  if (!allowedFiles.has(filename)) {
    const err = new Error('File not allowed');
    err.status = 403;
    throw err;
  }
  const ws = agentWorkspaces[agentId];
  if (!ws) {
    const err = new Error('Unknown agent workspace');
    err.status = 404;
    throw err;
  }
  const full = safeJoin(ws, filename);
  return full;
}

app.get('/api/file', (req, res) => {
  const parsed = FileSpec.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Bad query' });
  try {
    const full = resolveEditableFile(parsed.data);
    const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
    res.json({ path: full, content });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

const PutFileSpec = z.object({
  agentId: z.string().min(1),
  filename: z.string().min(1),
  content: z.string(),
});

app.put('/api/file', (req, res) => {
  const parsed = PutFileSpec.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Bad body' });
  try {
    const full = resolveEditableFile(parsed.data);

    // Safety: write a timestamped backup next to the file (best-effort)
    try {
      if (fs.existsSync(full)) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const bak = full + `.bak.${ts}`;
        fs.copyFileSync(full, bak);
      }
    } catch {}

    fs.writeFileSync(full, parsed.data.content, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.use(express.static(PUBLIC_DIR));

app.listen(port, host, () => {
  console.log(`[clawshboard] http://${host}:${port}`);
  console.log(`[clawshboard] openclawHome=${openclawHome}`);
});
