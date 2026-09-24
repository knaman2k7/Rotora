import DayCombinator from "./dayCombinator.ts";
import {Rota} from "./rotaFramework.ts";


function runAlgorithm(rota: Rota): Object{

    
    var day: number = 0;
    var lastComboForDay: number[] = [0,0,0,0,0,0,0];
    const dayCombinator = new DayCombinator(rota);
    var counter = 0;

    while (rota.notComplete()){

        var i = lastComboForDay[day];
        var backtrackFlag = false;

        do{

            const dayCombination = dayCombinator.findDayCombination(day,i);

            if (dayCombination == null){
                
                backtrackFlag = true;
                lastComboForDay[day] = 0

                day = day - 1;

                // backtracks before day 0
                if (day == -1) {
                    throw new Error("Infeasible Rota based on Constraints");
                }
                else{
                    // convert from 0 index to 1 index
                    rota.backtrackShift(day+1);

                    dayCombinator.resetDay(day);

                }

            }
            else{
                rota.applyShifts(dayCombination);
            }

            i++
            console.log(counter++);

        }
        while( ! (backtrackFlag || rota.valid() )  )

        if (!backtrackFlag) {
            lastComboForDay[day] = i
            day++;
        }
    }


    return rota.getFinalRota();

}

export default runAlgorithm;