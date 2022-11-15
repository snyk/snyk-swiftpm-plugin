import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { execute } from './subprocess';
export type DepTreeNode = {
  name: string;
  url: string;
  version: string;
  path: string;
  dependencies: DepTreeNode[];
};

export async function computeDepGraph(
  root: string,
  additionalArgs?: string[],
): Promise<DepGraph> {
  try {
    const defaultArgs = ['package', 'show-dependencies', '--format', 'json'];

    const args = additionalArgs
      ? defaultArgs.concat(additionalArgs)
      : defaultArgs;
    const result = await execute('swift', args, { cwd: root });
    const depTree: DepTreeNode = JSON.parse(result);
    const depGraph: DepGraph = convertToGraph(depTree);

    return depGraph;
  } catch (e) {
    throw new Error('Unable to generate dependencies tree');
  }
}

function traverseTree(
  rootNode: DepTreeNode,
  builder: DepGraphBuilder,
  rootNodeId?: string,
) {
  const childNodes = rootNode.dependencies;

  childNodes?.forEach((node) => {
    const { name, version } = node;
    const nodeId = `${name}@${version}`;

    builder.addPkgNode({ name, version }, nodeId);
    builder.connectDep(
      rootNodeId || `${rootNode.name}@${rootNode.version}`,
      nodeId,
    );

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
