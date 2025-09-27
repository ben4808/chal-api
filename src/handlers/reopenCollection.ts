import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";

let dao = new CruziDao();

/*
Write an Express handler reopenCollection that reopens a collection of mastered clues.

The effect will be to increment the correctResponsesNeeded field by 1 on each mastered clue
    in the collection.

It should accept a request with the following parameters:
- A user id from the auth middleware.
- As a post body, a json object containing the collectionId

The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function reopenCollection(req: Request, res: Response) {
    try {
        // Extract user ID from auth middleware
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not authenticated' });
        }

        // Extract collectionId from request body
        const { collectionId } = req.body;
        if (!collectionId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Collection ID is required' });
        }

        // Call the DAO method to reopen the collection
        await dao.reopenCollection(userId, collectionId);

        return res.status(StatusCodes.OK).json({ message: 'Collection reopened successfully' });
    } catch (error) {
        console.error('Error reopening collection:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Failed to reopen collection' 
        });
    }
}
