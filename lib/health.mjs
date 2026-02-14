import os from 'os';
import { execSync } from 'child_process';

export function getHealthSnapshot() {
  const load = os.loadavg();
  const cpus = os.cpus() || [];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  let disk = null;
  try {
    // Linux: df -P for stable parsing
    const out = execSync('df -P /', { encoding: 'utf8', timeout: 1500 });
    const lines = out.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      // Filesystem 1024-blocks Used Available Capacity Mounted
      const capacity = parts[4];
      disk = { mount: parts[5] || '/', capacity };
    }
  } catch {}

  return {
    timestamp: Date.now(),
    cpu: {
      cores: cpus.length,
      load1: load[0],
      load5: load[1],
      load15: load[2],
    },
    mem: {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
      usedPct: totalMem ? (totalMem - freeMem) / totalMem : 0,
    },
    disk,
  };
}
