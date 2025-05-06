import { computeDepGraph } from '../../lib/carthage/deps';
import { DepGraph } from '@snyk/dep-graph';
import * as path from 'path';

const packageSet = (depgraph: DepGraph): Set<string> =>
  new Set(depgraph.getPkgs().map((pkg) => `${pkg.name}@${pkg.version}`));

const fixturePath = (fixtureName) => {
  return path.join('test', 'fixtures', 'carthage_projects', fixtureName);
};
describe('when analysing a Carthage project', () => {
  it('should be able discover all resolved carthage dependencies', async () => {
    const graph = await computeDepGraph(
      fixturePath('complex/Cartfile.resolved'),
    );
    expect(graph).toBeDefined();
    const expected = new Set([
      '_root@0.0.0',
      'github.com/robrix/Box@1.2.2',
      'github.com/antitypical/Result@0.4.3',
      'github.com/ReactiveCocoa/ReactiveCocoa@12110113b02b22c7d3a1e7aa423d76340eb19157',
      'github.com/Quick/Nimble@v0.4.2',
      'github.com/Quick/Quick@v0.3.1',
      'github.com/jspahrsummers/xcconfigs@0.8',
    ]);

    const actual = packageSet(graph);
    expect(actual.size).toEqual(expected.size);
    expect(actual).toEqual(expected);
  });

  it('should throw an error if the root Cartfile.resolved is missing', async () => {
    const nonExistentPath = fixturePath('non-existent-path/Cartfile.resolved');
    await expect(computeDepGraph(nonExistentPath)).rejects.toThrow(
      `File not found: ${nonExistentPath}`,
    );
  });

  it('should handle dependencies without their own Cartfile.resolved', async () => {
    const graph = await computeDepGraph(
      fixturePath('spm-transitive/Cartfile.resolved'),
    );
    expect(graph).toBeDefined();

    const expected = new Set<string>([
      '_root@0.0.0',
      'github.com/OrgA/DepA@1.0.0',
    ]);
    const actual = packageSet(graph);
    expect(actual).toEqual(expected);
  });

  it('should handle diamond dependencies correctly', async () => {
    const graph = await computeDepGraph(
      fixturePath('diamond/Cartfile.resolved'),
    );
    expect(graph).toBeDefined();

    const expected = new Set([
      '_root@0.0.0',
      'github.com/OrgB/DepB@2.0.0',
      'github.com/OrgC/DepC@3.0.0',
      'github.com/OrgD/DepD@4.0.0',
    ]);
    const actual = packageSet(graph);
    expect(actual).toEqual(expected);
  });
});
