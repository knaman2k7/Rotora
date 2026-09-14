type JwtPayload = Record<string, unknown>;

declare global {
	namespace Express {
		interface Request {
			user?: string | JwtPayload;
		}
	}
}

export {};
