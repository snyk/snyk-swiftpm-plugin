import { computeDepGraph } from './compute-depgraph';
import { lookpath } from 'lookpath';
import * as path from 'path';

interface Options {
  debug?: boolean;
  file?: string;
  args?: string[];
}

// we assume that swift considers folders as packages instead of manifest files
function pathToPosix(fpath) {
  const parts = fpath.split(path.sep);
  parts.pop();
  if (parts.length === 0) {
    return './';
  }
  return parts.join(path.posix.sep);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function inspect(
  root: string,
  targetFile: string,
  options?: Options,
) {
  const swiftPath = await lookpath('swift');

  // Review whether we should check for this or for xcode
  // const xctestPath = await lookpath('xctest');
  const filename = targetFile.split(path.sep).slice(-1)[0];
  if (filename !== 'Package.swift') {
    throw new Error(
      `${filename} is not supported by Swift Package Manager. Please provide with path to Package.swift`,
    );
  }
  if (!swiftPath) {
    throw new Error(
      'The "swift" command is not available on your system. To scan your dependencies in the CLI, you must ensure you have first installed the relevant package manager.',
    );
  }
  const depGraph = await computeDepGraph(root, targetFile, options?.args);
  if (!depGraph) {
    throw new Error('Failed to scan this Swift PM project.');
  }
  return {
    plugin: {
      name: 'snyk-swiftpm-plugin',
      runtime: 'unknown',
      targetFile: `${pathToPosix(targetFile)}Package.swift`,
    },
    dependencyGraph: depGraph,
  };
}
