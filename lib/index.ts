import { computeDepGraph as swiftDepGraph } from './swiftpm/compute-depgraph';
import { computeDepGraph as carthageDepGraph } from './carthage/deps';
import { DepGraph, PkgManager, PkgInfo } from '@snyk/dep-graph';
import { lookpath } from 'lookpath';
import * as path from 'path';

interface Options {
  debug?: boolean;
  file?: string;
  args?: string[];
  pkgManager?: PkgManager;
  rootPkg?: PkgInfo;
}

// we assume that swift considers folders as packages instead of manifest files
function pathToPosix(fpath) {
  const parts = fpath.split(path.sep);
  parts.pop();
  if (parts.length === 0) {
    return '.';
  }
  return parts.join(path.posix.sep);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function inspect(
  root: string,
  targetFile: string,
  options?: Options,
) {
  const filename = path.basename(targetFile);
  let depGraph: DepGraph;
  if (filename == 'Package.swift') {
    const swiftPath = await lookpath('swift');
    if (!swiftPath) {
      throw new Error(
        'The "swift" command is not available on your system. ' +
          'To scan your dependencies in the CLI, you must ensure you have ' +
          'first installed the relevant package manager.',
      );
    }
    depGraph = await swiftDepGraph(root, targetFile, options?.args);
  } else if (filename == 'Cartfile.resolved' || filename == 'Cartfile') {
    depGraph = await carthageDepGraph(
      root,
      targetFile,
      options?.pkgManager,
      options?.rootPkg,
    );
  } else {
    throw new Error(
      `${filename} is not supported by Swift Package Manager or Carthage. ` +
        `Please provide with path to Package.swift or Cartfile.resolved files.`,
    );
  }

  if (!depGraph) {
    throw new Error(`Failed to scan ${targetFile}`);
  }
  return {
    plugin: {
      name: 'snyk-swiftpm-plugin',
      runtime: 'unknown',
      targetFile: `${pathToPosix(targetFile)}${path.posix.sep}${filename}`,
    },
    dependencyGraph: depGraph,
  };
}
