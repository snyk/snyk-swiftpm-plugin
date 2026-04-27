import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { execute } from './subprocess';
import * as path from 'path';
import { SwiftError } from './errors';

export type DepTreeNode = {
  identity?: string;
  name: string;
  url: string;
  version: string;
  path: string;
  dependencies: DepTreeNode[];
};

// Matches Swift Package Registry identity format: scope.package-name
// e.g. "apple.swift-argument-parser" → github.com/apple/swift-argument-parser
const REGISTRY_IDENTITY_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z0-9][a-zA-Z0-9-]*$/;

export function packageNameFromUrl(url: string): string {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
      .replace(/https:\/\//g, '')
      .replace(/http:\/\//g, '')
      .replace(/\.git$/g, '');
  }
  if (REGISTRY_IDENTITY_RE.test(url)) {
    const dotIndex = url.indexOf('.');
    return `github.com/${url.slice(0, dotIndex)}/${url.slice(dotIndex + 1)}`;
  }
  return url;
}

function traverseTree(
  rootNode: DepTreeNode,
  builder: DepGraphBuilder,
  rootNodeId?: string,
) {
  const childNodes = rootNode.dependencies;

  childNodes?.forEach((node) => {
    const { url, version } = node;
    const name = packageNameFromUrl(url);
    const parentName = rootNodeId || packageNameFromUrl(rootNode.url);

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
    return convertToGraph(depTree);
  } catch (err) {
    const errAsString = err as string;
    throw new SwiftError('Unable to generate dependency tree', errAsString);
  }
}
