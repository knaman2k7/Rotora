import db from '../database/db.ts';
import type { Request, Response } from 'express';

export async function newEmployee(request: Request, response: Response) {
    const {
        name,
        keyholder,
        contractHours,
        desiredHours,
        employeeType,
    } = request.body ?? {};

    const employeeTypes = new Set(['manager', 'assistant-manager', 'supervisor', 'sales-advisor']);
    const parsedContractHours = Number(contractHours);
    const parsedDesiredHours = Number(desiredHours);

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof keyholder !== 'boolean' ||
        !Number.isFinite(parsedContractHours) ||
        parsedContractHours < 0 ||
        !Number.isFinite(parsedDesiredHours) ||
        parsedDesiredHours < 0 ||
        typeof employeeType !== 'string' ||
        !employeeTypes.has(employeeType)
    ) {
        response.status(400).json({ message: 'Invalid employee details.' });
        return;
    }

    const normalizedDesiredHours = employeeType === 'sales-advisor' ? parsedDesiredHours : parsedContractHours;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const employeeResult = await client.query(
            `INSERT INTO employee_details
             (name, keyholder, contract_hours, desired_hours, employee_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), keyholder, parsedContractHours, normalizedDesiredHours, employeeType],
        );
        const employee = employeeResult.rows[0];

        await client.query(
            `INSERT INTO default_employee_constraints (id, "constraints")
             VALUES ($1, ARRAY[]::integer[])`,
            [employee.id],
        );

        await client.query('COMMIT');
        response.status(201).json({ employee });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to create employee:', error);
        response.status(500).json({ message: 'Unable to create employee.' });
    } finally {
        client.release();
    }
}