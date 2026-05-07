import { computeDepGraph, packageNameFromUrl } from '../../lib/compute-depgraph';
import { execute } from '../../lib/subprocess';
import {
  dependencies,
  dependenciesWithMixedSources,
  dependenciesWithRegistryIdentity,
} from '../fixtures/dependencies';
import * as path from 'path';

jest.setTimeout(100000);
jest.mock('../../lib/subprocess');
jest.mock('fs');

const mockedExecute = jest.mocked(execute);
mockedExecute.mockResolvedValue(JSON.stringify(dependencies));
const SWIFT_DEFAULT_PARAMETERS_COUNT = 6;

describe('packageNameFromUrl', () => {
  it('strips https scheme and .git suffix from SCM URLs', () => {
    expect(packageNameFromUrl('https://github.com/apple/swift-nio.git')).toBe(
      'github.com/apple/swift-nio',
    );
  });

  it('strips http scheme and .git suffix', () => {
    expect(packageNameFromUrl('http://github.com/apple/swift-nio.git')).toBe(
      'github.com/apple/swift-nio',
    );
  });

  it('only strips .git at end of string, not mid-URL occurrences', () => {
    expect(
      packageNameFromUrl('https://github.com/user/digit-tool.git'),
    ).toBe('github.com/user/digit-tool');
  });

  it('converts scope.package-name registry identity to github.com path', () => {
    expect(packageNameFromUrl('apple.swift-argument-parser')).toBe(
      'github.com/apple/swift-argument-parser',
    );
  });

  it('returns single-component identities (no dot) unchanged', () => {
    expect(packageNameFromUrl('swift-nio')).toBe('swift-nio');
  });

  it('returns multi-dot strings unchanged (not valid Swift registry format)', () => {
    expect(packageNameFromUrl('com.apple.swift-nio')).toBe(
      'com.apple.swift-nio',
    );
  });

  it('returns ssh:// URLs unchanged (pre-existing limitation)', () => {
    expect(packageNameFromUrl('ssh://git@github.com/apple/swift-nio.git')).toBe(
      'ssh://git@github.com/apple/swift-nio.git',
    );
  });

  it('returns git@ URLs unchanged (pre-existing limitation)', () => {
    expect(packageNameFromUrl('git@github.com:apple/swift-nio.git')).toBe(
      'git@github.com:apple/swift-nio.git',
    );
  });

  it('returns local paths unchanged', () => {
    expect(packageNameFromUrl('/Users/user/my-package')).toBe(
      '/Users/user/my-package',
    );
  });
});

describe('compute-depgraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should successfully create snyk dep graph from swift-pm dep tree', async () => {
    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    const result = await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
    );

    expect(result).toMatchSnapshot();
  });

  it('should convert registry identity URLs (scope.package-name) to github.com paths', async () => {
    mockedExecute.mockResolvedValueOnce(
      JSON.stringify(dependenciesWithRegistryIdentity),
    );
    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    const result = await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
    );
    expect(result).toMatchSnapshot();
  });

  it('should handle trees mixing https URLs and registry identities', async () => {
    mockedExecute.mockResolvedValueOnce(
      JSON.stringify(dependenciesWithMixedSources),
    );
    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    const result = await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
    );
    expect(result).toMatchSnapshot();
  });

  it('should add additional parameters (one) to swiftpm cli', async () => {
    const additionalArguments = ['firstParam'];

    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
      additionalArguments,
    );

    const swiftArguments: string[] = mockedExecute.mock.calls[0][1];
    expect(swiftArguments[1]).toEqual(additionalArguments[0]);
  });

  it('should add additional parameters (many) to swiftpm cli', async () => {
    const additionalArguments = ['firstParam', 'secondParam', 'thirdParam'];

    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
      additionalArguments,
    );

    expect(mockedExecute).toHaveBeenCalledWith(
      'swift',
      [
        'package',
        'firstParam',
        'secondParam',
        'thirdParam',
        '--package-path',
        expect.any(String),
        'show-dependencies',
        '--format',
        'json',
      ],
      { cwd: expect.any(String) },
    );
  });

  it('should add additional parameters (none) to swiftpm cli', async () => {
    const additionalArguments = undefined;

    const targetFile = path.join(__dirname, '../fixtures/Package.swift');
    await computeDepGraph(
      path.join(__dirname, '../fixtures'),
      targetFile,
      additionalArguments,
    );

    const swiftArguments = mockedExecute.mock.calls[0][1];
    expect(swiftArguments.length).toEqual(SWIFT_DEFAULT_PARAMETERS_COUNT);
  });
});
