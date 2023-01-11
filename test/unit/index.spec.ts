import { inspect } from '../../lib/index';
import { lookpath } from 'lookpath';
import { computeDepGraph } from '../../lib/compute-depgraph';
import { DepGraphBuilder } from '@snyk/dep-graph';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('../../lib/compute-depgraph');
jest.mock('lookpath');
jest.mock('fs');

const depGraph = new DepGraphBuilder(
  { name: 'swift' },
  { name: 'packageName', version: '1.0' },
).build();

describe('inspect', () => {
  it('should return depgraph', async () => {
    const mockedLookpath = jest.mocked(lookpath);
    const mockedFs = jest.mocked(fs, true);
    mockedFs.mkdtempSync.mockReturnValue('snyk-path-to-file');
    const mockedComputeDepGraph = jest.mocked(computeDepGraph);
    mockedLookpath.mockResolvedValue('swifty');
    mockedComputeDepGraph.mockResolvedValueOnce(depGraph);

    const result = await inspect(
      `${__dirname}/../fixtures/`,
      'Package.swift',
      {},
    );
    expect(result).toEqual({
      plugin: {
        name: 'snyk-swiftpm-plugin',
        runtime: 'unknown',
        targetFile: path.join(`${__dirname}/../fixtures/`, 'Package.swift'),
      },
      dependencyGraph: expect.any(Object),
    });
  });
  it('should reject invalid manifest', async () => {
    const mockedLookpath = jest.mocked(lookpath);
    const mockedComputeDepGraph = jest.mocked(computeDepGraph);
    mockedLookpath.mockResolvedValue('swifty');
    mockedComputeDepGraph.mockResolvedValueOnce(depGraph);
    await expect(() =>
      inspect(`${__dirname}/../fixtures/`, 'manifest.swift', {}),
    ).rejects.toThrowError(
      'manifest.swift is not supported by Swift Package Manager. Please provide with path to Package.swift',
    );
  });
  it('should check for swift binary', async () => {
    const mockedLookpath = jest.mocked(lookpath);
    const mockedComputeDepGraph = jest.mocked(computeDepGraph);
    mockedLookpath.mockResolvedValue(undefined);
    await expect(() =>
      inspect(`${__dirname}/../fixtures/`, 'Package.swift', {}),
    ).rejects.toThrowError(
      'The "swift" command is not available on your system. To scan your dependencies in the CLI, you must ensure you have first installed the relevant package manager.',
    );
  });
});
