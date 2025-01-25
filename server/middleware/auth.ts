import { Request, Response, NextFunction } from "express";
import { SDK, Config } from '@corbado/node-sdk';

if (!process.env.CORBADO_PROJECT_ID || !process.env.CORBADO_API_SECRET) {
  throw new Error('CORBADO_PROJECT_ID and CORBADO_API_SECRET environment variables are required');
}

const config = new Config(
  process.env.CORBADO_PROJECT_ID,
  process.env.CORBADO_API_SECRET,
  'https://api.corbado.com', // Frontend API
  'https://api.corbado.com'  // Backend API
);
const sdk = new SDK(config);

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
      // Validate the token using Corbado SDK
      const validation = await sdk.sessions().validateToken(token);
      if (!validation.valid) {
        throw new Error('Invalid token');
      }

      // Add the validated user ID to the request
      req.userId = validation.userID;
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