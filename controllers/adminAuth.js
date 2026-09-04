import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { loginLimiter } from '../middlewares/rateLimiters.js';
import { getSystemSettings } from '../services/systemSettingService.js';
import { audit } from '../services/auditService.js';

const router = express.Router();

// Dummy hash for constant-time comparison when user is not found (anti-user enumeration)
const DUMMY_HASH = '$2b$10$wT8m9aV9nJm2K9zQj4lSFeQj6ZzX8e0z3p6p6u8y0w2v4t6r8q0y2';

// Admin/user login route
router.post('/', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  // Strict type assertions to prevent NoSQL operator injection and type confusion
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: 'A valid username and password string are required',
    });
  }

  const cleanUsername = username.trim();

  try {
    const settings = await getSystemSettings().catch(() => null);
    const maxAttempts = settings?.security?.maxFailedLoginAttempts || 5;
    const lockoutMinutes = settings?.security?.accountLockoutMinutes || 15;
    const enableBruteForce = settings?.security?.enableBruteForceProtection !== false;

    const user = await User.findOne({ username: cleanUsername });

    // Anti-timing attack: if user does not exist, still perform a bcrypt comparison
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH).catch(() => {});
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Check administrative lock
    if (user.accountLocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is permanently locked by administrator. Please contact IT Security.',
      });
    }

    // Check temporary brute force lockout
    if (enableBruteForce && user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.max(1, Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / (60 * 1000)));
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // If lockout duration has elapsed, reset the counter
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      if (enableBruteForce) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        user.lastFailedLoginAt = new Date();

        if (user.failedLoginAttempts >= maxAttempts) {
          user.lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
          await user.save();

          await audit({
            req,
            action: 'USER_ACCOUNT_LOCKED',
            resourceType: 'User',
            resourceId: user._id,
            outcome: 'failure',
            details: { username: user.username, attempts: user.failedLoginAttempts, lockoutMinutes },
          }).catch(() => {});

          return res.status(403).json({
            success: false,
            message: `Account locked for ${lockoutMinutes} minutes due to ${maxAttempts} consecutive failed login attempts.`,
          });
        }

        await user.save();
        const remainingAttempts = Math.max(0, maxAttempts - user.failedLoginAttempts);

        return res.status(401).json({
          success: false,
          message: `Invalid username or password. (${remainingAttempts} attempt(s) remaining before temporary lockout)`,
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Successful login: reset failed attempts and update lastLoginAt
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    await audit({
      req,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id,
      outcome: 'success',
      details: { username: user.username, role: user.role },
    }).catch(() => {});

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      process.env.SESSION_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
});

export default router;
