import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FlatCompat lets us load the still-legacy `eslint-config-next` shareable
// configs from the new flat-config format until upstream ships native flat
// configs.
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals"),
  prettier,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
