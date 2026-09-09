import type { Request, Response } from 'express';

export function readPositiveInteger(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return value;
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
        const parsedValue = Number(value);
        return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
    }

    return null;
}

export function isIntegerMatrix(value: unknown): value is number[][] {
    return Array.isArray(value)
        && value.every((row) => Array.isArray(row) && row.every((entry) => Number.isInteger(entry)));
}

export function sendInvalidConstraintRequest(response: Response, message: string) {
    response.status(400).json({ message });
}

export function requireConstraintId(request: Request, response: Response): number | null {
    const id = readPositiveInteger(request.params.id);

    if (id === null) {
        sendInvalidConstraintRequest(response, 'A positive integer id is required.');
    }

    return id;
}