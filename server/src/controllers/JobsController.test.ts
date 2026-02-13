import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import request from 'supertest';

const mockGetConfig = vi.hoisted(() => vi.fn().mockReturnValue({
  ui:                { auth: { enabled: false, type: 'basic' } },
  slskd:             {},
  library_organize:  {},
  catalog_discovery: {},
}));

vi.mock('@server/config/settings', async(importOriginal) => {
  const actual = await importOriginal<typeof import('@server/config/settings')>();

  return { ...actual, getConfig: mockGetConfig };
});

vi.mock('@server/config/jobs', () => ({
  JOB_INTERVALS:  {},
  RUN_ON_STARTUP: false,
  secondsToCron:  vi.fn(),
}));

const mockGetJobStatus = vi.hoisted(() => vi.fn());
const mockTriggerJob = vi.hoisted(() => vi.fn());
const mockCancelJob = vi.hoisted(() => vi.fn());

vi.mock('@server/plugins/jobs', () => ({
  getJobStatus:   mockGetJobStatus,
  triggerJob:     mockTriggerJob,
  cancelJob:      mockCancelJob,
  startJobs:      vi.fn(),
  stopJobs:       vi.fn(),
  isJobCancelled: vi.fn(),
}));

import app from '@server/plugins/app';
import { AUTH_HEADER, AUTH_CONFIG } from '@server/tests/helpers/auth';

describe('JobsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(AUTH_CONFIG as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Auth', () => {
    it('returns 401 without auth header on a protected endpoint', async() => {
      const response = await request(app).get('/api/v1/jobs/status');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: true,
        code:  'unauthorized',
      });
    });
  });

  describe('GET /api/v1/jobs/status', () => {
    it('returns job status array', async() => {
      const jobs = [
        {
          name:    'listenbrainz-fetch',
          cron:    '0 */6 * * *',
          running: false,
          lastRun: null,
          nextRun: '2025-01-01T06:00:00.000Z',
        },
      ];

      mockGetJobStatus.mockReturnValue(jobs);

      const response = await request(app)
        .get('/api/v1/jobs/status')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ jobs });
      expect(mockGetJobStatus).toHaveBeenCalled();
    });

    it('returns 500 on error', async() => {
      mockGetJobStatus.mockImplementation(() => {
        throw new Error('Job status failure');
      });

      const response = await request(app)
        .get('/api/v1/jobs/status')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error:   true,
        code:    'internal_error',
        message: 'Failed to fetch job status',
      });
    });
  });

  describe('POST /api/v1/jobs/:jobName/trigger', () => {
    it('triggers a job successfully', async() => {
      mockTriggerJob.mockReturnValue(true);

      const response = await request(app)
        .post('/api/v1/jobs/listenbrainz-fetch/trigger')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Job 'listenbrainz-fetch' triggered successfully",
        jobName: 'listenbrainz-fetch',
      });
      expect(mockTriggerJob).toHaveBeenCalledWith('listenbrainz-fetch');
    });

    it('returns 409 when job is already running', async() => {
      mockTriggerJob.mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/jobs/listenbrainz-fetch/trigger')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: "Job 'listenbrainz-fetch' is already running",
        jobName: 'listenbrainz-fetch',
      });
    });

    it('returns 404 when job is not found', async() => {
      mockTriggerJob.mockReturnValue(null);

      const response = await request(app)
        .post('/api/v1/jobs/nonexistent-job/trigger')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error:   true,
        code:    'not_found',
        message: "Job 'nonexistent-job' not found",
      });
    });
  });

  describe('POST /api/v1/jobs/:jobName/cancel', () => {
    it('cancels a running job successfully', async() => {
      mockCancelJob.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/jobs/listenbrainz-fetch/cancel')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Job 'listenbrainz-fetch' cancelled successfully",
        jobName: 'listenbrainz-fetch',
      });
      expect(mockCancelJob).toHaveBeenCalledWith('listenbrainz-fetch');
    });

    it('returns 409 when job is not running', async() => {
      mockCancelJob.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/jobs/listenbrainz-fetch/cancel')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: "Job 'listenbrainz-fetch' is not running",
        jobName: 'listenbrainz-fetch',
      });
    });

    it('returns 404 when job is not found', async() => {
      mockCancelJob.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/jobs/nonexistent-job/cancel')
        .set('Authorization', AUTH_HEADER);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error:   true,
        code:    'not_found',
        message: "Job 'nonexistent-job' not found",
      });
    });
  });
});
