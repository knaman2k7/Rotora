import express from 'express';

import login from './login/login.ts';
import requireAuth from './login/authMiddleware.ts';

import { readWeekRota, regenerateWeekRota } from './databaseSockets/weekRota.ts';
import { deleteEmployee, readEmployeeDetails, readEmployeeNames, reorderEmployees, updateEmployeeDetails } from './databaseSockets/employeeDetails.ts';
import { newEmployee } from './databaseSockets/newEmployee.ts';
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
import {
	createAnnualLeaveHours,
	deleteAnnualLeaveHours,
	readAnnualLeaveHours,
	updateAnnualLeaveHours,
} from './databaseSockets/annualLeaveHours.ts';

process.on('uncaughtException', (error) => {
	console.error('uncaughtException:', error);
});
process.on('unhandledRejection', (reason) => {
	console.error('unhandledRejection:', reason);
});

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use((request, response, next) => {
	const origin = request.headers.origin ?? '*';
	response.setHeader('Access-Control-Allow-Origin', origin === '*' ? '*' : origin);
	response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

	if (request.method === 'OPTIONS') {
		response.sendStatus(204);
		return;
	}

	next();
});


// login functionality
app.post("/api/login", login);

// every route below requires a valid JWT
app.use(requireAuth);


// CRUD over data

// A specific week's rota
app.get("/api/weekRota/:weekNo", readWeekRota);
app.post("/api/regenerateWeekRota/:weekNo", regenerateWeekRota);

// employee's details
app.get("/api/employees", readEmployeeNames);
app.put("/api/employees/reorder", reorderEmployees);
app.post("/api/newEmployee", newEmployee);
app.get("/api/employeeDetail/:id", readEmployeeDetails);
app.post("/api/updateEmployeeDetail", updateEmployeeDetails);
app.delete("/api/employee/:id", deleteEmployee);

// employee constraint defaults
app.get('/api/defaultEmployeeConstraints/:id', readDefaultEmployeeConstraints);
app.put('/api/defaultEmployeeConstraints/:id', updateDefaultEmployeeConstraints);

// employee constraint for a specific week
app.get('/api/specificEmployeeConstraints/:id/:weekNo', readSpecificEmployeeConstraints);
app.post('/api/specificEmployeeConstraints/:id/:weekNo', createSpecificEmployeeConstraints);
app.put('/api/specificEmployeeConstraints/:id/:weekNo', updateSpecificEmployeeConstraints);
app.delete('/api/specificEmployeeConstraints/:id/:weekNo', deleteSpecificEmployeeConstraints);

// default rota structure constraints
app.get('/api/defaultWeekConstraints', readDefaultWeekConstraints);
app.put('/api/defaultWeekConstraints', updateDefaultWeekConstraints);

// specific rota structure constraints
app.get('/api/specificWeekConstraints/:weekNo', readSpecificWeekConstraints);
app.post('/api/specificWeekConstraints/:weekNo', createSpecificWeekConstraints);
app.put('/api/specificWeekConstraints/:weekNo', updateSpecificWeekConstraints);
app.delete('/api/specificWeekConstraints/:weekNo', deleteSpecificWeekConstraints);

// annual leave hours override for a specific employee's week
app.get('/api/annualLeaveHours/:id/:weekNo', readAnnualLeaveHours);
app.post('/api/annualLeaveHours/:id/:weekNo', createAnnualLeaveHours);
app.put('/api/annualLeaveHours/:id/:weekNo', updateAnnualLeaveHours);
app.delete('/api/annualLeaveHours/:id/:weekNo', deleteAnnualLeaveHours);



app.listen(port, () => {
	console.log(`Auth server listening on http://localhost:${port}`);
});
