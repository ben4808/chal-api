import { Chal } from "../models/Chal";
import { Solve } from "../models/Solve";
import { sqlQuery } from "./postgres";

class PostgresDao {
    createChal = async (chal: Chal) => {
        await sqlQuery(true, "create_chal", [
            {name: "id", value: chal.id},
            {name: "creator", value: chal.creator},
            {name: "clue", value: chal.clue},
            {name: "answer", value: chal.answer},
        ]);

        return "Done.";
    }

    getChal = async (id: string) => {
        let results = await sqlQuery(true, "get_chal", [
            {name: "id", value: id},
        ]) as any[];

        if (results.length === 0) return undefined;
        let result = results[0];

        return {
            id: result.id,
            creator: result.creator,
            createdDate: new Date(result.created_date),
            clue: result.clue,
            answer: result.anser,
        } as Chal;
    }

    createSolve = async (solve: Solve) => {
        await sqlQuery(true, "create_solve", [
            {name: "id", value: solve.id},
            {name: "chal_id", value: solve.chalId},
            {name: "solver", value: solve.solver},
        ]);

        return "Done.";
    }
}

export default PostgresDao;
