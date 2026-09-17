import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = [
	process.env.FRONTEND_URL,
	'http://localhost:5173',
	'http://localhost:3000',
].filter(Boolean);

app.use(express.json());
// health check for uptime monitors / Render
app.get("/health", (_request, response) => {
	response.sendStatus(200);
});

// serve the built frontend (dist/) as static assets
app.use(express.static(distPath));

// login functionality
app.post("/api/login", login);

// every /api route below requires a valid JWT
app.use('/api', requireAuth);


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


// client-side routing fallback - must be registered after every API route above
app.get("/{*splat}", (_request, response) => {
	response.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
	console.log(`Auth server listening on http://localhost:${port}`);
});
