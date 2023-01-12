import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { execute } from './subprocess';
import * as path from 'path';
import * as fs from 'fs';
import { SwiftError } from './errors';

const SWIFT_BUILD_FOLDER = '.build';
const SWIFT_PACKAGE_RESOLVED = 'Package.resolved';

export type DepTreeNode = {
  name: string;
  url: string;
  version: string;
  path: string;
  dependencies: DepTreeNode[];
};

function deletePath(path: string) {
  try {
    const stat = fs.lstatSync(path);
    stat.isDirectory() && fs.rmdirSync(path, { recursive: true });
    stat.isFile() && fs.unlinkSync(path);
  } catch (error) {
    console.error('Unable to delete file..');
  }
}

export async function computeDepGraph(
  root: string,
  targetFile: string,
  additionalArgs?: string[],
): Promise<DepGraph> {
  const args = ['package'];

  if (additionalArgs) {
    args.push(...additionalArgs);
  }
  args.push(
    ...[
      '--package-path',
      path.dirname(targetFile),
      'show-dependencies',
      '--format',
      'json',
    ],
  );

  try {
    const result = await execute('swift', args, { cwd: root });
    const depTree: DepTreeNode = JSON.parse(result);
    const depGraph: DepGraph = convertToGraph(depTree);
    deletePath(root);
    return depGraph;
  } catch (err) {
    deletePath(root);
    const errAsString = err as string;
    throw new SwiftError('Unable to generate dependency tree', errAsString);
  } finally {
    deletePath(root);
  }
}

function traverseTree(
  rootNode: DepTreeNode,
  builder: DepGraphBuilder,
  rootNodeId?: string,
) {
  const childNodes = rootNode.dependencies;

  childNodes?.forEach((node) => {
    const { url, version } = node;
    const name = url
      .replace(/https:\/\//g, '')
      .replace(/http:\/\//g, '')
      .replace(/.git/g, '');
    const parentName =
      rootNodeId ||
      rootNode.url
        .replace(/https:\/\//g, '')
        .replace(/http:\/\//g, '')
        .replace(/.git/g, '');

    const nodeId = `${name}@${version}`;
    const parentNodeId = `${parentName}@${rootNode.version}`;

    builder.addPkgNode({ name, version }, nodeId);
    builder.connectDep(rootNodeId || parentNodeId, nodeId);

    traverseTree(node, builder);
  });
}

function convertToGraph(rootNode: DepTreeNode): DepGraph {
  const { name, version } = rootNode;
  const depGraphBuilder = new DepGraphBuilder(
    { name: 'swift' },
    { name, version },
  );

  traverseTree(rootNode, depGraphBuilder, depGraphBuilder.rootNodeId);

  return depGraphBuilder.build();
}
