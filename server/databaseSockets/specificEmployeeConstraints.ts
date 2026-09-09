import db from '../database/db.ts';
import type { Request, Response } from 'express';
import {
    isIntegerMatrix,
    readPositiveInteger,
    requireConstraintId,
    sendInvalidConstraintRequest,
} from './constraintValidation.ts';

export async function readSpecificEmployeeConstraints(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    if (id === null) return;

    try {
        const result = await db.query(
            'SELECT id, "constraint", week_no FROM specific_employee_constraints WHERE id = $1 ORDER BY week_no',
            [id],
        );

        response.status(200).json({ specificEmployeeConstraints: result.rows });
    } catch (error) {
        console.error('Failed to read specific employee constraints:', error);
        response.status(500).json({ message: 'Unable to read specific employee constraints.' });
    }
}

export async function createSpecificEmployeeConstraints(request: Request, response: Response) {
    const id = readPositiveInteger(request.body?.id);
    const weekNo = readPositiveInteger(request.body?.weekNo);
    const constraints = request.body?.constraint;

    if (id === null || weekNo === null || !isIntegerMatrix(constraints)) {
        sendInvalidConstraintRequest(response, 'id and weekNo must be positive integers and constraint must be an integer matrix.');
        return;
    }

    try {
        const result = await db.query(
            `INSERT INTO specific_employee_constraints (id, "constraint", week_no)
             VALUES ($1, $2, $3)
             RETURNING id, "constraint", week_no`,
            [id, constraints, weekNo],
        );

        response.status(201).json({ specificEmployeeConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to create specific employee constraints:', error);
        response.status(500).json({ message: 'Unable to create specific employee constraints.' });
    }
}

export async function updateSpecificEmployeeConstraints(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    const weekNo = readPositiveInteger(request.params.weekNo);
    const constraints = request.body?.constraint;

    if (id === null || weekNo === null || !isIntegerMatrix(constraints)) {
        if (id !== null) {
            sendInvalidConstraintRequest(response, 'weekNo must be a positive integer in the URL and constraint must be an integer matrix.');
        }
        return;
    }

    try {
        const result = await db.query(
            `UPDATE specific_employee_constraints
             SET "constraint" = $2
             WHERE id = $1 AND week_no = $3
             RETURNING id, "constraint", week_no`,
            [id, constraints, weekNo],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Specific employee constraints not found.' });
            return;
        }

        response.status(200).json({ specificEmployeeConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to update specific employee constraints:', error);
        response.status(500).json({ message: 'Unable to update specific employee constraints.' });
    }
}

export async function deleteSpecificEmployeeConstraints(request: Request, response: Response) {
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
            'DELETE FROM specific_employee_constraints WHERE id = $1 AND week_no = $2 RETURNING id, week_no',
            [id, weekNo],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Specific employee constraints not found.' });
            return;
        }

        response.sendStatus(204);
    } catch (error) {
        console.error('Failed to delete specific employee constraints:', error);
        response.status(500).json({ message: 'Unable to delete specific employee constraints.' });
    }
}