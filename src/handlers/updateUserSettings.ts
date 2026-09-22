import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import CruziDao from 'cruzi-db';

const dao = new CruziDao();

/*
Updates persisted UI settings for the logged-in user.
Currently supports crosswordSolverMinigame (boolean).
*/

export async function updateUserSettings(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not authenticated' });
        }

        const { crosswordSolverMinigame } = req.body ?? {};
        if (typeof crosswordSolverMinigame !== 'boolean') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Invalid request body. Required field: crosswordSolverMinigame (boolean)',
            });
        }

        const settings = await dao.upsertUserSettings(userId, { crosswordSolverMinigame });
        return res.status(StatusCodes.OK).json(settings);
    } catch (error) {
        console.error('Error updating user settings:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: 'An error occurred while updating user settings.',
        });
    }
}
