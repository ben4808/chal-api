import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "cruzi-db";
import { Publications } from "cruzi-models";

const dao = new CruziDao();

function parseCrosswordDateParam(dateParam: string): Date | null {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);
    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
        return null;
    }

    const usDashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateParam);
    if (usDashMatch) {
        const month = parseInt(usDashMatch[1], 10) - 1;
        const day = parseInt(usDashMatch[2], 10);
        const year = parseInt(usDashMatch[3], 10);
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
        return null;
    }

    const slashParts = dateParam.split('/');
    if (slashParts.length === 3) {
        const month = parseInt(slashParts[0], 10) - 1;
        const day = parseInt(slashParts[1], 10);
        const year = parseInt(slashParts[2], 10);
        if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) {
            return null;
        }
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
    }

    return null;
}

function resolvePublicationId(publicationId: string): string | null {
    const normalized = publicationId.toLowerCase();
    for (const publication of Object.values(Publications)) {
        if (publication.id.toLowerCase() === normalized) {
            return publication.id;
        }
    }
    return null;
}

/*
Retrieves info about a specific crossword puzzle.
Accepts either:
- `id`: The clue collection ID of the crossword to retrieve.
- `publicationId` and `date`: Look up the crossword by publication and puzzle date.
Optional `userId` from auth middleware for progress data.
*/

export async function getCrossword(req: Request, res: Response) {
    try {
        const id = req.query.id as string | undefined;
        const publicationId = req.query.publicationId as string | undefined;
        const dateParam = req.query.date as string | undefined;
        const userId = (req as any).userId as string | undefined;

        let collectionId = id;

        if (!collectionId) {
            if (!publicationId || !dateParam) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Provide either id, or both publicationId and date query parameters.",
                });
            }

            const date = parseCrosswordDateParam(dateParam);
            if (!date) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "date must be formatted as YYYY-MM-DD, MM-DD-YYYY, or MM/DD/YYYY.",
                });
            }

            const resolvedPublicationId = resolvePublicationId(publicationId);
            if (!resolvedPublicationId) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Unknown publicationId.",
                });
            }

            collectionId = await dao.getCrosswordCollectionId(resolvedPublicationId, date) ?? undefined;
            if (!collectionId) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    message: "Crossword not found for the specified publication and date.",
                });
            }
        }

        const crossword = await dao.getCrossword(collectionId, userId);

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
