import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Middleware to restrict access to requests from within AWS VPC, localhost, or AWS Console tests.
 * Checks for AWS VPC indicators, localhost IPs, or AWS Console test headers.
 * Can be overridden with ALLOW_CONSOLE_TESTING=true environment variable.
 */
export function vpcOnly(req: Request, res: Response, next: NextFunction) {
    const clientIP = req.ip || req.socket?.remoteAddress || '';

    // Allow localhost connections
    const isLocalhost = clientIP === '127.0.0.1' ||
                       clientIP === '::1' ||
                       clientIP.startsWith('127.') ||
                       clientIP === '::ffff:127.0.0.1';

    // Check for AWS VPC indicators
    const hasAWSHeaders = req.headers['x-forwarded-for'] ||
                         req.headers['x-real-ip'] ||
                         req.headers['x-amzn-trace-id'];

    // For AWS Lambda/API Gateway deployments, check for specific headers
    const isAWSVPC = hasAWSHeaders ||
                    req.headers['x-amz-cf-id'] || // CloudFront
                    req.headers['x-amz-lambda-request-id']; // Lambda

    // Allow AWS Console test invocations
    const isConsoleTest = req.headers['x-amz-invocation-type'] === 'RequestResponse' ||
                         req.headers['x-amz-request-id'];

    // Allow testing mode override
    const allowConsoleTesting = process.env.ALLOW_CONSOLE_TESTING === 'true';

    if (isLocalhost || isAWSVPC || isConsoleTest || allowConsoleTesting) {
        return next();
    }

    return res.status(StatusCodes.FORBIDDEN).json({
        message: 'Access denied. This endpoint is only accessible from within AWS VPC or localhost.'
    });
}