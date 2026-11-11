import { spawn, SpawnOptions } from 'child_process';
import { cleanSnykEnv } from '@snyk/cli-interface';

interface ProcessOptions {
  cwd?: string;
  env?: { [name: string]: string };
}

function makeSpawnOptions(options?: ProcessOptions) {
  const spawnOptions: SpawnOptions = {
    shell: false,
    env: { ...process.env },
  };
  if (options?.cwd) {
    spawnOptions.cwd = options.cwd;
  }

  if (options?.env) {
    spawnOptions.env = { ...spawnOptions.env, ...options.env };
  } else {
    spawnOptions.env = { ...spawnOptions.env };
  }

  spawnOptions.env = cleanSnykEnv(spawnOptions.env, process.env);

  return spawnOptions;
}

export function execute(
  command: string,
  args: string[],
  options?: ProcessOptions,
): Promise<string> {
  const spawnOptions = makeSpawnOptions(options);
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn(command, args, spawnOptions);
    proc.stdout?.on('data', (data) => {
      stdout = stdout + data;
    });
    proc.stderr?.on('data', (data) => {
      stderr = stderr + data;
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(stdout || stderr);
      }
      resolve(stdout || stderr);
    });
  });
}
