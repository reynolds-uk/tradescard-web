import next from "eslint-config-next";
import tseslint from "typescript-eslint";

export default [
  ...next(["core-web-vitals"]),
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];