import { computeDepGraph } from '../../lib/compute-depgraph';
import * as path from 'path';

describe('compute-depgraph', () => {
  // Run locally for verifications. Or even better, add OSX runner to CircleCI and run it there as well.
  it.skip('should successfully create snyk dep graph from swift-pm dep tree', async () => {
    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    const result = await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
    );

    expect(result).toMatchSnapshot();
  }, 100000);
});
