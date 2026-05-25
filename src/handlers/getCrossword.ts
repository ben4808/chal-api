import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "cruzi-db";

const dao = new CruziDao();

/*
Retrieves info about a specific crossword puzzle.
It should accept a request with the following parameters:
- `id`: The ID of the clue collection of the crossword puzzle to retrieve.
- `userId`: The ID of the user to retrieve the crossword puzzle for. (from middleware)
Returns a clue collection for the crossword populated with clues (CollectionClueWithProgress), and if
  there is a userId, progress data for the clues.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCrossword(req: Request, res: Response) {
    try {
        const id = req.query.id as string | undefined;
        const userId = (req as any).userId as string | undefined;

        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "id query parameter is required." });
        }

        const crossword = await dao.getCrossword(id, userId);

        if (!crossword) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Crossword not found or access denied.",
            });
        }

        return res.status(StatusCodes.OK).json(crossword);
    } catch (error) {
        console.error("Error retrieving crossword:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while retrieving the crossword.",
        });
    }
}
