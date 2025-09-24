import { Request, Response, NextFunction } from 'express';

function extractUserIdFromBearerToken(authHeader?: string | null): string | undefined {
    if (!authHeader) return undefined;
    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) return undefined;
    const token = authHeader.substring(bearerPrefix.length).trim();
    try {
        const parts = token.split('.');
        if (parts.length >= 2) {
            const payloadJson = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);
            if (payload && typeof payload.sub === 'string' && payload.sub.length > 0) {
                return payload.sub;
            }
        }
    } catch (err) {
        // Ignore and treat as unauthenticated
    }
    return undefined;
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


