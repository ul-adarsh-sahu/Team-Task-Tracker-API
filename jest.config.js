module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.model.js",
  ],
  testMatch: ["**/tests/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  verbose: true,
  forceExit: true,
};
