module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/convex/_generated/"],
  collectCoverageFrom: [
    "convex/**/*.ts",
    "lib/**/*.ts",
    "hooks/**/*.ts",
    "!convex/_generated/**",
    "!**/*.d.ts",
  ],
};
