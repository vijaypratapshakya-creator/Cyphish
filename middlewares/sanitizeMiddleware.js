/**
 * Security middleware for NoSQL injection prevention and string sanitization.
 * Recursively cleans request bodies, query parameters, and route parameters
 * by removing any keys starting with '$' or containing '.' (MongoDB operators).
 */

/**
 * Escapes characters with special meaning in Regular Expressions
 * to prevent ReDoS (Regular Expression Denial of Service) in MongoDB $regex queries.
 */
export const escapeRegex = (str = '') => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Recursively sanitize an object/array to remove MongoDB query selector operators ($ and .)
 */
export const sanitizePayload = (target) => {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target
      .map((item) => sanitizePayload(item))
      .filter((item) => {
        // If an item was an object that became empty because it only contained operators, filter it out
        if (item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) {
          return false;
        }
        return true;
      });
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(target)) {
    // If key starts with '$' or contains '.', strip or ignore it to prevent NoSQL operator injection
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    if (value !== null && typeof value === 'object') {
      const sanitizedVal = sanitizePayload(value);
      // If the object originally had keys but all were stripped operators (e.g. { $gt: '' }), omit the field
      if (!Array.isArray(value) && Object.keys(value).length > 0 && Object.keys(sanitizedVal).length === 0) {
        continue;
      }
      cleaned[key] = sanitizedVal;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 */
export const sanitizeMiddleware = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizePayload(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizePayload(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizePayload(req.params);
    }
    next();
  } catch (error) {
    console.error('Sanitization middleware error:', error);
    next();
  }
};

export default sanitizeMiddleware;
