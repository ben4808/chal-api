import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "cruzi-db";

const dao = new CruziDao();

/*
Sets a crossword as completed for the user.

Inputs:
userId (from auth middleware)
collectionId (from request body)

Updates user__collection to set collection_completed to true.
*/

export async function completeCrossword(req: Request, res: Response) {
    try {
        const userId = (req as any).userId;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not authenticated' });
        }

        const { collectionId } = req.body;

        if (!collectionId || typeof collectionId !== 'string') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Invalid request body. Required field: collectionId (string)',
            });
        }

        await dao.completeCrossword(userId, collectionId);

        return res.status(StatusCodes.OK).json({ message: 'Crossword marked as completed successfully' });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Crossword collection not found')) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: 'Crossword collection not found' });
        }

        console.error('Error completing crossword:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: 'Internal server error',
        });
    }
}
