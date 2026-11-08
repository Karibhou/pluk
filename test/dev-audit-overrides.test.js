// @stryker-mutator/core pins minimatch ~10.2.x and typed-rest-client 2.3.1
// hard-pins qs 6.15.1; both carry published advisories (GHSA-g3hv-75wg-m249,
// GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx) whose fixes neither `npm audit fix`
// nor Dependabot can reach. package.json overrides them inside the Stryker
// subtree only; this pins the overrides and the resolved lockfile versions so
// a later grouped dependency bump cannot silently drop them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (rel) => JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

function atLeast(actual, minimum) {
  const a = actual.split('.').map(Number);
  const m = minimum.split('.').map(Number);
  for (let i = 0; i < m.length; i++) {
    if (a[i] !== m[i]) return a[i] > m[i];
  }
  return true;
}

test('stryker subtree overrides keep minimatch and qs on patched releases', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const stryker = pkg.overrides?.['@stryker-mutator/core'] ?? {};
  assert.equal(stryker.minimatch, '^11.0.1', 'override @stryker-mutator/core > minimatch to ^11.0.1');
  assert.equal(stryker['typed-rest-client']?.qs, '^6.17.1', 'override @stryker-mutator/core > typed-rest-client > qs to ^6.17.1');
  assert.ok(atLeast(lock.packages['node_modules/minimatch'].version, '11.0.1'), 'lockfile must resolve minimatch >= 11.0.1');
  assert.ok(atLeast(lock.packages['node_modules/qs'].version, '6.17.1'), 'lockfile must resolve qs >= 6.17.1');
});
