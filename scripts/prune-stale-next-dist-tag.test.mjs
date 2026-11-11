import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparePrecedence, decidePrune } from './prune-stale-next-dist-tag.mjs';

test('comparePrecedence follows semver §11', () => {
  assert.ok(comparePrecedence('0.9.4', '0.9.5') < 0);
  assert.ok(comparePrecedence('1.0.0-next.1', '1.0.0') < 0);
  assert.ok(comparePrecedence('1.0.0-next.2', '1.0.0-next.10') < 0);
  assert.ok(comparePrecedence('1.0.0-rc.1', '1.0.0-next.1') > 0);
  assert.equal(comparePrecedence('0.9.4', '0.9.4'), 0);
});

test('drops next only when strictly behind latest', () => {
  assert.equal(decidePrune({ next: '0.3.0-next.2', latest: '0.9.4' }).action, 'drop');
  assert.equal(decidePrune({ next: '1.0.0-next.1', latest: '0.9.4' }).action, 'keep');
  assert.equal(decidePrune({ next: '0.9.4', latest: '0.9.4' }).action, 'keep');
});

test('no-op when next or latest is absent', () => {
  assert.equal(decidePrune({ latest: '0.9.4' }).action, 'noop');
  assert.equal(decidePrune({ next: '0.9.4' }).action, 'noop');
});
