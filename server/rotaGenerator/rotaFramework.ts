export default class RotaFramework{

    private workingRota: Object;
    private availability: Record<string, { keyholder: number[][], all: number[][] }>;
    private CCDhours: Object;
    private fullTimeEmployees: number[];
    


    constructor(workingRota: Object, 
        availability: Record<string, { keyholder: number[][], all: number[][] }>,
        CCDhours: Object,
        fullTimeEmployees: number[]
    ){
        this.workingRota = workingRota;
        this.availability = availability;
        this.fullTimeEmployees = fullTimeEmployees;
        this.CCDhours = CCDhours;
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

    public getDayShift(day: number): Object{

        return Object.fromEntries( Object.entries(this.workingRota).filter(
            ([key]) => Math.floor( Number(key) / 10 ) == day
        ) )

    }

    public getKeyholderAvailability(day: string): number[][]{
        return this.availability[day]['keyholder'];
    }

    public getAllAvailability(day: string): number[][]{
        return this.availability[day]['all'];
    }

    public getFullTimeEmployees(){
        return this.fullTimeEmployees;
    }

    public getFinalRota(){
        return this.workingRota;
    }

}