import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "cruzi-db";

let dao = new CruziDao();

/*
Retrieves a list of crossword puzzles for a given date, optionally with progress data for the logged in user.
Accepts a date parameter.
Also accepts a userId parameter from middleware if a user is logged in.

Returns a JSON response with the list of crosswords as ClueCollection objects.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCrosswordList(req: Request, res: Response) {
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
