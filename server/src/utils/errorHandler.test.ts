import { describe, it, expect } from 'vitest';
import { E_TIMEOUT } from 'async-mutex';

import { DatabaseBusyError, isDatabaseBusyError } from './errorHandler';

describe('isDatabaseBusyError', () => {
  it('returns true for DatabaseBusyError', () => {
    expect(isDatabaseBusyError(new DatabaseBusyError())).toBe(true);
  });

  it('returns true for async-mutex E_TIMEOUT singleton', () => {
    expect(isDatabaseBusyError(E_TIMEOUT)).toBe(true);
  });

  it('returns true for Sequelize TimeoutError (name-based)', () => {
    const error = new Error('database is locked');

    error.name = 'TimeoutError';
    expect(isDatabaseBusyError(error)).toBe(true);
  });

  it('returns true for "database is locked" message', () => {
    expect(isDatabaseBusyError(new Error('database is locked'))).toBe(true);
  });

  it('returns true for error with cause.code SQLITE_BUSY', () => {
    const error = new Error('something failed');

    (error as Error & { cause: { code: string } }).cause = { code: 'SQLITE_BUSY' };
    expect(isDatabaseBusyError(error)).toBe(true);
  });

  it('returns true for error with cause.code SQLITE_LOCKED', () => {
    const error = new Error('something failed');

    (error as Error & { cause: { code: string } }).cause = { code: 'SQLITE_LOCKED' };
    expect(isDatabaseBusyError(error)).toBe(true);
  });

  it('returns false for generic Error("timeout")', () => {
    expect(isDatabaseBusyError(new Error('timeout'))).toBe(false);
  });

  it('returns false for network timeout error', () => {
    expect(isDatabaseBusyError(new Error('request timeout after 5000ms'))).toBe(false);
  });

  it('returns false for unrelated errors', () => {
    expect(isDatabaseBusyError(new Error('file not found'))).toBe(false);
    expect(isDatabaseBusyError(new TypeError('cannot read property'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isDatabaseBusyError(null)).toBe(false);
    expect(isDatabaseBusyError(undefined)).toBe(false);
    expect(isDatabaseBusyError('string error')).toBe(false);
    expect(isDatabaseBusyError(42)).toBe(false);
  });
});
