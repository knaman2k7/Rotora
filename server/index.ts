import express, { type Request, type Response } from 'express';
import db from './database/db.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.post('/api/login', async (request: Request, response: Response) => {
	const { username, password } = request.body ?? {};

	if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
		response.status(400).json({ message: 'Username and password are required.' });
		return;
	}

	try {
		// Add your parameterized user lookup and password verification here.
		// Keep the query parameterized and compare a hash, never a plain-text password.
		void db;
		response.status(501).json({ message: 'Connect the login query in server/index.ts.' });
	} catch (error) {
		console.error('Login failed:', error);
		response.status(500).json({ message: 'Something went wrong. Please try again.' });
	}
});

app.listen(port, () => {
	console.log(`Auth server listening on http://localhost:${port}`);
});
