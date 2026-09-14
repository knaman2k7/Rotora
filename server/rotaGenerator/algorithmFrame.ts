import DayCombinator from "./dayCombinator.ts";
import {RotaFramework} from "./rotaFramework.ts";


function runAlgorithm(rota: RotaFramework): Object{

    var day = 0
    var lastDayCombination = [0,0,0,0,0,0,0];
    var dayCombinator: DayCombinator = new DayCombinator()

    // safety net: this is an exhaustive synchronous search running on the
    // single event-loop thread, so a stuck or infeasible search must fail
    // fast instead of freezing the whole server indefinitely
    const MAX_ITERATIONS = 200000;
    var iterations = 0;

    while (rota.notComplete()){

        if (++iterations > MAX_ITERATIONS){
            throw new Error("Rota generation exceeded the maximum number of search steps");
        }

        var i = lastDayCombination[day]
        var backtrackFlag = false;

        do{

            const dayCombination = dayCombinator.findDayCombination(rota,day,i);

            if (dayCombination == null){
                dayCombinator.resetDay(day);

                // data is 1 based
                rota.backtrackShift(day+1)
                backtrackFlag = true;
            }
            else{
                rota.applyShifts(dayCombination);
            }

            i = i + 1


        } while ( !( backtrackFlag || rota.valid(day) ) )

        if (backtrackFlag){

            // cannot backtrack further from day 0
            if (day == 0){
                throw new Error("Infeasible Rota based on constraints selected")
            }

            lastDayCombination[day] = 0;
            day = day - 1;

        }
        else{
            // remember which combination this day used so that if we later
            // backtrack back into it, we resume from the NEXT one instead
            // of re-trying (and re-applying) the same one forever
            lastDayCombination[day] = i;
            day = day + 1;
        }

    }

    return rota.getFinalRota();

}





export default runAlgorithm;