import { inspect } from '../../lib/index';
import { lookpath } from 'lookpath';
import { computeDepGraph } from '../../lib/swiftpm/compute-depgraph';
import { DepGraphBuilder } from '@snyk/dep-graph';

jest.mock('../../lib/swiftpm/compute-depgraph');
jest.mock('lookpath');
jest.mock('fs');

const depGraph = new DepGraphBuilder(
  { name: 'swift' },
  { name: 'packageName', version: '1.0' },
).build();

describe('inspect', () => {
  it('should return depgraph', async () => {
    const mockedLookpath = jest.mocked(lookpath);
    const mockedComputeDepGraph = jest.mocked(computeDepGraph);
    mockedLookpath.mockResolvedValue('swifty');
    mockedComputeDepGraph.mockResolvedValueOnce(depGraph);

    const result = await inspect(
      `${__dirname}/../fixtures/swift_projects`,
      'Package.swift',
      {},
    );
    expect(result).toMatchSnapshot();
  });

  it('should reject invalid manifest', async () => {
    const mockedLookpath = jest.mocked(lookpath);
    const mockedComputeDepGraph = jest.mocked(computeDepGraph);
    mockedLookpath.mockResolvedValue('swifty');
    mockedComputeDepGraph.mockResolvedValueOnce(depGraph);
    await expect(() =>
      inspect(`${__dirname}/../fixtures/`, 'manifest.swift', {}),
    ).rejects.toThrowError(
      'manifest.swift is not supported by Swift Package Manager or Carthage. Please provide with path to Package.swift or Cartfile.resolved files.',
    );
  });

  it('should check for swift binary', async () => {
    const mockedLookpath = jest.mocked(lookpath);
    mockedLookpath.mockResolvedValue(undefined);
    await expect(() =>
      inspect(`${__dirname}/../fixtures/swift_projects`, 'Package.swift', {}),
    ).rejects.toThrowError(
      'The "swift" command is not available on your system. To scan your dependencies in the CLI, you must ensure you have first installed the relevant package manager.',
    );
  });
});
