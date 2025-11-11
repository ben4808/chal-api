import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";

let dao = new CruziDao();

/*
Batch Selection Logic:
The batch must be 20 clues or less and adhere to the following rules:

Clues that have been marked as "completed" (correct solves equals the solves needed) must be excluded.
Clues seen in the past 24 hours must be excluded (last solve date less than 24 hours ago).

If the previous two rules exclude all clues, OR there is no userId provided, simply return a random
  set of 20 clues from the collection.

Within eligible clues:
- Target Mix: Aim for 13 unseen clues and 7 seen clues.
  - Adjustment: If there are fewer than 13 unseen clues, fill the rest of the set with seen clues. 
    If there are fewer than 7 seen clues, fill the rest of the set with unseen clues. 
- Ordering: Eligible clues should be selected based on the earliest last solve date.
- Final Step: The final selected batch must be randomized before being returned.

Side Effects (only if a user is provided):
- Check the user__collection table for existing progress data. If no progress data is found for the 
  given user and collection, a new record must be created, initializing all clues as unseen.

It should accept a request with the following parameters:
- An optional user from the auth middleware.
- `collection_id`: The ID of the clue collection from which to retrieve the batch.
It should return a JSON response with the list of clues.
- The response should adhere to the structure defined in the Clue interface.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCollectionBatch(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        const collectionId = req.query.collection_id as string;
        
        // Side effect: Initialize user collection progress if user is provided and progress doesn't exist
        if (userId) {
            await dao.initializeUserCollectionProgress(userId, collectionId);
        }
        
        // Step 1: Select clue IDs for the batch
        const clueIds = await dao.selectCollectionBatch(userId, collectionId);
        
        // Step 2: Populate full clue data for the selected IDs
        const batch = await dao.populateCollectionBatch(clueIds, userId);
        
        return res.status(StatusCodes.OK).json(batch);
    } catch (error) {
        console.error("Error retrieving collection batch:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the collection batch." });
    }
}
