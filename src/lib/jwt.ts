import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export function generateJWT(user: User): string {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d' // Token expires in 7 days
  });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}
