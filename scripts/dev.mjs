import { spawn } from 'node:child_process';

const api = spawn('npm', ['run', 'dev:api'], { stdio: 'inherit', shell: true });
const web = spawn('npm', ['run', 'dev:web'], { stdio: 'inherit', shell: true });

for (const child of [api, web]) {
  child.on('exit', (code) => {
    if (code !== 0) process.exit(code ?? 1);
  });
}
