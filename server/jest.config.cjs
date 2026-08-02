/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  testTimeout: 30000,  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/__tests__/**",
    "!src/index.ts",
    "!src/config/**",
    "!src/types/**",
    "!src/schemas/**"
  ],
  coverageThreshold: {
    global: { lines: 80 }
  },  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
  }
};
