var workingRota = {
    '11':[1,2],
    '12':[3],
    '21':[1,2],
    '22':[3],
    '31':[],
    '32':[3],
};

var baseRota = {
    '11':[],
    '12':[3],
    '21':[],
    '22':[],
    '31':[],
    '32':[3],
};

workingRota = {...workingRota, 
...Object.fromEntries(Object.entries(baseRota).filter(
    ([key]) => Math.floor(Number(key) / 10) == 1
))
}

console.log(workingRota)