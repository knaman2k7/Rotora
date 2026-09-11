import db from '../database/db.ts';
import type { Request, Response } from 'express';
import {
    isIntegerArray,
    sendInvalidConstraintRequest,
} from './constraintValidation.ts';

function isInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
}

function readWeekConstraintValues(request: Request) {
    const { desiredTotalHours, weekConstraints, assignedShifts } = request.body ?? {};

    if (!isInteger(desiredTotalHours) || !isIntegerArray(weekConstraints) || !isIntegerArray(assignedShifts)) {
        return null;
    }

    return { desiredTotalHours, weekConstraints, assignedShifts };
}

export async function readDefaultWeekConstraints(_request: Request, response: Response) {
    try {
        const weekConstraintsResult = await db.query(
            `SELECT desired_total_hours, week_constraints, assigned_shifts
             FROM default_week_constraints`,
        );

        const employeesResult = await db.query(
            `SELECT name, id
             FROM employee_details`,
        );

        if (!weekConstraintsResult.rows[0]) {
            response.status(404).json({ message: 'Default week constraints not found.' });
            return;
        }

        response.status(200).json({ 
            defaultWeekConstraints: weekConstraintsResult.rows[0],
            employees: employeesResult.rows,
        });
    } catch (error) {
        console.error('Failed to read default week constraints:', error);
        response.status(500).json({ message: 'Unable to read default week constraints.' });
    }
}

export async function updateDefaultWeekConstraints(request: Request, response: Response) {
    const values = readWeekConstraintValues(request);

    if (!values) {
        sendInvalidConstraintRequest(
            response,
            'desiredTotalHours must be an integer and weekConstraints and assignedShifts must be integer arrays.',
        );
        return;
    }

    try {
        const result = await db.query(
            `UPDATE default_week_constraints
             SET desired_total_hours = $1,
                 week_constraints = $2,
                 assigned_shifts = $3
             RETURNING desired_total_hours, week_constraints, assigned_shifts`,
            [values.desiredTotalHours, values.weekConstraints, values.assignedShifts],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Default week constraints not found.' });
            return;
        }

        response.status(200).json({ defaultWeekConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to update default week constraints:', error);
        response.status(500).json({ message: 'Unable to update default week constraints.' });
    }
}