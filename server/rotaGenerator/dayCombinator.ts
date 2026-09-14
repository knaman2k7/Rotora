import RotaFramework from "./rotaFramework.ts"

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
    public findDayCombination(rota: RotaFramework, day: number, i: number){

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

            console.log(newDayCombinations);

            // apply the ranking metric to all combinations

            // sort based on highest rank metric


            // 0 could be replaced for day here
            return this.weekCombinations[this.mapDay[day]][0]

        }

    }

    // resets a day combinations due to backtrack
    public resetDay(day: number){
        this.weekCombinations[ this.mapDay[day] ] = [];
    }


    private generateCombinations(
        shiftsAvailable: Object,
        keyholderAvailability: number[][],
        allAvailability: number[][],
        fullTimeEmployees: number[]
    ): Object[]{

        
        return [{}];

    }

    // method which adds the rank metric

    // method which sorts the array


}