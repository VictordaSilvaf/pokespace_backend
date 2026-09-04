#!/usr/bin/env node
/**
 * Ensures every feature module with domain errors has i18n catalogs
 * for en, pt-BR and es. Run via `pnpm check:i18n`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const modulesDir = join(root, 'src/modules');
const locales = ['en', 'pt-BR', 'es'];
const requiredSections = ['errors'];

function fail(message) {
  console.error(`check:i18n ✗ ${message}`);
  process.exitCode = 1;
}

function listModules() {
  return readdirSync(modulesDir).filter((name) =>
    statSync(join(modulesDir, name)).isDirectory(),
  );
}

function moduleNeedsI18n(moduleName) {
  const errorsDir = join(modulesDir, moduleName, 'domain', 'errors');
  const httpDir = join(modulesDir, moduleName, 'infrastructure', 'http');
  return existsSync(errorsDir) || existsSync(httpDir);
}

function assertCatalog(moduleName, locale) {
  const file = join(root, 'src/i18n', locale, `${moduleName}.json`);
  if (!existsSync(file)) {
    fail(`missing ${locale}/${moduleName}.json for module "${moduleName}"`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`invalid JSON in ${locale}/${moduleName}.json: ${error.message}`);
    return null;
  }
}

function assertSameKeys(moduleName, catalogs) {
  const [baseLocale, ...rest] = locales;
  const base = catalogs[baseLocale];
  if (!base) return;

  for (const section of requiredSections) {
    if (!base[section] || typeof base[section] !== 'object') {
      fail(`${baseLocale}/${moduleName}.json must define "${section}"`);
      continue;
    }
    const baseKeys = Object.keys(base[section]).sort();
    for (const locale of rest) {
      const catalog = catalogs[locale];
      if (!catalog?.[section]) {
        fail(`${locale}/${moduleName}.json missing "${section}"`);
        continue;
      }
      const keys = Object.keys(catalog[section]).sort();
      if (JSON.stringify(keys) !== JSON.stringify(baseKeys)) {
        fail(
          `${locale}/${moduleName}.json "${section}" keys differ from ${baseLocale}`,
        );
      }
    }
  }
}

const modules = listModules().filter(moduleNeedsI18n);
if (modules.length === 0) {
  console.log('check:i18n ✓ no modules requiring translation');
  process.exit(0);
}

for (const moduleName of modules) {
  const catalogs = {};
  for (const locale of locales) {
    catalogs[locale] = assertCatalog(moduleName, locale);
  }
  assertSameKeys(moduleName, catalogs);
}

// common.json is mandatory for all locales
for (const locale of locales) {
  const common = join(root, 'src/i18n', locale, 'common.json');
  if (!existsSync(common)) {
    fail(`missing ${locale}/common.json`);
  }
}

if (process.exitCode) {
  console.error(
    'Translation catalogs are mandatory for modules with domain errors or HTTP adapters.',
  );
  process.exit(process.exitCode);
}

console.log(
  `check:i18n ✓ ${modules.length} module(s) covered for ${locales.join(', ')}`,
);
