export interface EmployeeHours {
    currentHours: number;
    contractHours: number;
    desiredHours: number;
}

export class Rota{

    //copy of the original rota for backtracking
    public baseRota: Object;

    public workingRota: Object;
    public availability: Record<string, { keyholder: number[][], all: number[][] }>;
    public CCDhours: Record<number, EmployeeHours>;
    public fullTimeEmployees: number[];

    constructor(workingRota: Object,
        availability: Record<string, { keyholder: number[][], all: number[][] }>,
        CCDhours: Record<number, EmployeeHours>,
        fullTimeEmployees: number[]
    ){
        this.baseRota = workingRota;
        this.workingRota = workingRota;
        this.availability = availability;
        this.fullTimeEmployees = fullTimeEmployees;
        this.CCDhours = CCDhours;

        // shifts that already have an employee pre-allocated (assigned_shifts
        // from the db) are fixed for the whole run - they're never decided by
        // the algorithm, so their hours must be credited once up front here
        // rather than through applyShifts/revertDayHours, which only ever
        // touch the slots the algorithm is actively deciding
        Object.entries(this.baseRota as Record<string, Array<number | null>>).forEach(([code, employees]) => {
            const hours = this.getShiftHours(code);
            employees.forEach(id => {
                if (id === null) return;
                const details = this.CCDhours[id];
                if (details) details.currentHours += hours;
            });
        });
    }

    // returns true if the rota is now filled/ready
    public notComplete(): boolean{
        return Object.values(this.workingRota as Record<string, Array<number | null>>)
            .some(slots => slots.some(slot => slot === null));
    }

    // applies shift against employee combination to the current rota
    public applyShifts(shifts: Object){
        this.workingRota = {...this.workingRota, ...shifts};
    }

    public backtrackShift(day: number){
        this.workingRota = {...this.workingRota, 
            ...Object.fromEntries(
                Object.entries(this.baseRota).filter(
                    ([key]) => key[0] == day.toString()
                )
            )
        }
    }


    // simple day 7 check so far -- really expensive
    public valid(): boolean{

        // simple implemetation so far

        return true;

        if (this.notComplete()){
            return true;
        }
        else{

            // make sure every minimum contract hour has been hit
            return Object.entries(this.CCDhours).every(
                ([key,value]) => {
                    if (Number(key) in this.fullTimeEmployees){
                        return value.currentHours == value.contractHours
                    }
                    else{
                        return value.currentHours >= value.contractHours
                    }
                }
            )

        }

    }




    private getShiftHours(code: string): number {
        // y (shift type) is the last digit of the code: 1 = morning-8,
        // 2 = morning-6, 3 = evening-8, 4 = evening-6.
        const type = Number(code) % 10;
        return (type === 2 || type === 4) ? 6 : 8;
    }

    public getDayShift(day: number): Object{

        return Object.fromEntries( Object.entries(this.workingRota).filter(
            ([key]) => Math.floor( Number(key) / 10 ) == day
        ) )

    }

    public getKeyholderAvailability(day: string): number[][]{
        return this.availability[day]['keyholder'];
    }

    public getAllAvailability(day: string): number[][]{
        return this.availability[day]['all'];
    }

    public getFullTimeEmployees(){
        return this.fullTimeEmployees;
    }

    public getEmployeeHours(): Record<number, EmployeeHours>{
        return this.CCDhours;
    }

    public getFinalRota(){
        return this.workingRota;
    }

}