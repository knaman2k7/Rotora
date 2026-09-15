import {RotaFramework} from "./rotaFramework.ts"

export default class DayCombinator{

    weekCombinations: Record<string, Object[]> = {
        'Mon':[],
        'Tue':[],
        'Wed':[],
        'Thu':[],
        'Fri':[],
        'Sat':[],
        'Sun':[]
    }
    // map day number to day string
    mapDay: Record<number, string> = {
        0: 'Mon',
        1: 'Tue',
        2: 'Wed',
        3:'Thu',
        4:'Fri',
        5:'Sat',
        6:'Sun'
    }

    constructor(){}

    // provides the ith best combination
    public findDayCombination(rota: RotaFramework, day: number, i: number): Object | null
    {

        const dayCombinations = this.weekCombinations[ this.mapDay[day] ];

        if ( dayCombinations.length > 0 ){
            if (dayCombinations.length == i){
                return null;
            }
            else{
                return dayCombinations[i];
            }
        }
        // potential for error check here
        else{

            // generate the combination list
            var newDayCombinations: Object[] = this.generateCombinations(
                // main is 0 based - db is 1 based
                rota.getDayShift(day+1),
                rota.getKeyholderAvailability(this.mapDay[day]),
                rota.getAllAvailability(this.mapDay[day]),
                rota.getFullTimeEmployees()
            )

            // remove any full time exceeded contract hour combinations
            var shreddedNewDayCombinations: Object[] = this.shredCombinations(
                newDayCombinations,
                rota,
                rota.getDayShift(day+1)
            );


            // create the ranked list on combinations
            var rankedCombinations: Object[] = this.rankMetric(shreddedNewDayCombinations, rota);

            // insert these combinations
            this.weekCombinations[this.mapDay[day]] = rankedCombinations;

            // 0 could be replaced for day here
            return this.weekCombinations[this.mapDay[day]][0] ?? null

        }

    }

    // resets a day combinations due to backtrack
    public resetDay(day: number){
        this.weekCombinations[ this.mapDay[day] ] = [];
    }


    // generates all the possible combinations given the current state of the day
    // uses keyholder status as hard constraints
    private generateCombinations(
        shiftsAvailable: Object,
        keyholderAvailability: number[][],
        allAvailability: number[][],
        fullTimeEmployees: number[]
    ): Object[] {

        type Slot = number | null;

        // shiftsAvailable comes in typed as `Object`, so narrow it to the
        // shape it's actually in: { "<day><type>": [slot, slot, ...] }
        const rota = shiftsAvailable as Record<string, Slot[]>;
        const fullTimeSet = new Set(fullTimeEmployees);

        interface ShiftDescriptor {
            code: string;
            isMorning: boolean;
            is6Hour: boolean;
            slotArray: Slot[];
            fixed: number[];   // employees already pre-allocated to this shift
            openCount: number; // how many null slots still need filling
            pool: number[];    // employees eligible to fill those open slots
        }

        // y (shift type) is the last digit of the code: 1 = morning-8,
        // 2 = morning-6, 3 = evening-8, 4 = evening-6.
        const shifts: ShiftDescriptor[] = Object.keys(rota).map((code) => {
            const type = Number(code) % 10;
            const isMorning = type === 1 || type === 2;
            const is6Hour = type === 2 || type === 4;
            const slotArray = rota[code];

            const fixed: number[] = [];
            let openCount = 0;
            slotArray.forEach((v) => {
                if (v === null) openCount++;
                else fixed.push(v);
            });

            const basePool = isMorning ? allAvailability[0] : allAvailability[1];
            // full-time employees can only work 8-hour shifts, so they're
            // dropped from the pool entirely for 6-hour shifts
            const pool = is6Hour
                ? basePool.filter((id) => !fullTimeSet.has(id))
                : basePool.slice();

            return { code, isMorning, is6Hour, slotArray, fixed, openCount, pool };
        });

        const hasMorningShift = shifts.some((s) => s.isMorning);
        const hasEveningShift = shifts.some((s) => !s.isMorning);

        // anyone already pre-allocated is "used" before the search even starts,
        // so they can't also be picked for another open slot that day
        const initiallyUsed = new Set<number>();
        shifts.forEach((s) => s.fixed.forEach((id) => initiallyUsed.add(id)));

        // all size-k subsets of arr, order doesn't matter (slots within a
        // shift are interchangeable)
        function combinations(arr: number[], k: number): number[][] {
            const out: number[][] = [];
            const chosenBuf: number[] = [];
            (function rec(start: number) {
                if (chosenBuf.length === k) {
                    out.push(chosenBuf.slice());
                    return;
                }
                for (let i = start; i < arr.length; i++) {
                    chosenBuf.push(arr[i]);
                    rec(i + 1);
                    chosenBuf.pop();
                }
            })(0);
            return out;
        }

        const chosen: Record<string, number[]> = {};

        // at least one keyholder must be present across ALL morning shifts
        // combined, and the same across all evening shifts combined
        function keyholderCheckPasses(): boolean {
            const collect = (filterFn: (s: ShiftDescriptor) => boolean): number[] =>
                shifts
                    .filter(filterFn)
                    .flatMap((s) => [...s.fixed, ...(chosen[s.code] ?? [])]);

            if (hasMorningShift) {
                const morningHasOpenSlot = shifts
                    .some((shift) => shift.isMorning && shift.openCount > 0);
                const morningAssigned = collect((s) => s.isMorning);
                if (morningHasOpenSlot
                    && !keyholderAvailability[0].some((id) => morningAssigned.includes(id))) {
                    return false;
                }
            }
            if (hasEveningShift) {
                const eveningHasOpenSlot = shifts
                    .some((shift) => !shift.isMorning && shift.openCount > 0);
                const eveningAssigned = collect((s) => !s.isMorning);
                if (eveningHasOpenSlot
                    && !keyholderAvailability[1].some((id) => eveningAssigned.includes(id))) {
                    return false;
                }
            }
            return true;
        }

        // rebuild the shift's slot array, keeping pre-allocated ids where
        // they were and filling the nulls with what was picked, in order
        function buildFinalSlotArray(shift: ShiftDescriptor): number[] {
            const picks = chosen[shift.code] ?? [];
            let i = 0;
            return shift.slotArray.map((v) => (v === null ? picks[i++] : v)) as number[];
        }

        const results: Object[] = [];

        function backtrack(index: number, used: Set<number>): void {
            if (index === shifts.length) {
                if (keyholderCheckPasses()) {
                    const snapshot: Record<string, number[]> = {};
                    for (const s of shifts) snapshot[s.code] = buildFinalSlotArray(s);
                    results.push(snapshot);
                }
                return;
            }

            const shift = shifts[index];

            if (shift.openCount === 0) {
                // fully pre-allocated already - nothing to choose here
                backtrack(index + 1, used);
                return;
            }

            const stillAvailable = shift.pool.filter((id) => !used.has(id));
            for (const combo of combinations(stillAvailable, shift.openCount)) {
                chosen[shift.code] = combo;
                combo.forEach((id) => used.add(id));

                backtrack(index + 1, used);

                combo.forEach((id) => used.delete(id));
            }
            delete chosen[shift.code];
        }

        backtrack(0, new Set(initiallyUsed));

        return results;
    }

    // filters combinations that would make any employee exceed their contract hours
    private shredCombinations(combinations: Object[], rota: RotaFramework, originalDayShift: Object): Object[]{

        const employeeHours = rota.getEmployeeHours();
        const originalSlots = originalDayShift as Record<string, Array<number | null>>;

        // y (shift type) is the last digit of the code: 1 = morning-8,
        // 2 = morning-6, 3 = evening-8, 4 = evening-6.
        const getShiftHours = (code: string): number => {
            const type = Number(code) % 10;
            return (type === 2 || type === 4) ? 6 : 8;
        };

        return combinations.filter((combination) => {

            const shifts = combination as Record<string, number[]>;

            // total hours this combination would add today, per employee -
            // slots that were already pre-allocated are excluded since their
            // hours are already baked into currentHours permanently, and
            // counting them again here would double-count and wrongly reject
            // the only combination that includes them
            const hoursToday = new Map<number, number>();
            for (const [code, employees] of Object.entries(shifts)) {
                const hours = getShiftHours(code);
                const original = originalSlots[code] ?? [];
                employees.forEach((id, index) => {
                    if (original[index] !== null && original[index] !== undefined) return;
                    hoursToday.set(id, (hoursToday.get(id) ?? 0) + hours);
                });
            }

            // A combination that pushes any employee past their contract is
            // invalid. The final-week lower-bound check lives in valid().
            for (const [id, hours] of hoursToday) {
                const details = employeeHours[id];
                if (details && details.currentHours + hours > details.contractHours) {
                    return false;
                }
            }

            return true;
        });

    }

    // method which adds the rank metric
    // rankMetric = Sum[for each employee in combination]( currentHours * ( 1/contractHours + k/desiredHours ) )
    // lower rankMetric is better, so combinations are sorted ascending by it
    //
    // K is weighted at parity with the contract term (not a small nudge) so
    // that employees with equal contractHours but very different
    // desiredHours are still clearly differentiated - previously K=0.15 made
    // this term small enough to be swamped by the tie-break noise below,
    // which let low-desired-hours employees (e.g. desiredHours == contractHours)
    // keep pace with high-desired-hours employees instead of yielding hours
    // to them once both had comparable currentHours
    private rankMetric(combinations: Object[], rota: RotaFramework): Object[] {

        const K = 1;
        const employeeHours = rota.getEmployeeHours();

        const metricFor = (combination: Object): number => {
            const shifts = combination as Record<string, number[]>;

            const employeeIds = new Set<number>();
            Object.values(shifts).forEach((ids) => ids.forEach((id) => employeeIds.add(id)));

            let total = 0;
            for (const id of employeeIds) {
                const details = employeeHours[id];
                if (!details) continue;
                total += details.currentHours * (1 / details.contractHours + K / details.desiredHours);
            }
            // tiny epsilon, not a meaningful ranking factor - only breaks
            // exact ties (e.g. two combinations of all-zero-hours employees)
            // so it can't override the real signal above like the old
            // Math.random()/10 did
            return total + (Math.random() * 1e-6);
        };

        return combinations
            .map((combination) => ({ combination, metric: metricFor(combination) }))
            .sort((a, b) => a.metric - b.metric)
            .map((entry) => entry.combination);

    }


}