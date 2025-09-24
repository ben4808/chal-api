import { Request, Response } from "express";
import CruziDao from "../daos/CruziDao";
import { StatusCodes } from 'http-status-codes';

let dao = new CruziDao();

/*
Write an Express request handler getCollectionList that retrieves a list of clue collections.
It should accept a JWT token for authentication.
- Private collections should be returned only if the user is authenticated and has access to them.
- If the user is not authenticated, only public collections should be returned.
It should return a JSON response with the list of clue collections.
- The response should adhere to the structure defined in the ClueCollection interface.
- The puzzle and clues fields will be null.
- The creator and progressData fields should be populated with the appropriate data.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCollectionList(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        const collections = await dao.getCollectionList(userId);

        // Ensure response adheres to ClueCollection interface expectations for this endpoint:
        // - puzzle and clues fields will be null in the response
        const normalized = (collections || []).map(c => ({
            ...c,
            puzzle: null,
            clues: null,
        }));

        return res.status(StatusCodes.OK).json(normalized);
    } catch (error) {
        console.error("Error retrieving crossword list:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the crossword list." });
    }
}
