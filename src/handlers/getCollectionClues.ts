/*
Write an Express handler getCollectionClues that queries a list of clue information according to 
various sort/filter paramters. 

Columns to be returned:
- Answer : The display_text of the Entry referenced by the clue. If there is a custom_display_text 
   on the clue, it is used instead.
   - This column is sortable alphabetically forward and backward.
- Sense : The summary of the referenced Sense for the entry in the language of the Entry (from the
   sense_translation table, Sense.summary field) or English as a backup.
   - "N/A" if no Sense is referenced.
- Clue : The custom_clue of the clue. "N/A" if no custom_clue is set.
- Progress : Based on the progress of the user one of these:
   - "Unseen" if there is no progress data for the clue, or there is no logged in user.
   - "Completed" if the correct solves >= the solves needed.
   - "In Progress" otherwise, return the number of correct solves and the solves needed.
   - This column is sortable. In sorting, Completed clues come first (sorted alphabetically),
      followed by In Progress clues (sorted by the number of solves needed descending), followed
	  by "Unseen" clues (sorted alphabetically).
   - This column is filterable by the 3 major categories.
- Status : One of (Ready, Processing, Invalid), based on the loading status of the Entry 
   referenced by the clue. "Ready" if there is no loading status provided.
   - This column is filterable.
   
Additionally, the handler should accept a page number and return paginated results of 100 results
per page.
By default the results should be sorted by Answer alphabetically and have no filters applied.

It should return a JSON response with the information requested.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";

let dao = new CruziDao();

export async function getCollectionClues(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        const collectionId = req.query.collection_id as string;
        
        if (!collectionId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                message: "collection_id is required" 
            });
        }

        const sortBy = req.query.sort_by as string | undefined;
        const sortDirection = req.query.sort_direction as string | undefined;
        const progressFilter = req.query.progress_filter as string | undefined;
        const statusFilter = req.query.status_filter as string | undefined;
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

        const clues = await dao.getCollectionClues(
            collectionId,
            userId,
            sortBy,
            sortDirection,
            progressFilter,
            statusFilter,
            page
        );

        return res.status(StatusCodes.OK).json(clues);
    } catch (error) {
        console.error("Error retrieving collection clues:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            message: "An error occurred while retrieving the collection clues." 
        });
    }
}
