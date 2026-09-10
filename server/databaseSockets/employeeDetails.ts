import db from '../database/db.ts';
import type { Request, Response } from 'express';

export async function readEmployeeNames(_request: Request, response: Response){


    try{

        const result = await db.query('SELECT id, name FROM employee_details ORDER BY name');

        response.status(200).json({ employees: result.rows });

    }
    catch{
        response.sendStatus(500);
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
