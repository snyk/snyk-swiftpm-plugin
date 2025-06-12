import * as path from 'path';
import * as semver from 'semver';
import {
  BinaryEntry,
  Cartfile,
  CartfileEntry,
  File,
  GitEntry,
  GithubEntry,
  NoVersion,
  RemoteURL,
  Repository,
  VersionRange,
  GitRef,
  SemVer,
  urlType,
  fileType,
  repoType,
  gitRef,
  semanticVersion,
  rangeType,
  noVersion,
} from './types';

const stripLineComments = (line: string): string => {
  let quoted = false;
  let endquote = '';
  for (let idx = 0; idx < line.length; ++idx) {
    const c = line[idx];
    if ((c === '"' || c === "'") && (idx == 0 || line[idx - 1] != '\\')) {
      if (!quoted) {
        quoted = true;
        endquote = c;
      } else if (c == endquote) {
        quoted = false;
      }
    }
    if (c === '#' && !quoted) return line.substring(0, idx).trim();
  }
  return line.trim();
};

const partitionLine = (line: string): string[] => {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
  while ((match = regex.exec(line)) !== null) {
    tokens.push(match[0].trim().replace(/^["']|["']$/g, ''));
  }
  return tokens;
};

const tokenizer = (input: string): string[][] =>
  input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => stripLineComments(line))
    .map((line) => partitionLine(line))
    .filter((line) => line.length > 0);

type MaybeParse<T> = (tokens: string[]) => T | undefined;

const maybeRemoteURL: MaybeParse<RemoteURL> = ([, value]: string[]):
  | RemoteURL
  | undefined => {
  const prefixes = ['http://', 'https://', 'ssh://', 'git://', 'git@'];
  if (prefixes.some((x) => value.startsWith(x))) {
    return urlType(value);
  }
};

const maybeFile: MaybeParse<File> = ([, source]: string[]):
  | File
  | undefined => {
  if (source.startsWith('file://')) return fileType(source);
  const value = path.resolve(source);
  if (path.isAbsolute(value)) return fileType(value);
};

const maybeRepo: MaybeParse<Repository> = ([origin, source]: string[]):
  | Repository
  | undefined => {
  const repository = source.replace(/\.git$/, '');
  // eslint-disable-next-line
  if (origin === 'github' && /^[\w\._-]+\/[\w\._-]+$/.test(repository)) {
    return repoType(repository);
  }
};
const maybeEmptyVersion: MaybeParse<NoVersion> = ([
  origin,
  ,
  ...value
]: string[]): NoVersion | undefined => {
  if (!value?.length && origin !== 'binary') {
    return noVersion();
  }
};

const maybeVerSpec: MaybeParse<VersionRange> = ([, , ...spec]: string[]):
  | VersionRange
  | undefined => {
  const [op, value] = spec;

  if (!op || !value) return undefined;
  if (!['>=', '~>', '=='].includes(op)) return undefined;
  const versionRange = rangeType(op);
  const semanticRange = `${versionRange.equivalent}${value}`;
  if (!semver.valid(value) && !semver.validRange(semanticRange))
    return undefined;
  return {
    kind: 'version-range',
    operator: versionRange,
    value: semanticVersion(value),
  } as VersionRange;
};

const maybeSemVer: MaybeParse<SemVer> = ([, , ...value]: string[]):
  | SemVer
  | undefined => {
  if (!value) return undefined;
  if (value?.length == 1 && semver.valid(value[0])) {
    return semanticVersion(value[0]);
  }
};
const maybeGitRef: MaybeParse<GitRef> = ([, , ...value]: string[]):
  | GitRef
  | undefined => {
  if (!value) return undefined;
  const [ver] = value;
  if (value.length == 1 && !semver.valid(ver)) {
    return gitRef(ver);
  }
};

const gitEntry: MaybeParse<GitEntry> = (
  tokens: string[],
): GitEntry | undefined => {
  if (tokens.length > 0 && tokens[0] !== 'git') return undefined;
  const source = maybeRemoteURL(tokens) ?? maybeFile(tokens);
  if (!source) throw new Error(`not a valid entry ${tokens.join(' ')}`);

  const version =
    maybeEmptyVersion(tokens) ??
    maybeSemVer(tokens) ??
    maybeGitRef(tokens) ??
    maybeVerSpec(tokens);

  if (!version) throw new Error(`not a valid version ${version} for ${source}`);
  return {
    kind: 'git-entry',
    source,
    version,
    tokens,
  };
};

const githubEntry: MaybeParse<GithubEntry> = (
  tokens: string[],
): GithubEntry | undefined => {
  if (tokens.length > 0 && tokens[0] !== 'github') return undefined;

  const source = maybeRemoteURL(tokens) ?? maybeRepo(tokens);
  if (!source) throw new Error(`not a valid entry ${tokens.join(' ')}}`);
  const version =
    maybeVerSpec(tokens) ??
    maybeSemVer(tokens) ??
    maybeGitRef(tokens) ??
    maybeEmptyVersion(tokens);

  if (!version) throw new Error(`not a valid version ${version} for ${source}`);
  return { kind: 'github-entry', source, version, tokens };
};

const binaryEntry = (tokens: string[]): BinaryEntry | undefined => {
  if (tokens.length > 0 && tokens[0] !== 'binary') return undefined;

  const source = maybeRemoteURL(tokens) ?? maybeFile(tokens);
  if (!source) throw new Error(`not a valid entry ${tokens.join(' ')}`);

  const version = maybeSemVer(tokens) ?? maybeVerSpec(tokens);
  if (!version) throw new Error(`not a valid version ${version} for ${source}`);
  return { kind: 'binary-entry', source, version, tokens };
};

const parseLine = (tokens: string[]): CartfileEntry => {
  const line = githubEntry(tokens) ?? gitEntry(tokens) ?? binaryEntry(tokens);
  if (!line) throw new Error(`not a valid entry ${tokens.join(' ')}`);
  return line;
};

export const parseInput = (input: string): Cartfile =>
  tokenizer(input).map(parseLine);
