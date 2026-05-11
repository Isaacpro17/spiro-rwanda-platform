/**
 * @file health.smoke.test.js
 * @description Smoke test for the health check endpoint.
 * Verifies GET /api/v1/health returns HTTP 200 within 500ms.
 * Requirement 15.5: Health check endpoints must return HTTP 200 within 500ms.
 */

import express from 'express';
import request from 'supertest';
import healthRouter from '../src/routes/health.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// Set env vars before any module that reads them
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/spiro-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'error';

/**
 * Creates a minimal Express app with only the health route.
 * Avoids needing live Redis/MongoDB connections for the smoke test.
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/health', healthRouter);
  app.use((req, res) => {
    res.status(404).json({ success: false, data: {}, message: 'Not found', error: 'NOT_FOUND_ERROR' });
  });
  app.use(errorHandler);
  return app;
}

describe('Health Check Endpoint — GET /api/v1/health', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return HTTP 200', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
  });

  it('should respond within 500ms (Requirement 15.5)', async () => {
    const start = Date.now();
    await request(app).get('/api/v1/health');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should return standard response format { success, data, message, error }', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('error');
  });

  it('should include mongodb, redis, status, and uptime in data', async () => {
    const response = await request(app).get('/api/v1/health');
    const { data } = response.body;
    expect(data).toHaveProperty('mongodb');
    expect(data).toHaveProperty('redis');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('timestamp');
  });

  it('should return a valid status value', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(['ok', 'degraded']).toContain(response.body.data.status);
  });

  it('should return a valid mongodb status value', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(['connected', 'disconnected', 'connecting', 'disconnecting']).toContain(
      response.body.data.mongodb
    );
  });

  it('should return a valid redis status value', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(['connected', 'disconnected']).toContain(response.body.data.redis);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/unknown-route');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return uptime as a non-negative number', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
  });
});
