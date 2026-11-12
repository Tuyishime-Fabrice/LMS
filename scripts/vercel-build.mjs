import { spawnSync } from 'node:child_process';
import { build } from 'vite';

const tscBin = process.platform === 'win32'
  ? 'node_modules/.bin/tsc.cmd'
  : 'node_modules/.bin/tsc';

const typecheck = spawnSync(tscBin, ['-p', 'tsconfig.app.json', '--noEmit'], {
  stdio: 'inherit',
  shell: false,
});

if (typecheck.error) {
  console.error(typecheck.error);
  process.exit(1);
}

if (typecheck.status !== 0) {
  process.exit(typecheck.status ?? 1);
}

try {
  await build();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
