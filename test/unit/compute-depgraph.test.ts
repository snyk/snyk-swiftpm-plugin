import { computeDepGraph } from '../../lib/compute-depgraph';
import { execute } from '../../lib/subprocess';
import { dependencies } from '../fixtures/dependencies';

jest.setTimeout(100000);
jest.mock('../../lib/subprocess');

describe('compute-depgraph', () => {
  it('should successfully create snyk dep graph from swift-pm dep tree', async () => {
    const mockedExecute = jest.mocked(execute);
    mockedExecute.mockResolvedValueOnce(JSON.stringify(dependencies));
    const result = await computeDepGraph(`${__dirname}/../fixtures/`);
    expect(result).toMatchSnapshot();
  });
});
