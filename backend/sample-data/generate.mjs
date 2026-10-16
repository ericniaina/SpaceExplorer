// Generates deterministic sample CSVs in the batch format (no header, "FullPath;SizeInBytes").
// Usage: node generate.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function random(seed) {
  // mulberry32
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(basePath, seed) {
  const rnd = random(seed);
  const int = (min, max) => Math.floor(min + rnd() * (max - min + 1));
  const lines = [];

  for (let c = 1; c <= 10; c++) {
    const compartment = `Compartiment${c}`;
    const workspaceCount = int(2, 7);
    for (let w = 1; w <= workspaceCount; w++) {
      const workspace = `Workspace${String(w).padStart(2, '0')}`;
      const jobsFolder = `${basePath}\\${compartment}\\${workspace}\\jobs`;
      const jobLines = [];
      let jobsSum = 0;
      for (let j = 1, jobCount = int(0, 12); j <= jobCount; j++) {
        const size = int(50, 80_000) * 1024 * 1024 + int(0, 1_048_575);
        jobsSum += size;
        jobLines.push(`${jobsFolder}\\Job_${String(j).padStart(4, '0')};${size}`);
      }
      // The jobs total also counts files stored directly in the jobs folder.
      const total = jobsSum + int(0, 2_000) * 1024 * 1024;
      // One workspace without its jobs total line, to exercise the fallback to the sum of its jobs.
      const omitTotal = c === 2 && w === 1;
      if (!omitTotal) lines.push(`${jobsFolder};${total}`);
      lines.push(...jobLines);
    }
  }

  return lines.join('\r\n') + '\r\n';
}

writeFileSync(join(here, 'spaceA.csv'), generate('D:\\Data\\SpaceA', 42));
writeFileSync(join(here, 'spaceB.csv'), generate('E:\\Data\\SpaceB', 1337));
console.log('spaceA.csv and spaceB.csv generated in', here);
