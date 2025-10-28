import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyJWT } from '../lib/jwt';

export async function verifyAuth(req: Request, res: Response) {
  try {
    const authHeader = req.header('Authorization') || req.header('authorization');
    
    if (!authHeader) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        valid: false,
        error: 'No authorization header provided' 
      });
    }

    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        valid: false,
        error: 'Invalid authorization header format' 
      });
    }

    const token = authHeader.substring(bearerPrefix.length).trim();
    const payload = verifyJWT(token);

    if (!payload) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        valid: false,
        error: 'Invalid or expired token' 
      });
    }

    // Token is valid
    res.status(StatusCodes.OK).json({ 
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      }
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      valid: false,
      error: 'Internal server error during token verification' 
    });
  }
}
