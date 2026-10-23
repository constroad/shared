/** Pure payroll: Jest with ts-jest, no DOM nor network. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  clearMocks: true,
};
