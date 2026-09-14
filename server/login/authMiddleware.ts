import jsonwebstoken from "jsonwebtoken";
type JwtPayload = Record<string, unknown>;
import type { NextFunction, Request, Response } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: string | JwtPayload;
        }
    }
}

export default function requireAuth(request: Request, response: Response, next: NextFunction) {
    const authHeader = request.headers.authorization ?? '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        response.status(401).json({ message: 'Authentication required.' });
        return;
    }

    try {
        request.user = jsonwebstoken.verify(token, process.env.JWTsecret as string);
        next();
    } catch (error) {
        response.status(401).json({ message: 'Invalid or expired token.' });
    }
}
