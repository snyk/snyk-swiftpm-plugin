import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { execute } from './subprocess';
import * as path from 'path';
import * as os from "os";
import * as fs from "fs";

export type DepTreeNode = {
  name: string;
  url: string;
  version: string;
  path: string;
  dependencies: DepTreeNode[];
};

export async function computeDepGraph(
  root: string,
  targetFile: string,
  additionalArgs?: string[],
): Promise<DepGraph> {

  //create temporary folder
  const tempDir = os.tmpdir();
  const randomFolderName = fs.mkdtempSync("snyk-swift-");
  const fullPath= path.join(tempDir, randomFolderName);

  try {
    const defaultArgs = [
      'package',
      '--scratch-path',
      path.join(fullPath),
      '--package-path',
      path.dirname(targetFile),
      'show-dependencies',
      '--format',
      'json',
    ];

    const args = additionalArgs
      ? defaultArgs.concat(additionalArgs)
      : defaultArgs;
    const result = await execute('swift', args, { cwd: root });
    const depTree: DepTreeNode = JSON.parse(result);
    const depGraph: DepGraph = convertToGraph(depTree);

    return depGraph;
  } catch (e) {
    throw new Error('Unable to generate dependency tree');
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
