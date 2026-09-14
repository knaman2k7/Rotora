import db from '../database/db.ts';
import type { Request, Response } from 'express';
import createRota from '../rotaGenerator/main.ts';

export async function readWeekRota(request: Request, response: Response){

    const { weekNo } = request.params;

    try {

        const dbRes = await db.query(`SELECT shifts FROM rotas WHERE week_no = $1`, [weekNo]);
        const rota = dbRes.rows[0].week_rota;

        response.status(200).json({weekRota: rota});

    }
    catch (err){
        response.status(500).json({message: 'Invalid Week Number'});
    }

}

export async function regenerateWeekRota(request: Request, response: Response){

    const { weekNo } = request.params;

    try {

        const rota = createRota(Number(weekNo));

        await db.query(
            `
            INSERT INTO rotas (week_no, shifts))
            VALUES ($1, $2)
            ON CONFLICT (week_no)
            DO UPDATE SET
                shifts = EXCLUDED.shifts
            RETURNING *;
            `,
            [weekNo, rota]
        );

        response.status(200).json({weekRota: rota});

    }
    catch (err){
        response.status(500).json({message: 'Invalid Week Number'});
    }

}