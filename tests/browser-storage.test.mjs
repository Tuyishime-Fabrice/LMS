import test from 'node:test';
import assert from 'node:assert/strict';
import { authStorage, readBrowserStorage, writeBrowserStorage, removeBrowserStorage } from '../src/lib/browserStorage.ts';

test('blocked storage keeps an in-memory auth session and verification context', () => {
  globalThis.window = {};
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError'); } });
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
  authStorage.setItem('test-session', 'fixture-session');
  assert.equal(authStorage.getItem('test-session'), 'fixture-session');
  writeBrowserStorage('session', 'pendingVerificationEmail', 'fixture@example.invalid');
  assert.equal(readBrowserStorage('session', 'pendingVerificationEmail'), 'fixture@example.invalid');
  removeBrowserStorage('session', 'pendingVerificationEmail');
  assert.equal(readBrowserStorage('session', 'pendingVerificationEmail'), null);
  authStorage.removeItem('test-session');
  assert.equal(authStorage.getItem('test-session'), null);
});
