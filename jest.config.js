/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.ts"],
  moduleNameMapper: {
    "^vscode$": "<rootDir>/tests/__mocks__/vscode.ts"
  },
  verbose: true,
  forceExit: true,
  clearMocks: true
};
