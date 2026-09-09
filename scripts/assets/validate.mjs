#!/usr/bin/env node
import {
  createSeedRegistry,
  readRegistry,
  validateRegistry,
  writeRegistry,
} from './registry-lib.mjs';

function main() {
  let registry = readRegistry();
  if (!registry) {
    console.warn('[assets:validate] No registry file; generating seed.');
    registry = createSeedRegistry();
    writeRegistry(registry);
  }

  const { ok, errors } = validateRegistry(registry);
  if (!ok) {
    console.error(`[assets:validate] ${errors.length} issue(s):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[assets:validate] OK — ${registry.entries.length} entries, no issues`,
  );
}

main();
