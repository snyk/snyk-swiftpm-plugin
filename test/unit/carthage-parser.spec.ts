import { parseInput } from '../../lib/carthage/parser';
import * as fs from 'fs';
import * as path from 'path';

const fixture = (filename: string): string => {
  const fixtureFile = path.join(
    'test',
    'fixtures',
    'carthage_projects',
    filename,
  );
  return fs.readFileSync(fixtureFile, 'utf8');
};

describe('when analysing a Carthage project', () => {
  const basicCartfile = fixture('basic/Cartfile');
  const basicCartfileResolved = fixture('basic/Cartfile.resolved');
  const binaryCartfile = fixture('binary/Cartfile');
  const duplicates = fixture('duplicates/Cartfile');
  const privateDuplicates = fixture('private-duplicates/Cartfile');

  it('should be able to a simple parse cartfile', () => {
    const tree = parseInput(basicCartfile);
    expect(tree).toBeDefined();
    expect(tree.length).toBe(11);
    const expectedTokens = [
      ['github', 'ReactiveCocoa/ReactiveCocoa', '>=', '2.3.1'],
      ['github', 'Mantle/Mantle', '~>', '1.0'],
      ['github', 'jspahrsummers/libextobjc', '==', '0.4.1'],
      ['github', 'jspahrsummers/xcconfigs'],
      ['github', 'ExampleOrg/ExamplePrj1', '>=', '3.0.2-pre'],
      ['github', 'ExampleOrg/ExamplePrj2', '==', '3.0.2+build'],
      ['github', 'ExampleOrg/ExamplePrj3', '==', '3.0.2'],
      ['github', 'ExampleOrg/ExamplePrj4', 'release#2'],
      ['github', 'danielgindi/ios-charts.git'], // TODO: Ok that we stripped the .git suffix (?)
      ['github', 'https://enterprise.local/ghe/desktop/git-error-translations'],
      [
        'git',
        'https://enterprise.local/desktop/git-error-translations2.git',
        'development',
      ],
    ];

    for (let i = 0; i < expectedTokens.length; i++) {
      const [expectedType, expectedName, expectedOperator, expectedVersion] =
        expectedTokens[i];
      const [actualType, actualName, actualOperator, actualVersion] =
        tree[i].tokens;

      expect(expectedType).toEqual(actualType);
      expect(expectedName).toEqual(actualName);
      expect(expectedOperator).toEqual(actualOperator);
      expect(expectedVersion).toEqual(actualVersion);
    }
  });

  it('should be able to parse a simple Cartfile.resolved file', () => {
    const tree = parseInput(basicCartfileResolved);
    expect(tree).toBeDefined();
    expect(tree.length).toBe(8);
    // resolved files won't contain any version ranges or wildcards
    for (const line of tree) {
      expect(['github-entry', 'git-entry']).toContain(line.kind);
      expect(['git-ref', 'semver']).toContain(line.version.kind);
    }

    const actualSources = tree.map((line) => line.source.value);
    const expectedSources = [
      'https://enterprise.local/ghe/desktop/git-error-translations',
      'https://enterprise.local/desktop/git-error-translations2.git',
      'danielgindi/ios-charts',
      'jspahrsummers/libextobjc',
      'Mantle/Mantle',
      'jspahrsummers/objc-build-scripts',
      'ReactiveCocoa/ReactiveCocoa',
      'jspahrsummers/xcconfigs',
    ];

    expect(actualSources.length).toBe(expectedSources.length);
    for (const expectedSource of expectedSources) {
      expect(actualSources).toContain(expectedSource);
    }
  });

  it.skip('TODO: should be able to parse a binary only cartfile', () => {
    const tree = parseInput(binaryCartfile);
    expect(tree).toBeDefined();
  });

  it.skip('TODO: should be able to parse a cartfile with duplicates', () => {
    const tree = parseInput(duplicates);
    expect(tree).toBeDefined();
  });

  // TODO: This will not currently work as we are only considering the Cartfile content.
  it.skip('TODO: should be able to parse a cartfile with private duplicates', () => {
    const tree = parseInput(privateDuplicates);
    expect(tree).toBeDefined();
  });
});
