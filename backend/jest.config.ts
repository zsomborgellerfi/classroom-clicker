import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  clearMocks: true,
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../shared/$1",
  },
  setupFiles: ["<rootDir>/src/test/setup.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
};

export default config;
