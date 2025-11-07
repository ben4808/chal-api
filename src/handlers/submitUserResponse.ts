import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";

let dao = new CruziDao();

/*
Write an Express handler submitUserResponse that submits a user's response to a clue.

This call will update the progress data for the givern user and clue.

A correct response will increment the correct solves for the clue, 
    and a incorrect response will increment the incorrect solves for the clue.
    If the clue is already mastered, the correct solves will not be incremented.
Either way, the last solve date will be updated to the current date.
If the user response is incorrect, 2 will be added to the correct solves needed for the clue.
If no progress data is found for the clue, a record will be created with 2 correct solves needed
  if correct (one of which is fulfilled), and 4 correct solves needed if incorrect.

As a side effect, this call will update the progress data in user__collection. If a relevent record
does not exist, ignore this step.
- If this was the user's first submission for the clue, it will be deducted from unseen and
    added to in_progress.
- If in this submission the user has now mastered the clue, it will be deducted from in_progress
    and added to completed.

It should accept a request with the following parameters:
- A user id from the auth middleware.
- As a post body, collection_id, clue_id and isCorrect boolean.

The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function submitUserResponse(req: Request, res: Response) {
    try {
        // Get user ID from auth middleware
        const userId = (req as any).userId;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not authenticated' });
        }

        // Get request body
        const response = req.body;
        
        // Validate required fields
        if (!response.clueId || typeof response.isCorrect !== 'boolean' || !response.collectionId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                error: 'Invalid request body. Required fields: clueId (string), collectionId (string), isCorrect (boolean)' 
            });
        }

        // Set the userId from the authenticated user
        response.userId = userId;

        // Submit the user response
        await dao.submitUserResponse(userId, response);

        return res.status(StatusCodes.OK).json({ message: 'User response submitted successfully' });
    } catch (error) {
        console.error('Error submitting user response:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            error: 'Internal server error' 
        });
    }
}
