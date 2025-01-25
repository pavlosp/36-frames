import { Request, Response, NextFunction } from "express";
import type { CorbadoSession } from '@corbado/node-sdk';

if (!process.env.CORBADO_PROJECT_ID) {
  throw new Error('CORBADO_PROJECT_ID environment variable is required');
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    try {
      // Parse and verify the token
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));

      if (!payload.sub) {
        throw new Error('Invalid token: no subject claim');
      }

      // Add the validated user ID to the request
      req.userId = payload.sub;
      next();
    } catch (error) {
      console.error('Token validation failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}