class rotaFramework{

    private workingRota: Object;
    private keyholderAvailability: number[];
    private allAvailability: number[];
    private fullTimeEmployees: number[];
    private contractHours: Object;
    private currentHours: Object;
    private desiredHours: Object;

    constructor(shiftsAvailable: Object, 
        keyholderAvailability: number[], 
        allAvailability: number[],
        fullTimeEmployees: number[],
        contractHours: Object,
        desiredHours: Object
    ){
        this.workingRota = shiftsAvailable;
        this.keyholderAvailability = keyholderAvailability;
        this.allAvailability = allAvailability;
        this.fullTimeEmployees = fullTimeEmployees;
        this.contractHours = contractHours;
        this.currentHours = Object.entries(contractHours).map(e => null);
        this.desiredHours = desiredHours;
    }

    // returns true if the rota is now filled/ready
    public notComplete(): boolean{
        return ! Object.entries(this.workingRota).some(e => e == null);
    }

    // applies shift against employee combination to the current rota
    public applyShifts(shifts: Object){
        this.workingRota = {...this.workingRota, ...shifts};
    }

    // returns true if the rest of the working rota will be feasible with certain constraints
    // hueristic based on: 
    // - all employees will be able to get contract hours
    // - there are enough people to cover the rest of the days of the week
    public valid(day: number): boolean{


        // need to work on this
        return true;

    }



}