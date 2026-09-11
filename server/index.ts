import express from 'express';

import login from './login/login.ts';

import { readWeekRota, regenerateWeekRota } from './databaseSockets/weekRota.ts';
import { readEmployeeDetails, readEmployeeNames, updateEmployeeDetails } from './databaseSockets/employeeDetails.ts';
import {
	readDefaultEmployeeConstraints,
	updateDefaultEmployeeConstraints,
} from './databaseSockets/defaultEmployeeConstraints.ts';
import {
	createSpecificEmployeeConstraints,
	deleteSpecificEmployeeConstraints,
	readSpecificEmployeeConstraints,
	updateSpecificEmployeeConstraints,
} from './databaseSockets/specificEmployeeConstraints.ts';
import {
	readDefaultWeekConstraints,
	updateDefaultWeekConstraints,
} from './databaseSockets/defaultWeekConstraints.ts';
import {
	createSpecificWeekConstraints,
	deleteSpecificWeekConstraints,
	readSpecificWeekConstraints,
	updateSpecificWeekConstraints,
} from './databaseSockets/specificWeekConstraints.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());


// login functionality
app.post("/api/login", login);


// CRUD over data

// A specific week's rota
app.get("/api/weekRota", readWeekRota);
app.post("/api/regenerateWeekRota", regenerateWeekRota);

// employee's details
app.get("/api/employees", readEmployeeNames);
app.get("/api/employeeDetail/:id", readEmployeeDetails);
app.post("/api/updateEmployeeDetail", updateEmployeeDetails);

// employee constraint defaults
app.get('/api/defaultEmployeeConstraints/:id', readDefaultEmployeeConstraints);
app.put('/api/defaultEmployeeConstraints/:id', updateDefaultEmployeeConstraints);

// employee constraint for a specific week
app.get('/api/specificEmployeeConstraints/:id/:weekNo', readSpecificEmployeeConstraints);
app.post('/api/specificEmployeeConstraints/:id/:weekNo', createSpecificEmployeeConstraints);
app.put('/api/specificEmployeeConstraints/:id/:weekNo', updateSpecificEmployeeConstraints);
app.delete('/api/specificEmployeeConstraints/:id/:weekNo', deleteSpecificEmployeeConstraints);

// rota structure constraints
app.get('/api/defaultWeekConstraints', readDefaultWeekConstraints);
app.put('/api/defaultWeekConstraints', updateDefaultWeekConstraints);
app.get('/api/specificWeekConstraints/:weekNo', readSpecificWeekConstraints);
app.post('/api/specificWeekConstraints/:weekNo', createSpecificWeekConstraints);
app.put('/api/specificWeekConstraints/:weekNo', updateSpecificWeekConstraints);
app.delete('/api/specificWeekConstraints/:weekNo', deleteSpecificWeekConstraints);


app.listen(port, () => {
	console.log(`Auth server listening on http://localhost:${port}`);
});
