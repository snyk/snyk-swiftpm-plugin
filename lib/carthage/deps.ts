import {
  DepGraphBuilder,
  PkgInfo,
  PkgManager,
  DepGraph,
} from '@snyk/dep-graph';
import * as path from 'path';
import * as fs from 'fs';
import { CartfileEntry } from './types';
import { parseInput } from './parser';

const getCheckoutDirectory = (entry: CartfileEntry): string => {
  // determines checkout directory from cartfile entry
  const source = entry.source.value;
  if (entry.source.kind === 'repo') {
    return source.split('/').pop() || source;
  } else if (entry.source.kind === 'url' || entry.source.kind === 'file') {
    const parsed = new URL(source)?.pathname;
    return parsed?.replace(/\.git$/, '') || source;
  }
  return `${entry.source}`;
};

const getPackageName = (entry: CartfileEntry): string => {
  const source = entry.source.value;
  // default behavior omits github.com/ for repositories
  if (entry.source.kind === 'repo') {
    return 'github.com/' + source;

    // urls need to omit the protocol and .git
  } else if (entry.source.kind === 'url') {
    const u = new URL(source);
    return `${u?.hostname}${u?.pathname}`;

    // otherwise passthrough
  }
  return `${entry.source}`;
};

const getVersion = (entry: CartfileEntry): string => {
  if (entry.version.kind === 'version-range') {
    // Cartfile.resolved should contain exact versions,
    // but handle range specifier if encountered (use the specific value)
    return entry.version.value.value;
  }
  // Handles 'semver', 'git-ref', 'any' (*)
  return entry.version.value;
};

const getDepNodeId = (name: string, version: string): string =>
  `${name}@${version}`;

const buildDepGraph = async (
  builder: DepGraphBuilder,
  cartfile: string,
  parent: string | undefined = undefined,
): Promise<DepGraph> => {
  if (!fs.existsSync(cartfile)) {
    return builder.build();
  }
  const content = fs.readFileSync(cartfile, 'utf-8');
  const entries = parseInput(content);
  const cwd = path.dirname(cartfile);
  const file = path.basename(cartfile);
  await Promise.all(
    entries.map((entry) => {
      const dir = getCheckoutDirectory(entry);
      const name = getPackageName(entry);
      const version = getVersion(entry);
      const nodeId = getDepNodeId(name, version);
      const pkgInfo: PkgInfo = { name, version };
      const connectTo = parent || builder.rootNodeId;
      builder.addPkgNode(pkgInfo, nodeId);
      builder.connectDep(connectTo, nodeId);
      const childPath = path.join(cwd, 'Carthage', 'Checkouts', dir, file);
      return buildDepGraph(builder, childPath, nodeId);
    }),
  );
  return builder.build();
};

export const computeDepGraph = async (
  root: string,
  targetFile: string,
  packageManager: PkgManager | undefined = { name: 'swift', version: 'n/a' },
  rootPkg: PkgInfo | undefined = undefined,
): Promise<DepGraph> => {
  const pathToTargetFile = path.join(root, targetFile);
  if (!fs.existsSync(pathToTargetFile)) {
    throw new Error(`File not found: ${pathToTargetFile}`);
  }

  const manager: PkgManager = packageManager || {
    name: 'swift',
    version: 'n/a',
  };
  const builder = rootPkg
    ? new DepGraphBuilder(manager, rootPkg)
    : new DepGraphBuilder(manager);

  return await buildDepGraph(builder, pathToTargetFile);
};
