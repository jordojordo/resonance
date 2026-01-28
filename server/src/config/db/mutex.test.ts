import {
  describe, it, expect, vi, beforeEach
} from 'vitest';
import { E_TIMEOUT } from 'async-mutex';
import { dbWriteMutex, withDbWrite, DB_WRITE_TIMEOUT_MS } from './mutex';

describe('Database Mutex', () => {
  beforeEach(() => {
    // Reset mutex state between tests by waiting for any pending operations
    vi.useFakeTimers();
  });

  describe('withDbWrite', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('should execute operation and return result', async() => {
      const result = await withDbWrite(async() => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should serialize concurrent operations', async() => {
      const executionOrder: number[] = [];
      const startTimes: number[] = [];

      // Start two operations concurrently
      const op1 = withDbWrite(async() => {
        startTimes.push(Date.now());
        executionOrder.push(1);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(2);

        return 'op1';
      });

      const op2 = withDbWrite(async() => {
        startTimes.push(Date.now());
        executionOrder.push(3);

        return 'op2';
      });

      const [result1, result2] = await Promise.all([op1, op2]);

      expect(result1).toBe('op1');
      expect(result2).toBe('op2');

      // op1 should complete (1, 2) before op2 starts (3)
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should release lock on error', async() => {
      // First operation throws
      await expect(withDbWrite(async() => {
        throw new Error('test error');
      })).rejects.toThrow('test error');

      // Second operation should still work
      const result = await withDbWrite(async() => 'success');

      expect(result).toBe('success');
    });

    it('should throw E_TIMEOUT when lock cannot be acquired within timeout', async() => {
      // Hold the lock for longer than the timeout
      const release = await dbWriteMutex.acquire();

      try {
        await expect(withDbWrite(async() => 'should not run'))
          .rejects.toBe(E_TIMEOUT);
      } finally {
        release();
      }
    }, DB_WRITE_TIMEOUT_MS + 2000);
  });

  describe('constants', () => {
    it('should export mutex instance', () => {
      expect(dbWriteMutex).toBeDefined();
      expect(typeof dbWriteMutex.acquire).toBe('function');
    });

    it('should export timeout constant', () => {
      expect(DB_WRITE_TIMEOUT_MS).toBe(5000);
    });
  });
});
