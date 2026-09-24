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

    // restores the given day AND every later day to their base state, so
    // stale combinations left on later days by a previous attempt can't make
    // the rota look complete
    public backtrackShift(day: number){
        this.workingRota = {...this.workingRota,
            ...Object.fromEntries(
                Object.entries(this.baseRota).filter(
                    ([key]) => Math.floor(Number(key) / 10) >= day
                )
            )
        }
    }


    // checked after every day is applied. prunes partial rotas that can no
    // longer meet contracts, and does the exact check once the rota is full
    public valid(): boolean{

        // CCDhours.currentHours only holds the pre-allocated (fixed) shifts,
        // so total each employee's hours from the working rota
        const rota = this.workingRota as Record<string, Array<number | null>>;
        const totals: Record<number, number> = {};
        // days that still have an undecided slot
        const openDays = new Set<number>();
        // employees already placed on each day (fixed or applied)
        const placedOnDay: Record<number, Set<number>> = {};

        Object.entries(rota).forEach(([code, employees]) => {
            const hours = this.getShiftHours(code);
            const day = Math.floor(Number(code) / 10);
            placedOnDay[day] ??= new Set<number>();
            employees.forEach(id => {
                if (id === null){
                    openDays.add(day);
                    return;
                }
                totals[id] = (totals[id] ?? 0) + hours;
                placedOnDay[day].add(id);
            });
        });

        const complete = openDays.size === 0;

        return Object.entries(this.CCDhours).every(
            ([key,value]) => {
                const id = Number(key);
                const worked = totals[id] ?? 0;
                // `in` tests array indices, not values - use includes
                const fullTime = this.fullTimeEmployees.includes(id);

                // full-timers must land exactly on contract, so going over is fatal
                if (fullTime && worked > value.contractHours) return false;

                if (complete){
                    return fullTime
                        ? worked == value.contractHours
                        : worked >= value.contractHours;
                }

                // partial rota: even working every remaining day they're
                // available (max 8h a day, one shift a day) they must still be
                // able to reach contract
                let potential = 0;
                openDays.forEach(day => {
                    if (placedOnDay[day]?.has(id)) return;
                    const avail = this.availability[day.toString()]?.all;
                    if (avail && (avail[0]?.includes(id) || avail[1]?.includes(id))){
                        potential += 8;
                    }
                });
                return worked + potential >= value.contractHours;
            }
        );

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