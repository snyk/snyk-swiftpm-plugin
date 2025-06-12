const constraints = {
  '>=': { kind: 'atleast', value: '>=', equivalent: '>=' },
  '~>': { kind: 'compat', value: '~>', equivalent: '~' },
  '==': { kind: 'exact', value: '==', equivalent: '=' },
} as const;

export type Constraint = (typeof constraints)[keyof typeof constraints];

export const rangeType = (op: string): Constraint => {
  const ret = constraints[op as keyof typeof constraints];
  if (!ret) throw new Error(`unknown constraint ${op}`);
  return ret;
};

export type NoVersion = { kind: 'any'; value: '*' };
export const noVersion = (): NoVersion => ({ kind: 'any', value: '*' });

export type SemVer = { kind: 'semver'; value: string };
export const semanticVersion = (s: string): SemVer => ({
  kind: 'semver',
  value: s,
});

export type GitRef = { kind: 'git-ref'; value: string };
export const gitRef = (s: string): GitRef => ({ kind: 'git-ref', value: s });

export type VersionRange = {
  kind: 'version-range';
  operator: Constraint;
  value: SemVer;
};

export type File = { kind: 'file'; value: string };
export const fileType = (s: string): File => ({ kind: 'file', value: s });

export type RemoteURL = { kind: 'url'; value: string };
export const urlType = (s: string): RemoteURL => ({ kind: 'url', value: s });

export type Repository = { kind: 'repo'; value: string };
export const repoType = (s: string): Repository => ({ kind: 'repo', value: s });

export type GitEntry = {
  kind: 'git-entry';
  source: File | RemoteURL;
  version: NoVersion | GitRef | SemVer | VersionRange;
  tokens: string[];
};

export type GithubEntry = {
  kind: 'github-entry';
  source: Repository | RemoteURL;
  version: NoVersion | GitRef | SemVer | VersionRange;
  tokens: string[];
};

export type BinaryEntry = {
  kind: 'binary-entry';
  source: File | RemoteURL;
  version: NoVersion | SemVer | VersionRange;
  tokens: string[];
};

export type CartfileEntry = GitEntry | GithubEntry | BinaryEntry;
export type Cartfile = CartfileEntry[];
