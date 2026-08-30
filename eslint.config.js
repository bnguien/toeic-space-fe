import js from "@eslint/js";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "public/**",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.{ts,tsx}"],

    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
    },

    plugins: {
      boundaries,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    settings: {
      "boundaries/elements": [
        {
          type: "app",
          pattern: "src/app/**",
        },

        {
          type: "module",
          pattern: "src/modules/*/**",
          capture: ["module"],
        },

        {
          type: "shared",
          pattern: "src/shared/**",
        },

        {
          type: "service",
          pattern: "src/services/**",
        },

        {
          type: "config",
          pattern: "src/config/**",
        },
      ],
    },

    rules: {
      ...reactHooks.configs.recommended.rules,

      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],

      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*", "@/modules/*/**"],
              message:
                'Do not import module internals. Import through "@/modules/<module>" instead.',
            },
          ],
        },
      ],

      "boundaries/dependencies": [
        "error",
        {
          default: "allow",

          policies: [
            {
              from: {
                element: {
                  type: "shared",
                },
              },

              disallow: [
                {
                  to: {
                    element: {
                      type: "module",
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "app",
                    },
                  },
                },
              ],
            },

            {
              from: {
                element: {
                  type: "service",
                },
              },

              disallow: [
                {
                  to: {
                    element: {
                      type: "module",
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "app",
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "shared",
                    },
                  },
                },
              ],
            },

            {
              from: {
                element: {
                  type: "config",
                },
              },

              disallow: [
                {
                  to: {
                    element: {
                      type: "app",
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "module",
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "shared",
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "service",
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      "vite.config.ts",
      "eslint.config.ts",
      "*.config.ts",
      "*.config.js",
    ],

    languageOptions: {
      globals: globals.node,
    },
  },

  prettier,
);