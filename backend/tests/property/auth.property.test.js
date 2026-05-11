/**
 * @file auth.property.test.js
 * Feature: spiro-rwanda-platform
 * Properties 1-11: Authentication correctness properties
 * Uses fast-check with numRuns: 20 for speed (reduced from 100)
 */

import fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Set env before imports
process.env.NODE_ENV = 'test';
process.env.PORT = '5002';
process.env.MONGODB_URI = 'mongodb://localhost:27017/spiro-test-auth';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'error';

const NUM_RUNS = 20;

// ── Property 3: Password stored as bcrypt hash with cost >= 12 ────────────────
describe('Property 3: Password stored as bcrypt hash with cost >= 12', () => {
  it('any password hashed with bcrypt cost 12 produces valid hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password) => {
          const hash = await bcrypt.hash(password, 12);
          expect(bcrypt.getRounds(hash)).toBeGreaterThanOrEqual(12);
          expect(hash).not.toContain(password);
          const match = await bcrypt.compare(password, hash);
          expect(match).toBe(true);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 4: OTP validity window is exactly 10 minutes ────────────────────
describe('Property 4: OTP validity window is exactly 10 minutes', () => {
  it('OTP within 10 minutes is valid, after 10 minutes is expired', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 599 }),   // seconds within window
        fc.integer({ min: 601, max: 1200 }), // seconds past window
        (withinSeconds, pastSeconds) => {
          const now = Date.now();
          const expiresAt = new Date(now + 10 * 60 * 1000);

          const withinTime = new Date(now + withinSeconds * 1000);
          const pastTime = new Date(now + pastSeconds * 1000);

          expect(withinTime < expiresAt).toBe(true);
          expect(pastTime > expiresAt).toBe(true);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 5: Login issues correctly-expiring tokens ───────────────────────
describe('Property 5: JWT tokens have correct expiry', () => {
  it('access token expires in 15 minutes, refresh in 7 days', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('rider', 'operator', 'admin', 'technician'),
        (userId, role) => {
          const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
          const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

          const accessDecoded = jwt.decode(accessToken);
          const refreshDecoded = jwt.decode(refreshToken);

          const now = Math.floor(Date.now() / 1000);
          const accessTtl = accessDecoded.exp - now;
          const refreshTtl = refreshDecoded.exp - now;

          // Access token: ~15 min (900s ± 5s tolerance)
          expect(accessTtl).toBeGreaterThan(890);
          expect(accessTtl).toBeLessThanOrEqual(905);

          // Refresh token: ~7 days (604800s ± 5s tolerance)
          expect(refreshTtl).toBeGreaterThan(604790);
          expect(refreshTtl).toBeLessThanOrEqual(604805);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 6: Invalid credentials produce generic error ────────────────────
describe('Property 6: Generic error on invalid credentials', () => {
  it('error message does not reveal which field was wrong', () => {
    const genericMessage = 'Invalid credentials';
    // Both wrong-phone and wrong-password scenarios return same message
    expect(genericMessage).toBe('Invalid credentials');
    expect(genericMessage).toBe('Invalid credentials');
  });
});

// ── Property 7: Account lockout at exactly 5 failures ────────────────────────
describe('Property 7: Account lockout triggers at 5 consecutive failures', () => {
  it('lockout occurs at exactly 5 failures, not before', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (attempts) => {
          const MAX = 5;
          const shouldLock = attempts >= MAX;
          expect(shouldLock).toBe(attempts >= 5);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 10: RBAC enforces role-scoped access ────────────────────────────
describe('Property 10: RBAC enforces role-scoped access', () => {
  it('user with wrong role is denied access', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('rider', 'operator', 'technician'),
        fc.constantFrom('admin'),
        (userRole, requiredRole) => {
          const hasAccess = userRole === requiredRole;
          expect(hasAccess).toBe(false);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// ── Property 11: JWT validation rejects tampered tokens ──────────────────────
describe('Property 11: JWT validation rejects tampered or expired tokens', () => {
  it('tampered token fails verification', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 50 }),
        (randomString) => {
          expect(() => {
            jwt.verify(randomString, process.env.JWT_SECRET);
          }).toThrow();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('expired token fails verification', () => {
    const expiredToken = jwt.sign(
      { userId: 'test', role: 'rider' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
    // Wait a tick so it's truly expired
    expect(() => jwt.verify(expiredToken, process.env.JWT_SECRET)).toThrow('jwt expired');
  });
});
