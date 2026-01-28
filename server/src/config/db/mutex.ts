import { Mutex, withTimeout } from 'async-mutex';

/**
 * Mutex for serializing database write operations.
 *
 * SQLite allows concurrent reads but only one writer at a time.
 * This mutex prevents SQLITE_BUSY errors from concurrent writes.
 */
export const dbWriteMutex = new Mutex();

/**
 * Timeout for acquiring the write mutex (in milliseconds).
 * If a write operation cannot acquire the lock within this time, it will fail.
 */
export const DB_WRITE_TIMEOUT_MS = 5000;

/**
 * Execute a database write operation with mutex protection.
 *
 * Ensures only one write operation runs at a time, preventing
 * SQLITE_BUSY errors from concurrent writes.
 *
 * @param operation - Async function performing the write operation
 * @returns Result of the operation
 * @throws TimeoutError if mutex cannot be acquired within timeout
 */
export async function withDbWrite<T>(operation: () => Promise<T>): Promise<T> {
  const mutex = withTimeout(dbWriteMutex, DB_WRITE_TIMEOUT_MS);
  const release = await mutex.acquire();

  try {
    return await operation();
  } finally {
    release();
  }
}
