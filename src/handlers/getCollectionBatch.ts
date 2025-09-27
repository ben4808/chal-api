import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";

let dao = new CruziDao();

/*
Write an Express handler getCollectionBatch that queries a batch of clues from a collection. 

These clues will be tailored to the user's progress in the collection. Guidelines for how the batch is
selected are as follows:
- A batch of clues will be 20 clues or less. Another batch will be loaded dynamically when needed.
- If there are clues that the user has not yet seen, 13 of the 20 clues should be from the unseen
    clues. (Or more if there are fewer than 7 seen clues ready to be seen, or less if there are 
    fewer than 13 unseen clues.)
- Clues that have already been seen in the past 24 should not be seen again 
    unless every clue has been seen in the past 24 hours. If there are fewer than 20 clues that have
    not been seen in the past 24 hours then the batch will have less than 20 clues.
- The clues selected should be those with the earliest last solve date.
- Clues that have been "mastered" (correct solves equals correct solves needed) should not be seen
    again unless every clue has been mastered.
- The batch should be randomized before being returned.
- If no user is provided, the batch should be randomized from all clues in the collection.

It should accept a request with the following parameters:
- An optional user from the auth middleware.
- `id`: The ID of the clue collection from which to retrieve the batch.
It should return a JSON response with the list of clues.
- The response should adhere to the structure defined in the Clue interface.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCollectionBatch(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        const id = req.query.id as string;
        const batch = await dao.getCollectionBatch(userId, id);
        return res.status(StatusCodes.OK).json(batch);
    } catch (error) {
        console.error("Error retrieving collection batch:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the collection batch." });
    }
}
