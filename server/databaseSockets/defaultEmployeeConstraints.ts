import db from '../database/db.ts';
import type { Request, Response } from 'express';
import {
    isIntegerArray,
    requireConstraintId,
    sendInvalidConstraintRequest,
} from './constraintValidation.ts';

export async function readDefaultEmployeeConstraints(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    if (id === null) return;

    try {
        const result = await db.query(
            'SELECT id, "constraints" FROM default_employee_constraints WHERE id = $1',
            [id],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Default employee constraints not found.' });
            return;
        }

        response.status(200).json({ defaultEmployeeConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to read default employee constraints:', error);
        response.status(500).json({ message: 'Unable to read default employee constraints.' });
    }
}


export async function updateDefaultEmployeeConstraints(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    const constraints = request.body?.constraint;

    if (id === null || !isIntegerArray(constraints)) {
        if (id !== null) {
            sendInvalidConstraintRequest(response, 'constraint must be an integer array.');
        }
        return;
    }

    try {
        const result = await db.query(
            `UPDATE default_employee_constraints
             SET "constraints" = $2
             WHERE id = $1
             RETURNING id, "constraints"`,
            [id, constraints],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Default employee constraints not found.' });
            return;
        }

        response.status(200).json({ defaultEmployeeConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to update default employee constraints:', error);
        response.status(500).json({ message: 'Unable to update default employee constraints.' });
    }
}