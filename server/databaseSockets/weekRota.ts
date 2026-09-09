import db from '../database/db.ts';
import type { Request, Response } from 'express';

export async function readWeekRota(request: Request, response: Response){

    const { weekNo } = request.body;

    try {

        const dbRes = await db.query(`SELECT week_rota FROM week_rota WHERE week_no = $1`, [weekNo]);
        const rota = dbRes.rows[0].week_rota;

        response.status(200).json({weekRota: rota});

    }
    catch (err){
        response.status(500).json({message: 'Invalid Week Number'});
    }

}

export async function regenerateWeekRota(request: Request, response: Response){

    const { weekNo } = request.body;

    try {

        // need to plug in algorithm here

        response.status(200).json({message: 'functionality needs to be built'});

    }
    catch (err){
        response.status(500).json({message: 'Invalid Week Number'});
    }

}