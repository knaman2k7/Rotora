export interface EmployeeHours {
    currentHours: number;
    contractHours: number;
    desiredHours: number;
}

export class RotaFramework{

    //copy of the original rota for backtracking
    private baseRota: Object;

    private workingRota: Object;
    private availability: Record<string, { keyholder: number[][], all: number[][] }>;
    private CCDhours: Record<number, EmployeeHours>;
    private fullTimeEmployees: number[];
    private fullTimeSet: Set<number>;

    // union of every day's keyholder pool - used to recognise a
    // pre-allocated employee as a keyholder without re-deriving the raw
    // keyholder list (constraints only ever shrink a day's keyholder pool,
    // never add to it, so the union across all days is the full set)
    private keyholderSet: Set<number>;

    // days (1-based, matching the shift code prefix) that currently have a
    // combination applied on top of baseRota - tracked so a day can be
    // re-applied (a rejected candidate replaced by the next one, or a day
    // being re-entered after backtracking out of a later day) without
    // double-crediting its hours
    private appliedDays: Set<number> = new Set();

    private dayNames: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    constructor(workingRota: Object,
        availability: Record<string, { keyholder: number[][], all: number[][] }>,
        CCDhours: Record<number, EmployeeHours>,
        fullTimeEmployees: number[]
    ){
        this.baseRota = workingRota;
        this.workingRota = workingRota;
        this.availability = availability;
        this.fullTimeEmployees = fullTimeEmployees;
        this.fullTimeSet = new Set(fullTimeEmployees);
        this.CCDhours = CCDhours;

        this.keyholderSet = new Set(
            Object.values(availability).flatMap(day => [...day.keyholder[0], ...day.keyholder[1]])
        );

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

    // true if this slot was already filled (pre-allocated) before the
    // algorithm started, as opposed to being decided by a combination
    private isPreallocated(code: string, index: number): boolean {
        const baseSlots = (this.baseRota as Record<string, Array<number | null>>)[code];
        return baseSlots != null && baseSlots[index] !== null;
    }

    // returns true if the rota is now filled/ready
    public notComplete(): boolean{
        return Object.values(this.workingRota as Record<string, Array<number | null>>)
            .some(slots => slots.some(slot => slot === null));
    }

    // y (shift type) is the last digit of the code: 1 = morning-8,
    // 2 = morning-6, 3 = evening-8, 4 = evening-6.
    private getShiftHours(code: string): number {
        const type = Number(code) % 10;
        return (type === 2 || type === 4) ? 6 : 8;
    }

    // undoes the hours credited for whatever is currently applied on this
    // day (does not touch workingRota - callers decide what replaces it)
    private revertDayHours(day: number){
        const dayEntries = Object.entries(this.workingRota as Record<string, Array<number | null>>)
            .filter(([key]) => Math.floor(Number(key) / 10) == day);

        dayEntries.forEach(([code, employees]) => {
            const hours = this.getShiftHours(code);
            employees.forEach((id, index) => {
                if (id === null) return;
                // pre-allocated slots were credited once at construction and
                // never change across candidates - don't touch them here
                if (this.isPreallocated(code, index)) return;
                const details = this.CCDhours[id];
                if (details) details.currentHours -= hours;
            });
        });
    }

    // applies shift against employee combination to the current rota
    public applyShifts(shifts: Object){

        const shiftEntries = shifts as Record<string, Array<number | null>>;
        const day = Math.floor(Number(Object.keys(shiftEntries)[0]) / 10);

        // a different combination is being tried for a day that already has
        // one applied - either a rejected candidate being retried, or this
        // day being re-entered after backtracking out of a later day -
        // so undo its hours first or they'd be double counted on top of
        // the new combination's hours
        if (this.appliedDays.has(day)){
            this.revertDayHours(day);
        }

        Object.entries(shiftEntries).forEach(([code, employees]) => {
            const hours = this.getShiftHours(code);
            employees.forEach((id, index) => {
                if (id === null) return;
                // pre-allocated slots were already credited once at
                // construction - crediting them again here would double-count
                if (this.isPreallocated(code, index)) return;
                const details = this.CCDhours[id];
                if (details) details.currentHours += hours;
            });
        });

        this.workingRota = {...this.workingRota, ...shiftEntries};
        this.appliedDays.add(day);
    }

    public backtrackShift(day: number){

        this.revertDayHours(day);

        this.workingRota = {...this.workingRota,
            ...Object.fromEntries(Object.entries(this.baseRota).filter(
                ([key]) => Math.floor(Number(key) / 10) == day
            ))
        }

        this.appliedDays.delete(day);

    }



    // returns true if the rest of the working rota will be feasible with certain constraints
    // hueristic based on:
    // - all employees will be able to get contract hours
    // - there are enough people to cover the rest of the days of the week based on
    // -- full time employees cannot work more shifts if they have reached their contract hour
    // -- people being available for those days(employee constraints)
    public valid(day: number): boolean{

        // every employee must reach their contract hours by the end of the
        // week. If the hours still needed exceed what the remaining days
        // could possibly provide, this branch can never reach a valid rota.
        // This also becomes an exact check after Sunday (day === 6), when
        // daysRemaining is zero.
        for (const [idText, details] of Object.entries(this.CCDhours)){
            const id = Number(idText);
            const hoursNeeded = details.contractHours - details.currentHours;

            // full-time employees must not be scheduled beyond their
            // contract hours - reject as soon as currentHours exceeds it
            if (details.currentHours > details.contractHours){
                return false;
            }

            if (hoursNeeded <= 0) continue;

            // Bound each employee by the shifts they can actually take on
            // future days. The old daysRemaining * 8 bound allowed the
            // search to explore many branches that could never meet a
            // contract because of availability or 6-hour shift rules.
            let maximumRemainingHours = 0;
            for (let futureDay = day + 1; futureDay <= 6; futureDay++){
                const futureEntries = this.rotaEntriesForDay(futureDay + 1);
                const dayAvailability = this.availability[this.dayNames[futureDay]];
                const canWorkMorning = dayAvailability.all[0].includes(id);
                const canWorkEvening = dayAvailability.all[1].includes(id);

                const possibleHours = futureEntries
                    .filter(([code, slots]) => {
                        if (!slots.some(slot => slot === null)) return false;
                        const type = Number(code) % 10;
                        const isMorning = type === 1 || type === 2;
                        const isSixHour = type === 2 || type === 4;
                        if (this.fullTimeSet.has(id) && isSixHour) return false;
                        return isMorning ? canWorkMorning : canWorkEvening;
                    })
                    .map(([code]) => this.getShiftHours(code));

                // An employee can work at most one shift per day.
                maximumRemainingHours += Math.max(0, ...possibleHours);
            }

            if (hoursNeeded > maximumRemainingHours){
                return false;
            }
        }

        // The remaining shifts are a shared pool. Even when every employee
        // looks feasible individually, the rota cannot succeed if the total
        // hours still required exceed the hours in all remaining open slots.
        const totalHoursNeeded = Object.values(this.CCDhours)
            .reduce((total, details) => total + Math.max(0, details.contractHours - details.currentHours), 0);
        const remainingShiftHours = Object.entries(this.workingRota as Record<string, Array<number | null>>)
            .reduce((total, [code, slots]) => {
                return total + (slots.some(slot => slot === null)
                    ? slots.filter(slot => slot === null).length * this.getShiftHours(code)
                    : 0);
            }, 0);

        if (totalHoursNeeded > remainingShiftHours){
            return false;
        }

        // people being available for those days (employee constraints):
        // each remaining day's still-open shift slots must be fillable by
        // that day's available employees
        const rota = this.workingRota as Record<string, Array<number | null>>;
        const rotaEntries = Object.entries(rota);

        // full-time employees can only work 8-hour shifts, and they all draw
        // from the SAME pool of remaining 8-hour slots. the per-employee
        // check above bounds each one in isolation and misses this
        // competition: e.g. two full-timers can each individually look fine
        // against daysRemaining*8, while together they need more 8-hour
        // slots than actually remain - reject that branch now
        let totalFullTimeHoursNeeded = 0;
        for (const id of this.fullTimeEmployees){
            const details = this.CCDhours[id];
            if (!details) continue;
            totalFullTimeHoursNeeded += Math.max(0, details.contractHours - details.currentHours);
        }
        if (totalFullTimeHoursNeeded > 0){
            const remaining8HourSlots = rotaEntries.reduce((count, [code, slots]) => {
                const codeDay = Math.floor(Number(code) / 10);
                if (codeDay <= day + 1) return count;
                const type = Number(code) % 10;
                if (type !== 1 && type !== 3) return count;
                return count + slots.filter(slot => slot === null).length;
            }, 0);

            if (totalFullTimeHoursNeeded > remaining8HourSlots * 8){
                return false;
            }
        }

        for (let d = day + 1; d <= 6; d++){

            const dayShiftEntries = rotaEntries.filter(([code]) => Math.floor(Number(code) / 10) == d + 1);

            const openSlots = dayShiftEntries
                .reduce((count, [, slots]) => count + slots.filter(slot => slot === null).length, 0);

            if (openSlots === 0) continue;

            const dayAvailability = this.availability[this.dayNames[d]];
            const availableEmployees = new Set([
                ...dayAvailability.all[0],
                ...dayAvailability.all[1]
            ]);

            if (availableEmployees.size < openSlots){
                return false;
            }

            // keyholder coverage: a period (morning/evening) with still-open
            // slots on this day needs at least one keyholder who could
            // actually fill it - either already fixed there, or still
            // available AND (if full-time) not yet at their contract-hour
            // cap, since a capped full-timer will be filtered out of every
            // future combination anyway
            for (const isMorning of [true, false]){

                const periodEntries = dayShiftEntries.filter(([code]) => {
                    const type = Number(code) % 10;
                    return (type === 1 || type === 2) === isMorning;
                });

                const periodHasOpenSlot = periodEntries.some(
                    ([, slots]) => slots.some(slot => slot === null)
                );
                if (!periodHasOpenSlot) continue;

                const periodHasFixedKeyholder = periodEntries.some(
                    ([, slots]) => slots.some(slot => slot !== null && this.keyholderSet.has(slot))
                );
                if (periodHasFixedKeyholder) continue;

                const periodIndex = isMorning ? 0 : 1;
                const hasEligibleKeyholder = dayAvailability.keyholder[periodIndex].some(id => {
                    if (!this.fullTimeSet.has(id)) return true;
                    const details = this.CCDhours[id];
                    return !details || details.currentHours < details.contractHours;
                });

                if (!hasEligibleKeyholder){
                    return false;
                }

            }

        }

        return true;

    }

    private rotaEntriesForDay(day: number): [string, Array<number | null>][] {
        return Object.entries(this.workingRota as Record<string, Array<number | null>>)
            .filter(([code]) => Math.floor(Number(code) / 10) === day);
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