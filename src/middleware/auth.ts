import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../lib/jwt';

function extractUserIdFromBearerToken(authHeader?: string | null): string | undefined {
    if (!authHeader) return undefined;
    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) return undefined;
    const token = authHeader.substring(bearerPrefix.length).trim();
    
    const payload = verifyJWT(token);
    return payload?.sub;
}

export function authenticateOptional(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.header('Authorization') || req.header('authorization');
    const userId = extractUserIdFromBearerToken(authHeader);
    if (userId) {
        (req as any).userId = userId;
    }
    next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.header('Authorization') || req.header('authorization');
    const userId = extractUserIdFromBearerToken(authHeader);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized access.' });
    }
    (req as any).userId = userId;
    next();
}


