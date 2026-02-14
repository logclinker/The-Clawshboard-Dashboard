import os from 'os';
import path from 'path';

export function expandHome(p) {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function safeJoin(base, rel) {
  // Prevent path traversal. base must be absolute.
  const target = path.resolve(base, rel);
  const baseResolved = path.resolve(base);
  if (target === baseResolved) return target;
  if (!target.startsWith(baseResolved + path.sep)) {
    const err = new Error('Path escapes base');
    err.code = 'E_PATH_ESCAPE';
    throw err;
  }
  return target;
}
