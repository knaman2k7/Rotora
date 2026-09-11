import db from '../database/db.ts';
import type { Request, Response } from 'express';
import {
    isIntegerArray,
    readPositiveInteger,
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

export async function readSpecificWeekConstraints(request: Request, response: Response) {
    const weekNo = readPositiveInteger(request.params.weekNo);

    if (weekNo === null) {
        sendInvalidConstraintRequest(response, 'A positive integer weekNo is required in the URL.');
        return;
    }

    try {
        const weekConstraintsResult = await db.query(
            `SELECT week_no, desired_total_hours, week_constraints, assigned_shifts
             FROM specific_week_constraints
             WHERE week_no = $1`,
            [weekNo],
        );

        const employeesResult = await db.query(
            `SELECT name, id
             FROM employee_details`,
        );

        if (!weekConstraintsResult.rows[0]) {
            response.status(404).json({ message: 'Specific week constraints not found.' });
            return;
        }

        response.status(200).json({
            specificWeekConstraints: weekConstraintsResult.rows[0],
            employees: employeesResult.rows,
        });
    } catch (error) {
        console.error('Failed to read specific week constraints:', error);
        response.status(500).json({ message: 'Unable to read specific week constraints.' });
    }
}

export async function createSpecificWeekConstraints(request: Request, response: Response) {
    const weekNo = readPositiveInteger(request.params.weekNo);
    const values = readWeekConstraintValues(request);

    if (weekNo === null || !values) {
        sendInvalidConstraintRequest(
            response,
            'A positive integer weekNo is required in the URL, desiredTotalHours must be an integer, and weekConstraints and assignedShifts must be integer arrays.',
        );
        return;
    }

    try {
        const result = await db.query(
            `INSERT INTO specific_week_constraints
                (week_no, desired_total_hours, week_constraints, assigned_shifts)
             VALUES ($1, $2, $3, $4)
             RETURNING week_no, desired_total_hours, week_constraints, assigned_shifts`,
            [weekNo, values.desiredTotalHours, values.weekConstraints, values.assignedShifts],
        );

        response.status(201).json({ specificWeekConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to create specific week constraints:', error);
        response.status(500).json({ message: 'Unable to create specific week constraints.' });
    }
}

export async function updateSpecificWeekConstraints(request: Request, response: Response) {
    const weekNo = readPositiveInteger(request.params.weekNo);
    const values = readWeekConstraintValues(request);

    if (weekNo === null || !values) {
        sendInvalidConstraintRequest(
            response,
            'A positive integer weekNo is required in the URL, desiredTotalHours must be an integer, and weekConstraints and assignedShifts must be integer arrays.',
        );
        return;
    }

    try {
        const result = await db.query(
            `UPDATE specific_week_constraints
             SET desired_total_hours = $2,
                 week_constraints = $3,
                 assigned_shifts = $4
             WHERE week_no = $1
             RETURNING week_no, desired_total_hours, week_constraints, assigned_shifts`,
            [weekNo, values.desiredTotalHours, values.weekConstraints, values.assignedShifts],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Specific week constraints not found.' });
            return;
        }

        response.status(200).json({ specificWeekConstraints: result.rows[0] });
    } catch (error) {
        console.error('Failed to update specific week constraints:', error);
        response.status(500).json({ message: 'Unable to update specific week constraints.' });
    }
}

export async function deleteSpecificWeekConstraints(request: Request, response: Response) {
    const weekNo = readPositiveInteger(request.params.weekNo);

    if (weekNo === null) {
        sendInvalidConstraintRequest(response, 'A positive integer weekNo is required in the URL.');
        return;
    }

    try {
        const result = await db.query(
            'DELETE FROM specific_week_constraints WHERE week_no = $1 RETURNING week_no',
            [weekNo],
        );

        if (!result.rows[0]) {
            response.status(404).json({ message: 'Specific week constraints not found.' });
            return;
        }

        response.sendStatus(204);
    } catch (error) {
        console.error('Failed to delete specific week constraints:', error);
        response.status(500).json({ message: 'Unable to delete specific week constraints.' });
    }
}