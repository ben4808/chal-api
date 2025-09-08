import { Request, Response } from "express";
import PostgresDao from "../daos/PostgresDao";
import { StatusCodes } from 'http-status-codes';

let dao = new PostgresDao();

/*
Write an Express handler getCrossword that retrieves info about a specific crossword puzzle.
It should accept a request with the following parameters:
- `id`: The ID of the clue collection of the crossword puzzle to retrieve.
It should return a JSON response with the list of clues in the crossword clue collection.
- The response should adhere to the structure defined in the Clue interface.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function removeClueFromCollection(req: Request, res: Response) {
    try {
        const date = req.query.date ? new Date(req.query.date as string) : new Date();
        const crosswords = await dao.getCrosswordList(date);

        if (!crosswords || crosswords.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "No crosswords found for the specified date." });
        }

        return res.status(StatusCodes.OK).json(crosswords);
    } catch (error) {
        console.error("Error retrieving crossword list:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the crossword list." });
    }
}
