import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Prohibited keys per Strict System & Proposal Constraints:
 * - NO SMS, NO OTP, NO mobile phone number fields anywhere in the APIs.
 * - ZERO collection, storage, or verification of government ID numbers.
 */
const PROHIBITED_FIELD_PATTERNS = [
  /^phone$/i,
  /^phone_?number$/i,
  /^mobile$/i,
  /^mobile_?number$/i,
  /^contact_?number$/i,
  /^sms$/i,
  /^otp$/i,
  /^otp_?code$/i,
  /^govt_?id_?(no|num|number)$/i,
  /^national_?id/i,
];

function findProhibitedKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  if (Array.isArray(obj)) {
    const arrayViolations: string[] = [];
    obj.forEach((item, index) => {
      arrayViolations.push(...findProhibitedKeys(item, `${prefix}[${index}]`));
    });
    return arrayViolations;
  }

  const violations: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_FIELD_PATTERNS.some((regex) => regex.test(key))) {
      violations.push(fullKey);
    } else if (value && typeof value === 'object') {
      violations.push(...findProhibitedKeys(value, fullKey));
    }
  }
  return violations;
}

/**
 * Global middleware that enforces the strict prohibition on mobile numbers,
 * SMS/OTP fields, and Government ID numbers in any request payload.
 */
export function enforceComplianceConstraints(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const bodyViolations = findProhibitedKeys(req.body);
  const queryViolations = findProhibitedKeys(req.query);
  const allViolations = [...bodyViolations, ...queryViolations];

  if (allViolations.length > 0) {
    return next(
      new AppError(
        `Policy violation: This system strictly prohibits collection or processing of mobile numbers, OTP/SMS tokens, or Government ID numbers. Rejected field(s): ${allViolations.join(', ')}`,
        400,
        'PROHIBITED_IDENTITY_OR_MOBILE_FIELD'
      )
    );
  }

  next();
}

/**
 * Validates `req.body` against a Zod schema.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError(
            'Request payload validation failed.',
            400,
            'VALIDATION_ERROR',
            err.flatten().fieldErrors
          )
        );
      }
      next(err);
    }
  };
}

/**
 * Validates `req.query` against a Zod schema.
 */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError(
            'Query parameter validation failed.',
            400,
            'VALIDATION_ERROR',
            err.flatten().fieldErrors
          )
        );
      }
      next(err);
    }
  };
}

/**
 * Validates `req.params` against a Zod schema.
 */
export function validateParams(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError(
            'URL parameter validation failed.',
            400,
            'VALIDATION_ERROR',
            err.flatten().fieldErrors
          )
        );
      }
      next(err);
    }
  };
}
