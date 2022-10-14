import { inspect } from '../../lib/index';
import { lookpath } from 'lookpath';

jest.mock('../../lib/compute-depgraph');
jest.mock('lookpath');
jest.mock('fs');

describe('inspect', () => {
  it('should validate swiftpm', () => {
    const mockedLookpath = jest.mocked(lookpath);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockedLookpath.mockResolvedValue();

    expect(() =>
      inspect(`${__dirname}/../fixtures/`, 'file.ts', {}),
    ).rejects.toThrowError(
      'The "swift" command is not available on your system. To scan your dependencies in the CLI, you must ensure you have first installed the relevant package manager.',
    );
  });
});
