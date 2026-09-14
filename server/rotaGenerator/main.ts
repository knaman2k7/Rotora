import retrieveData from "./dataRetriever.ts";
import { type EmployeeHours, RotaFramework } from "./rotaFramework.ts";
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

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){

        // fresh framework each attempt - CCDhours is mutated in place during
        // the search, so it must be deep-copied rather than reused
        const attemptCDhours: Record<number, EmployeeHours> = Object.fromEntries(
            Object.entries(CCDhours).map(([id, details]) => [id, { ...details }])
        );

        const Rota: RotaFramework = new RotaFramework(workingRota, availability, attemptCDhours, fullTimeEmployees);

        try {
            return runAlgorithm(Rota);
        } catch (error) {
            const isSearchStepLimit = error instanceof Error
                && error.message === "Rota generation exceeded the maximum number of search steps";

            if (!isSearchStepLimit || attempt === MAX_ATTEMPTS){
                throw error;
            }
        }

    }

    // unreachable - the loop always either returns or throws
    throw new Error("Rota generation exceeded the maximum number of search steps");

}

