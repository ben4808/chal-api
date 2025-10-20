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
- The puzzle and clues fields will be undefined for this call.
- The creator and progressData fields should be populated with the appropriate data.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCollectionList(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        const collections = await dao.getCollectionList(userId);

        return res.status(StatusCodes.OK).json(collections);
    } catch (error) {
        console.error("Error retrieving crossword list:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the crossword list." });
    }
}
