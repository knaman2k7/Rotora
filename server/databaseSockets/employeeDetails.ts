import db from '../database/db.ts';
import type { Request, Response } from 'express';

export async function readEmployeeDetails(request: Request, response: Response){

    const { employeeId } = request.body;

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

    const { employeeID, keyholder, contractHours, desiredHours, employeeType } = request.body;

    try{

        const result = await db.query(
            `UPDATE employee_details
             SET keyholder = $2,
                 contract_hours = $3,
                 desired_hours = $4,
                 employee_type = $5
             WHERE id = $1
             RETURNING *`,
            [employeeID, keyholder, contractHours, desiredHours, employeeType]
        );

        response.sendStatus(200);

    }
    catch (err){
        response.sendStatus(500);
    }


}
