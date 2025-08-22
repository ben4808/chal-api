import { Request, Response } from "express";
import PostgresDao from "../daos/PostgresDao";
import { StatusCodes } from 'http-status-codes';

let dao = new PostgresDao();

/*
Write an Express request handler getCollectionList that retrieves a list of clue collections.
It should accept a JWT token for authentication.
- Private collections should be returned only if the user is authenticated and has access to them.
It should return a JSON response with the list of clue collections.
- The response should adhere to the structure defined in the ClueCollection interface.
- The puzzle and clues fields will be null.
- The creator and progressData fields should be populated with the appropriate data.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCollectionList(req: Request, res: Response) {
    try {
        const user = req.user; // Assuming user is set by authentication middleware
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized access." });
        }
        const collections = await dao.getClueCollections();

        if (!collections || collections.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "No crosswords found for the specified date." });
        }

        const 

        return res.status(StatusCodes.OK).json(collections);
    } catch (error) {
        console.error("Error retrieving crossword list:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the crossword list." });
    }
}
