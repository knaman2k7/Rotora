import db from "../database/db.ts";
import retrieveData from "./dataRetriever.ts";
import RotaFramework from "./rotaFramework.ts";
import runAlgorithm from "./algorithmFrame.ts";


export default async function createRota(weekNo: number): Promise<Object>{


    // retrieve and format the data
    var {workingRota, availability, CCDhours: CCDhours, fullTimeEmployees} = await retrieveData(weekNo) as {
        workingRota: Object;
        availability: Record<string, { keyholder: number[][], all: number[][] }>;
        CCDhours: Object;
        fullTimeEmployees: number[];
    };


    // create the framework
    var Rota: RotaFramework = new RotaFramework(workingRota, availability, CCDhours, fullTimeEmployees)


    // run the algorithm
    const finalRota: Object = runAlgorithm(Rota);


    // return the rota
    return finalRota;


}

//console.log(createRota(5));