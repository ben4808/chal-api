import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "cruzi-db";

const dao = new CruziDao();

/*
Input: clueId (post body), userId (from middleware), hintsUsed (post body)

Updates user__puzzle_clue table with the number of hints used for the given clue.

Handles errors gracefully and returns appropriate HTTP status codes.
*/

export async function submitCrosswordResponse(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not authenticated' });
        }

        const { clueId, hintsUsed } = req.body;

        if (!clueId || typeof clueId !== 'string') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Invalid request body. Required field: clueId (string)',
            });
        }

        if (typeof hintsUsed !== 'number' || !Number.isInteger(hintsUsed) || hintsUsed < 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Invalid request body. Required field: hintsUsed (non-negative integer)',
            });
        }

        await dao.submitCrosswordResponse(userId, { clueId, hintsUsed });

        return res.status(StatusCodes.OK).json({ message: 'Crossword response submitted successfully' });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Crossword clue not found')) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: 'Crossword clue not found' });
        }

        console.error('Error submitting crossword response:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: 'Internal server error',
        });
    }
}
