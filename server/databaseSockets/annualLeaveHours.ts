import db from '../database/db.ts';
import type { Request, Response } from 'express';
import {
    readPositiveInteger,
    requireConstraintId,
    sendInvalidConstraintRequest,
} from './constraintValidation.ts';

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export async function readAnnualLeaveHours(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    const weekNo = readPositiveInteger(request.params.weekNo);

    if (id === null || weekNo === null) {
        if (id !== null) {
            sendInvalidConstraintRequest(response, 'A positive integer weekNo is required in the URL.');
        }
        return;
    }

    try {
        const result = await db.query(
            'SELECT id, week_no, hours FROM annual_leave_hours WHERE id = $1 AND week_no = $2',
            [id, weekNo],
        );

        response.status(200).json({ annualLeaveHours: result.rows[0] });
    } catch (error) {
        console.error('Failed to read annual leave hours:', error);
        response.status(500).json({ message: 'Unable to read annual leave hours.' });
    }
}

export async function createAnnualLeaveHours(request: Request, response: Response) {
    const id = readPositiveInteger(request.params?.id);
    const weekNo = readPositiveInteger(request.params?.weekNo);
    const hours = request.body?.hours;

    if (id === null || weekNo === null || !isNonNegativeInteger(hours)) {
        sendInvalidConstraintRequest(response, 'id and weekNo must be positive integers and hours must be a non-negative integer.');
        return;
    }

    try {
        const result = await db.query(
            `INSERT INTO annual_leave_hours (id, week_no, hours)
             VALUES ($1, $2, $3)
             RETURNING id, week_no, hours`,
            [id, weekNo, hours],
        );

        response.status(201).json({ annualLeaveHours: result.rows[0] });
    } catch (error) {
        console.error('Failed to create annual leave hours:', error);
        response.status(500).json({ message: 'Unable to create annual leave hours.' });
    }
}

export async function updateAnnualLeaveHours(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    const weekNo = readPositiveInteger(request.params.weekNo);
    const hours = request.body?.hours;

    if (id === null || weekNo === null || !isNonNegativeInteger(hours)) {
        if (id !== null) {
            sendInvalidConstraintRequest(response, 'weekNo must be a positive integer in the URL and hours must be a non-negative integer.');
        }
        return;
    }

    try {
        const result = await db.query(
            `UPDATE annual_leave_hours
             SET hours = $3
             WHERE id = $1 AND week_no = $2
             RETURNING id, week_no, hours`,
            [id, weekNo, hours],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Annual leave hours not found.' });
            return;
        }

        response.status(200).json({ annualLeaveHours: result.rows[0] });
    } catch (error) {
        console.error('Failed to update annual leave hours:', error);
        response.status(500).json({ message: 'Unable to update annual leave hours.' });
    }
}

export async function deleteAnnualLeaveHours(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    const weekNo = readPositiveInteger(request.params.weekNo);

    if (id === null || weekNo === null) {
        if (id !== null) {
            sendInvalidConstraintRequest(response, 'A positive integer weekNo is required in the URL.');
        }
        return;
    }

    try {
        const result = await db.query(
            'DELETE FROM annual_leave_hours WHERE id = $1 AND week_no = $2 RETURNING id, week_no',
            [id, weekNo],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Annual leave hours not found.' });
            return;
        }

        response.sendStatus(204);
    } catch (error) {
        console.error('Failed to delete annual leave hours:', error);
        response.status(500).json({ message: 'Unable to delete annual leave hours.' });
    }
}
