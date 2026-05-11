/**
 * @file auth.js
 * @description JWT authentication middleware. Verifies Bearer token on every protected route.
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError } from './errorHandler.js';

/**
 * Verifies JWT access token and attaches req.user = { userId, role }.
 * @type {import('express').RequestHandler}
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthError('No token provided'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    next(new AuthError(err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token'));
  }
}
