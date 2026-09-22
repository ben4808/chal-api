import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import CruziDao from 'cruzi-db';

const dao = new CruziDao();

/*
Retrieves persisted UI settings for the logged-in user.
Creates no row when the user has never saved settings; defaults are returned instead.
*/

export async function getUserSettings(req: Request, res: Response) {
    try {
        const userId = (req as any).userId as string | undefined;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'User not authenticated' });
        }

        const settings = await dao.getUserSettings(userId);
        return res.status(StatusCodes.OK).json(settings);
    } catch (error) {
        console.error('Error retrieving user settings:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: 'An error occurred while retrieving user settings.',
        });
    }
}
