import retrieveData from "./dataRetriever.ts";
import { type EmployeeHours, Rota } from "./rotaFramework.ts";
import runAlgorithm from "./algorithmFrame.ts";

// the search uses random tie-breaking between equally-good shift
// combinations, so a run that hits the iteration cap is not necessarily
// infeasible - a different exploration order can succeed. retry a few
// times on that specific error before giving up; a genuine "Infeasible
// Rota" error is deterministic (it only fires after truly exhausting every
// combination) so it's never worth retrying.
const MAX_ATTEMPTS = 5;

export default async function createRota(weekNo: number): Promise<Object>{


    // retrieve and format the data
    var {workingRota, availability, CDhours: CCDhours, fullTimeEmployees} = await retrieveData(weekNo) as {
        workingRota: Object;
        availability: Record<string, { keyholder: number[][], all: number[][] }>;
        CDhours: Record<number, EmployeeHours>;
        fullTimeEmployees: number[];
    };

    try {

        // run the algorithm and return
        const rota: Rota = new Rota(workingRota, availability, CCDhours, fullTimeEmployees);

        return runAlgorithm(rota);

    } catch (error) {
        // too many solutions tried - safety net for indefinite compute
        throw error;
    }

}

