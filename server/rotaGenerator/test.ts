var workingRota = {
    '11':[1,2],
    '12':[3],
    '21':[1,2],
    '22':[3],
    '31':[2],
    '32':[3],
};

var baseRota = {
    '11':[null],
    '12':[3],
    '21':[null],
    '22':[null, null],
    '31':[null],
    '32':[3],
};


function backtrackShift(day: number){
        workingRota = {...workingRota, 
            ...Object.fromEntries(
                Object.entries(baseRota).filter(
                    ([key]) => key[0] == day.toString()
                )
            )
        }
    }

console.log(workingRota)
backtrackShift(2)
console.log(workingRota)