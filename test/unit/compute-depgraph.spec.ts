import {computeDepGraph} from '../../lib/compute-depgraph';
import {execute} from '../../lib/subprocess';
import {dependencies} from '../fixtures/dependencies';
import * as path from "path";
import * as fs from "fs";


jest.setTimeout(100000);
jest.mock('../../lib/subprocess');
jest.mock('fs');

const mockedExecute = jest.mocked(execute);
mockedExecute.mockResolvedValue(JSON.stringify(dependencies));
const SWIFT_DEFAULT_PARAMETERS_COUNT = 6;

describe('compute-depgraph', () => {
    beforeEach(() => {
        mockedExecute.mockClear();
    });
    it('should successfully create snyk dep graph from swift-pm dep tree', async () => {

        const targetFile = path.join(__dirname, '../fixtures/Package.swift');
        const result = await computeDepGraph(path.join(__dirname, '../fixtures'), targetFile);

        expect(result).toMatchSnapshot();
    });

    it('should add additional parameters (one) to swiftpm cli', async () => {
        const additionalArguments = ["firstParam"];

        const targetFile = path.join(__dirname, '../fixtures/Package.swift');
        await computeDepGraph(path.join(__dirname, '../fixtures'), targetFile, additionalArguments);

        let swiftArguments: string[] = mockedExecute.mock.calls[0][1];
        expect(swiftArguments[1]).toEqual(additionalArguments[0])
    })

    it('should add additional parameters (many) to swiftpm cli', async () => {
        const additionalArguments = ["firstParam", "secondParam", "thirdParam"];

        const targetFile = path.join(__dirname, '../fixtures/Package.swift');
        await computeDepGraph(path.join(__dirname, '../fixtures'), targetFile, additionalArguments);

        let swiftArguments: string[] = mockedExecute.mock.calls[0][1];
        expect(mockedExecute).toHaveBeenCalledWith('swift', [
          "package",
          "firstParam",
          "secondParam",
          "thirdParam",
          "--package-path",
          expect.any(String),
          "show-dependencies",
          "--format",
          "json",
        ], {cwd: expect.any(String)})
    })

    it('should add additional parameters (none) to swiftpm cli', async () => {
        const additionalArguments = undefined;

        const targetFile = path.join(__dirname, '../fixtures/Package.swift');
        await computeDepGraph(path.join(__dirname, '../fixtures'), targetFile, additionalArguments);

        let swiftArguments = mockedExecute.mock.calls[0][1];
        expect(swiftArguments.length).toEqual(SWIFT_DEFAULT_PARAMETERS_COUNT);
    })

    describe('Generated files logic', () => {

      beforeEach(() => {
        jest.clearAllMocks();
      })
    
      it('should delete the .build folder or Package.resolved if it they do not exist already', async () => {
    
        const mockedFs = jest.mocked(fs, true);
        mockedFs.statSync.mockImplementationOnce(() => {throw new Error('Test Error')});
        mockedFs.statSync.mockImplementationOnce(() => {throw new Error('Test Error')});
    
        await computeDepGraph('.', 'Package.swift')
        expect(mockedFs.rmSync).toHaveBeenCalledWith('.build', {recursive: true});
        expect(mockedFs.rmSync).toHaveBeenCalledWith('Package.resolved', {recursive: true});
    
      })
    
      it('should not delete the .build folder or Package.resolved if it they already exist', async () => {
    
        const mockedFs = jest.mocked(fs, true);
    
        await computeDepGraph('.', 'Package.swift')
        expect(mockedFs.rmSync).not.toHaveBeenCalled();
    
      })
    
    
    })
});
