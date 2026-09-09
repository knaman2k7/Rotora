import bcrypt from "bcrypt"
import jsonwebstoken from "jsonwebtoken"

import db from '../database/db.ts';
import type { Request, Response } from 'express';

export default async function login(request: Request, response: Response) {
    const { username, password } = request.body ?? {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        response.status(400).json({ message: 'Username and password are required.' });
        return;
    }

    try {
        
        const DBres = await db.query('SELECT password, roletype FROM users WHERE username = $1',[username]);
        const user = DBres.rows[0];
        
        if (!user) response.status(401).json({message: "Invalid Credintels"})
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) response.status(401).json({message: "Incorrect Password"});

        const token = jsonwebstoken.sign(user, process.env.JWTsecret, {expiresIn: "1d"});

        response.status(200).json({ token: token });


    } catch (error) {
        console.error('Login failed:', error);
        response.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
}