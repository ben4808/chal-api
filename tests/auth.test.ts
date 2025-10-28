import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { handleGoogleAuth } from '../src/handlers/handleGoogleAuth';
import { verifyAuth } from '../src/handlers/verifyAuth';
import { generateJWT, verifyJWT } from '../src/lib/jwt';

// Mock the Google OAuth2Client
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        email_verified: true,
      }),
    }),
  })),
}));

describe('Google Auth Handler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {
        token: 'mock-google-id-token',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should handle successful Google authentication', async () => {
    await handleGoogleAuth(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: 'google-user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      })
    );
  });

  it('should handle missing token', async () => {
    mockReq.body = {};
    
    await handleGoogleAuth(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Google ID token is required',
    });
  });
});

describe('JWT Utils', () => {
  it('should generate and verify JWT tokens', () => {
    const user = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    const token = generateJWT(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const payload = verifyJWT(token);
    expect(payload).toBeDefined();
    expect(payload?.sub).toBe(user.id);
    expect(payload?.email).toBe(user.email);
    expect(payload?.firstName).toBe(user.firstName);
    expect(payload?.lastName).toBe(user.lastName);
  });

  it('should return null for invalid tokens', () => {
    const invalidToken = 'invalid.token.here';
    const payload = verifyJWT(invalidToken);
    expect(payload).toBeNull();
  });
});

describe('Auth Verification', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      header: vi.fn(),
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should verify valid JWT token', async () => {
    const user = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };
    const token = generateJWT(user);
    
    (mockReq.header as any).mockImplementation((header: string) => {
      if (header === 'Authorization' || header === 'authorization') {
        return `Bearer ${token}`;
      }
      return undefined;
    });

    await verifyAuth(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  });

  it('should handle missing authorization header', async () => {
    (mockReq.header as any).mockReturnValue(undefined);

    await verifyAuth(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      valid: false,
      error: 'No authorization header provided',
    });
  });
});
