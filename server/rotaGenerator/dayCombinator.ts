import {Rota} from "./rotaFramework.ts"

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
        3: 'Thu',
        4: 'Fri',
        5: 'Sat',
        6: 'Sun'
    }

    private rota: Rota;

    constructor(rota:Rota){
        this.rota = rota;
    }

    // provides the ith best combination
    public findDayCombination(day: number, i: number): Object | null
    {

        const currentDayCombos = this.weekCombinations[this.mapDay[day]];

        if ( currentDayCombos.length != 0 ){
            return i >= currentDayCombos.length ? null : currentDayCombos[i]
        }
        else{


            // generate the combinations
            var combos = this.generateCombinations(day);


            // shred the invalid combinations - leave for now 
            // if after shredding none are left - return null -> backtrack

            // rank them
            combos = this.rankMetric(combos, day);

            // put them into the weekCombinations
            this.weekCombinations[this.mapDay[day]] = combos;

            
            return combos[0];

        }

    }

    // resets a day combinations due to backtrack
    public resetDay(day: number){
        this.weekCombinations[ this.mapDay[day] ] = [];
    }


    // generates all the possible combinations given the current state of the day
    private generateCombinations(
        day: number
    ): Object[] {

        var shiftsAvailable: Object = this.rota.getDayShift(day+1)
        var keyholderAvailability: number[][] = this.rota.getKeyholderAvailability( (day+1).toString() );
        var allAvailability: number[][] = this.rota.getAllAvailability( (day+1).toString() );
        const fullTimeEmployees: number[] = this.rota.getFullTimeEmployees();


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

    // leave for now
    // filters combinations that would make any employee exceed their contract hours
    private shredCombinations(combinations: Object[], originalDayShift: Object){

        

    }

    // method which adds the rank metric
    // each combination is { "<shiftCode>": number[] } (fully filled slot arrays)
    // returns the combinations sorted best-first (lowest score first), so
    // employees who are furthest behind on their hours are favoured
    private rankMetric(combinations: Object[], day: number): Object[]{

        // score = sum[for each employee in the day combination]( currentHours( 1/contractHours + k/desiredHours ) )
        const k = 0.15;
        const hours = this.rota.getEmployeeHours();

        // rota.currentHours only holds the pre-allocated (fixed) shifts, it is
        // never updated as days get decided. Without this, anyone with a fixed
        // shift (e.g. Jo's Sunday) looks "ahead" on hours for the whole week
        // and is ranked last every day. So add the hours the algorithm has
        // already assigned on earlier days (slots that were null in baseRota).
        const extraHours: Record<number, number> = {};
        const base = this.rota.baseRota as Record<string, Array<number | null>>;
        const working = this.rota.workingRota as Record<string, Array<number | null>>;
        for (const [code, slots] of Object.entries(working)) {
            if (Math.floor(Number(code) / 10) > day) continue; // today onwards isn't decided yet
            const type = Number(code) % 10;
            const shiftHours = (type === 2 || type === 4) ? 6 : 8;
            slots.forEach((id, idx) => {
                if (id === null || base[code]?.[idx] !== null) return; // empty or fixed (already credited)
                extraHours[id] = (extraHours[id] ?? 0) + shiftHours;
            });
        }

        const scoreOf = (combo: Object): number => {
            let score = 0;
            for (const slots of Object.values(combo as Record<string, number[]>)) {
                for (const id of slots) {
                    const h = hours[id];
                    if (!h) continue;
                    // a zero contract/desired value contributes nothing rather than Infinity
                    const contractTerm = h.contractHours > 0 ? 1 / h.contractHours : 0;
                    const desiredTerm = h.desiredHours > 0 ? k / h.desiredHours : 0;
                    score += (h.currentHours + (extraHours[id] ?? 0)) * (contractTerm + desiredTerm);
                }
            }
            return score;
        };

        return combinations
            .map((combo) => ({ combo, score: 
                scoreOf(combo) + (0.05 * Math.random())
            }))
            .sort((a, b) => a.score - b.score)
            .map((entry) => entry.combo);

    }


}
