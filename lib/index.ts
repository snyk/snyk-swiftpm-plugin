import { computeDepGraph as swiftDepGraph } from './swiftpm/compute-depgraph';
import { computeDepGraph as carthageDepGraph } from './carthage/deps';
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
  const filename = path.basename(targetFile);
  const supportedPackageManagers = ['Swift Package Manager', 'Carthage'];
  const supportedTargetFiles = {
    'Package.swift': swiftDepGraph,
    'Cartfile.resolved': carthageDepGraph,
  };
  if (!(filename in supportedTargetFiles)) {
    throw new Error(
      `${filename} is not supported by ${supportedPackageManagers.join(' or ')}. ` +
        `Please provide with path to ${Object.keys(supportedTargetFiles).join(' or ')} files.`,
    );
  }
  if (filename === 'Package.swift') {
    const swiftPath = await lookpath('swift');
    if (!swiftPath) {
      throw new Error(
        'The "swift" command is not available on your system. ' +
          'To scan your dependencies in the CLI, you must ensure you have ' +
          'first installed the relevant package manager.',
      );
    }
  }

  const computeDepGraph = supportedTargetFiles[filename];
  const depGraph = await computeDepGraph(root, targetFile, options?.args);
  if (!depGraph) {
    throw new Error(`Failed to scan ${targetFile}`);
  }
  return {
    plugin: {
      name: 'snyk-swiftpm-plugin',
      runtime: 'unknown',
      targetFile: `${pathToPosix(targetFile)}${filename}`,
    },
    dependencyGraph: depGraph,
  };
}
