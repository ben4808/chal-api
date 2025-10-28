import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { StatusCodes } from 'http-status-codes';
import { generateJWT } from '../lib/jwt';
import { User } from '../models/User';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email_verified: boolean;
}

export async function handleGoogleAuth(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'Google ID token is required' 
      });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GoogleTokenPayload;

    if (!payload) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        error: 'Invalid Google token' 
      });
    }

    // Verify email is verified
    if (!payload.email_verified) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        error: 'Google email not verified' 
      });
    }

    // Extract user information
    const user: User = {
      id: payload.sub, // Google's unique user ID
      firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
      lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
      email: payload.email,
      nativeLang: 'en', // Default to English, can be updated later
    };

    // Generate JWT token
    const jwtToken = generateJWT(user);

    // Return the JWT token and user data
    res.status(StatusCodes.OK).json({
      token: jwtToken,
      user: user,
    });

  } catch (error) {
    console.error('Google auth error:', error);
    
    if (error instanceof Error) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        error: 'Google authentication failed: ' + error.message 
      });
    }
    
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: 'Internal server error during authentication' 
    });
  }
}
