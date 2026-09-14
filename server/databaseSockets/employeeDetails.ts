import db from '../database/db.ts';
import type { Request, Response } from 'express';
import { requireConstraintId } from './constraintValidation.ts';

export async function readEmployeeNames(_request: Request, response: Response){


    try{

        const result = await db.query(
            'SELECT id, name, keyholder, contract_hours, desired_hours, employee_type FROM employee_details ORDER BY display_order'
        );

        response.status(200).json({ employees: result.rows });

    }
    catch{
        response.sendStatus(500);
    }

}

export async function reorderEmployees(request: Request, response: Response){

    const { orderedIds } = request.body ?? {};

    if (!Array.isArray(orderedIds) || orderedIds.length === 0 || !orderedIds.every((id) => Number.isInteger(id))) {
        response.status(400).json({ message: 'orderedIds must be a non-empty array of employee ids.' });
        return;
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        for (let index = 0; index < orderedIds.length; index++) {
            await client.query(
                'UPDATE employee_details SET display_order = $1 WHERE id = $2',
                [index, orderedIds[index]]
            );
        }

        await client.query('COMMIT');
        response.sendStatus(200);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to reorder employees:', error);
        response.status(500).json({ message: 'Unable to save employee order.' });
    } finally {
        client.release();
    }

}

export async function readEmployeeDetails(request: Request, response: Response){

    const employeeId = request.params.id;

    try{

        const result = await db.query('SELECT * from employee_details WHERE id = $1', [employeeId]);
        const employee = result.rows[0];

        response.status(200).json({employee});

    }
    catch(err){
        response.sendStatus(500);
    }

}

export async function updateEmployeeDetails(request: Request, response: Response){

    const { id, name, keyholder, contractHours, desiredHours, employeeType } = request.body;

    try{

        const result = await db.query(
            `UPDATE employee_details
             SET name = $2,
                 keyholder = $3,
                 contract_hours = $4,
                 desired_hours = $5,
                 employee_type = $6
             WHERE id = $1
             RETURNING *`,
            [id, name, keyholder, contractHours, desiredHours, employeeType]
        );

        response.sendStatus(200);

    }
    catch (err){
        response.sendStatus(500);
    }


}

export async function deleteEmployee(request: Request, response: Response) {
    const id = requireConstraintId(request, response);
    if (id === null) return;

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM annual_leave_hours WHERE id = $1', [id]);
        await client.query('DELETE FROM default_employee_constraints WHERE id = $1', [id]);
        await client.query('DELETE FROM specific_employee_constraints WHERE id = $1', [id]);
        const result = await client.query('DELETE FROM employee_details WHERE id = $1 RETURNING id', [id]);

        if (!result.rows[0]) {
            await client.query('ROLLBACK');
            response.status(404).json({ message: 'Employee not found.' });
            return;
        }

        await client.query('COMMIT');
        response.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to delete employee:', error);
        response.status(500).json({ message: 'Unable to delete employee.' });
    } finally {
        client.release();
    }
}
