/*
Retrieves a month of hints data for the logged in user for a particular publication.

Input: month and year from query params (formatted as MM-YYYY), userId from middleware, publicationId from query params
Output: Array of objects with the following properties:
- date: string (formatted as YYYY-MM-DD)
- hints: number
- hints_used: number
*/

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import CruziDao from 'cruzi-db';

const dao = new CruziDao();

function parseMonthYear(monthYear: string): { month: number; year: number } | null {
    const match = /^(\d{2})-(\d{4})$/.exec(monthYear);
    if (!match) {
        return null;
    }

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);

    if (month < 1 || month > 12 || Number.isNaN(year)) {
        return null;
    }

    return { month, year };
}

export async function getCrosswordCalendar(req: Request, res: Response) {
    try {
        const publicationId = req.query.publicationId as string | undefined;
        const monthYear = req.query.monthYear as string | undefined;

        if (!publicationId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'publicationId query parameter is required.' });
        }

        if (!monthYear) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'monthYear query parameter is required (format: MM-YYYY).' });
        }

        const parsed = parseMonthYear(monthYear);
        if (!parsed) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'monthYear must be formatted as MM-YYYY.' });
        }

        const userId = (req as any).userId as string | undefined;
        const calendar = await dao.getCrosswordCalendar(
            publicationId,
            parsed.month,
            parsed.year,
            userId
        );

        return res.status(StatusCodes.OK).json(calendar);
    } catch (error) {
        console.error('Error retrieving crossword calendar:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'An error occurred while retrieving the crossword calendar.',
        });
    }
}
