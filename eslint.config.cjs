const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const universe = require('eslint-config-universe/flat/native');
const universeWeb = require('eslint-config-universe/flat/web');

const components = fs
  .readdirSync(path.join(__dirname, 'src/components'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// The source is layered: theme <- core <- components. Imports only point down, and
// components never import each other, so shared code goes in core or theme.
const boundaries = {
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/theme',
            from: ['./src/core', './src/components'],
            message: 'theme is the bottom layer and imports nothing from core or components.',
          },
          {
            target: './src/core',
            from: './src/components',
            message: 'core is shared by components and must not import from them.',
          },
          ...components.map((name) => ({
            target: `./src/components/${name}`,
            from: './src/components',
            except: [`./${name}`],
            message: 'Components stay independent. Move shared code to core or theme.',
          })),
        ],
      },
    ],
  },
};

module.exports = defineConfig([{ ignores: ['build'] }, ...universe, ...universeWeb, boundaries]);
