import DayCombinator from "./dayCombinator.ts";
import {Rota} from "./rotaFramework.ts";

// total steps across every attempt before giving up
const MAX_STEPS = 100000;
// the ranking has random tie-breaking, so some attempts get stuck in a bad
// region of the search. rather than grinding through it, abandon an attempt
// after a small budget and restart with a fresh random ordering. the budget
// doubles each restart so a hard-but-feasible rota still gets a long run
const INITIAL_ATTEMPT_STEPS = 500;


// one depth-first attempt at building the rota. returns the finished rota, or
// null if it used up maxSteps first. throws if the search space is exhausted
function attemptRota(rota: Rota, maxSteps: number): { solution: Object | null, steps: number }{

    var steps = 0;
    var day: number = 0;
    var lastComboForDay: number[] = [0,0,0,0,0,0,0];
    const dayCombinator = new DayCombinator(rota);

    while (rota.notComplete()){

        var i = lastComboForDay[day];
        var backtrackFlag = false;

        do{

            steps++;
            if (steps > maxSteps) {
                return { solution: null, steps };
            }

            const dayCombination = dayCombinator.findDayCombination(day,i);

            if (dayCombination == null){

                backtrackFlag = true;
                lastComboForDay[day] = 0

                // the day that just failed is re-ranked from scratch next time
                // it's reached, because the hours it's ranked on are about to
                // change. the day we return to keeps its cached list so that
                // lastComboForDay still indexes the same ordering
                dayCombinator.resetDay(day);

                day = day - 1;

                // backtracks before day 0
                if (day == -1) {
                    throw new Error("Infeasible Rota based on Constraints");
                }
                else{
                    // convert from 0 index to 1 index
                    rota.backtrackShift(day+1);
                }

            }
            else{
                rota.applyShifts(dayCombination);
            }

            i++

        }
        while( ! (backtrackFlag || rota.valid() )  )

        if (!backtrackFlag) {
            lastComboForDay[day] = i
            day++;
        }
    }

    return { solution: rota.getFinalRota(), steps };

}


function runAlgorithm(rota: Rota): Object{

    var totalSteps = 0;
    var attemptSteps = INITIAL_ATTEMPT_STEPS;

    while (totalSteps < MAX_STEPS){

        const budget = Math.min(attemptSteps, MAX_STEPS - totalSteps);
        const { solution, steps } = attemptRota(rota, budget);
        totalSteps += steps;

        if (solution !== null) return solution;

        // restore every day to its base state before the next attempt
        rota.backtrackShift(1);
        attemptSteps *= 2;
    }

    throw new Error("Rota is Infeasible or Try Again");

}

export default runAlgorithm;
