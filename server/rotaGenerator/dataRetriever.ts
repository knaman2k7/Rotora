import console from "node:console";
import util from "node:util";
import db from "../database/db.ts";

async function retrieveData(weekNo: number): Promise<Object>{

    // get week constraints
    const workingRota: Record<number, Array<number | null>> = await getWeekConstraints(weekNo);

    // get employee details
    const { CDhours: CCDhours, fullTimeEmployees, keyholders, annualLeaveEmployees } = await getEmployeeDetails(weekNo);

    // raise an error if there is an employee on 0 hour annual leave for the week and they are in the pre-allocated shifts
    if (annualLeaveEmployees.length > 0) {

        const preAllocatedEmployeeIds = new Set(
            Object.values(workingRota)
                .flat()
                .filter((id): id is number => id !== null)
        );

        const conflictingEmployees = annualLeaveEmployees.filter(
            id => preAllocatedEmployeeIds.has(id)
        );

        if (conflictingEmployees.length > 0) {
            throw new Error(
                `Employee(s) ${conflictingEmployees.join(', ')} are on 0 hour annual leave for week ${weekNo} but are pre-allocated in the shift rota.`
            );
        }

    }

    // get employee constraints
    const availability: Record<string, { keyholder: number[][], all: number[][] }> = await getEmployeeConstraints(weekNo, keyholders, CCDhours);


    //console.log(util.inspect({workingRota, availability, CDhours: CCDhours, fullTimeEmployees}, { depth: null }));

    return {workingRota, availability, CDhours: CCDhours, fullTimeEmployees};

}


async function getWeekConstraints(weekNo: number): Promise<Record<number, Array<number | null>>> {

    // retrieve week constraint
    const dbRes = await db.query(
        `SELECT week_constraints, assigned_shifts FROM specific_week_constraints
        WHERE week_no = $1
        UNION ALL
        SELECT week_constraints, assigned_shifts FROM default_week_constraints
        WHERE NOT EXISTS (
            SELECT 1 FROM specific_week_constraints
            WHERE week_no = $1)`,
        [weekNo]
    )

    const week_constraintsRAW = dbRes.rows[0].week_constraints;
    const assigned_shiftsRAW = dbRes.rows[0].assigned_shifts;

    const weekConstraints: Record<number, Array<number | null>> = {};
    
    week_constraintsRAW.forEach((element: number) => {
        const shiftCode = element % 100;
        const numberOfEmployees = Math.floor(element / 100);

        weekConstraints[shiftCode] = Array(numberOfEmployees).fill(null);
    });

    assigned_shiftsRAW.forEach((element: number) => {
        const shiftCode = Math.floor(element / 100);
        const employeeId = element % 100;

        const shiftAssignments = weekConstraints[shiftCode];
        const firstNullIndex = shiftAssignments.findIndex(
            assignment => assignment === null
        );

        if (firstNullIndex !== -1) {
            shiftAssignments[firstNullIndex] = employeeId;
        }
    });

    return weekConstraints;

}

async function getEmployeeDetails(weekNo:number): Promise<{
    CDhours: Object;
    fullTimeEmployees: Object;
    keyholders: number[];
    annualLeaveEmployees: number[]
}> {
    
    interface EmployeeDetails {
        id: number;
        keyholder: boolean;
        contract_hours: number;
        desired_hours: number;
        employee_type: string;
    }

    interface AnnualLeaveDetails{
        id: number,
        hours: number
    }

    const dbRes = await db.query(
        `SELECT id, keyholder, contract_hours, desired_hours, employee_type
         FROM employee_details`
    );

    const employeeDetails: EmployeeDetails[] = dbRes.rows;

    const dbRes2 = await db.query(
        `SELECT id, hours FROM annual_leave_hours WHERE week_no = $1`,
        [weekNo]
    )

    const annualLeaveDetails: AnnualLeaveDetails[] = dbRes2.rows;

    // corrected data against annual leave hours
    const annualLeaveEmployees: number[] = [];

    annualLeaveDetails.forEach( (e) => {
        // remove any employees if they have 0 hours
        if (e.hours == 0){
            annualLeaveEmployees.push(e.id);
        }
        // else set their contract hours and desired hours to annual leave hours
        else if (e.hours > 0){
            employeeDetails.forEach(employee => {
                if (employee.id == e.id){
                    employee.contract_hours = e.hours;
                    employee.desired_hours = e.hours;
                }
            })
        }
    })

    const availableEmployeeDetails = employeeDetails.filter(
        employee => !annualLeaveEmployees.includes(employee.id)
    );

    const CDhours: Object = Object.fromEntries(
        availableEmployeeDetails.map(employee => [
            employee.id,
            {
                currentHours: 0,
                contractHours: employee.contract_hours,
                desiredHours: employee.desired_hours
            }
        ])
    );

    const keyholders: number[] = availableEmployeeDetails
        .filter(e => e.keyholder == true)
        .map(e => e.id);

    const fullTimeEmployees: number[] = availableEmployeeDetails
        .filter(employee => employee.employee_type != 'sales-advisor')
        .map(employee => employee.id);


    return {CDhours, fullTimeEmployees, keyholders, annualLeaveEmployees};

}

interface DayAvailability {
    keyholder: [number[], number[]];
    all: [number[], number[]];
}

async function getEmployeeConstraints(weekNo: number, keyholders: number[], CDhours: Object): 
    Promise<Record<string, { keyholder: number[][], all: number[][] }>>{

    const days: String[] = ['Mon', 'Tue','Wed','Thu','Fri','Sat','Sun'];
    const day: Record<number, string> = {
        1: 'Mon',
        2: 'Tue',
        3: 'Wed',
        4:'Thu',
        5:'Fri',
        6:'Sat',
        7:'Sun'
    }

    const keyholderArr: number[] = keyholders;
    const allArr: number[] = Object.keys(CDhours).map(x => Number(x));

    const availability: Record<string, DayAvailability> = Object.fromEntries(
        days.map( day => [
            day,
            {
                keyholder:[keyholderArr,keyholderArr],
                all:[allArr,allArr]
            }
        ] )
    )

    interface IDtoConstraints{
        id: number,
        constraints: number[]
    }

    // get the default constraints
    const dbRes = await db.query(
        `SELECT id, constraints FROM default_employee_constraints`
    );

    const masterConstraints: IDtoConstraints[] = dbRes.rows;

    const dbRes2 = await db.query(
        `SELECT id, constraints FROM specific_employee_constraints WHERE week_no = $1`,
        [weekNo]
    );

    const specificConstraints: IDtoConstraints[] = dbRes2.rows;

    specificConstraints.forEach( (spec) => {
        
        masterConstraints.forEach( (def) => {

            if (def.id == spec.id){
                def.constraints = spec.constraints;
            }

        } )

    } );

    masterConstraints.forEach( employeeConstraints => {

        employeeConstraints.constraints.forEach( (constraint: number) => {

            const dayAvailability = availability[ day[ Math.floor(constraint/10) ] ];

            if (constraint%10 == 1 || constraint%10 == 2){
                dayAvailability.all[0] = dayAvailability.all[0].filter(id => id !== employeeConstraints.id);
                dayAvailability.keyholder[0] = dayAvailability.keyholder[0].filter(id => id !== employeeConstraints.id);
            }
            else if (constraint%10 == 3 || constraint%10 == 4){
                dayAvailability.all[1] = dayAvailability.all[1].filter(id => id !== employeeConstraints.id);
                dayAvailability.keyholder[1] = dayAvailability.keyholder[1].filter(id => id !== employeeConstraints.id);
            }

        })

    })

    return availability;

}


export default retrieveData;