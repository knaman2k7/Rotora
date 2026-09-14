import DayCombinator from "./dayCombinator.ts";
import RotaFramework from "./rotaFramework.ts";


function runAlgorithm(rota: RotaFramework): Object{

    var day = 0
    var lastDayCombination = [0,0,0,0,0,0,0];
    var dayCombinator: DayCombinator = new DayCombinator()

    dayCombinator.findDayCombination(rota, 0, 0);

    while (false && rota.notComplete()){

        var i = lastDayCombination[0]
        var backtrackFlag = false;

        do{

            // get the day combination



        } while ( !( backtrackFlag || rota.valid(day) ) )

        if (backtrackFlag){

            // cannot backtrack further from day 0
            if (day == 0){
                throw new Error("Rota Not Possible Due to Constraints conflict")
            }

            lastDayCombination[day] = 0;
            day = day - 1;

        }
        else{
            day = day + 1;
        }

    }

    //return rota.getFinalRota();
    return {}

}





export default runAlgorithm;