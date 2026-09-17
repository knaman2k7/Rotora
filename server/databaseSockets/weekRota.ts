import db from '../database/db.ts';
import type { Request, Response } from 'express';
import createRota from '../rotaGenerator/main.ts';

export async function readWeekRota(request: Request, response: Response){

    const { weekNo } = request.params;

    try {

        const dbRes = await db.query(`SELECT shifts FROM rotas WHERE week_no = $1`, [weekNo]);

        if (dbRes.rows.length === 0){
            response.status(404).json({message: 'No rota has been generated for this week yet'});
            return;
        }

        const rota = dbRes.rows[0].shifts;

        const employeeRes = await db.query(`SELECT id, name FROM employee_details ORDER BY display_order`);
        const idToName = Object.fromEntries( employeeRes.rows.map( r => [r.id, r.name] ) );
        const employeeOrder = employeeRes.rows.map( r => r.id );

        response.status(200).json({rota, idToName, employeeOrder});

    }
    catch (err){
        response.status(500).json({message: 'Invalid Week Number'});
    }

}

export async function regenerateWeekRota(request: Request, response: Response){

    const { weekNo } = request.params;

    try {

        //const rota = await createRota(Number(weekNo));

        /*await db.query(
            `
            INSERT INTO rotas (week_no, shifts)
            VALUES ($1, $2)
            ON CONFLICT (week_no)
            DO UPDATE SET
                shifts = EXCLUDED.shifts
            RETURNING *;
            `,
            [weekNo, rota]
        );
        */

        const rota = 
            {
                "11": [
                    2,
                    10
                ],
                "13": [
                    7
                ],
                "21": [
                    1,
                    2
                ],
                "23": [
                    6
                ],
                "31": [
                    1
                ],
                "32": [
                    8
                ],
                "33": [
                    2
                ],
                "34": [
                    7
                ],
                "41": [
                    1,
                    2
                ],
                "43": [
                    9
                ],
                "51": [
                    1,
                    2
                ],
                "53": [
                    9
                ],
                "61": [
                    1,
                    6
                ],
                "63": [
                    9
                ],
                "71": [
                    9
                ],
                "72": [
                    6,
                    7
                ]
            }

        const dbRes = await db.query(`SELECT id, name FROM employee_details ORDER BY display_order`);

        const idToName = Object.fromEntries( dbRes.rows.map( r => [r.id, r.name] ) );
        const employeeOrder = dbRes.rows.map( r => r.id );

        response.status(200).json({rota, idToName, employeeOrder});

    }
    catch (err){

        const message = err instanceof Error ? err.message : 'Rota generation failed for an unknown reason.';
        response.status(400).json({message});
    }

}