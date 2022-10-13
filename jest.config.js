module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts)?$': 'ts-jest',
  },
  testMatch: ['**/*.spec.ts'],
  collectCoverage: false,
  moduleFileExtensions: ['ts', 'js', 'json'],
  forceExit: true,
};
