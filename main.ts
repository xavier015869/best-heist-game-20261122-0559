// main.ts — the entrypoint the grader runs (node main.ts, Node 22, no network).
// Copies game/ and screenshots/ from this repository into MAKEFUN_OUTPUT_DIR
// (or ./out) and writes dossier.json there with buildDossier from the
// vendored library. Deterministic: same files in, same bytes out.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(repoRoot, 'out');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

mkdirSync(outDir, { recursive: true });

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('main.ts: game/ is missing from the repository');
if (!existsSync(shotsSrc)) throw new Error('main.ts: screenshots/ is missing from the repository');

cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const shotNames = ['1-action.jpg', '2-plan.jpg', '3-vault.jpg', '4-escape.jpg'];
const present = shotNames.filter((n) => existsSync(join(outDir, 'screenshots', n)));
console.log(`Midnight Vault: wrote ${outDir}/dossier.json (${dossier.length} bytes), `
  + `${present.length} screenshots, game copied.`);
