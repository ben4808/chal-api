import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    addGeneratedClues,
    getCrosswordeseAndAbbreviationEntries,
    getGeneratedCluesForEntries,
    getRandomSeedEntries,
} from 'cruzi-db';

interface GeneratedClueBody {
    entry?: string;
    clue?: string;
    isSeedword?: boolean;
    clueType?: string | null;
}

function asPositiveInt(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function getMagicPuzzleSeedEntries(req: Request, res: Response) {
    try {
        const length = asPositiveInt(req.body?.length, 0);
        if (length < 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'length must be an integer >= 3' });
        }
        const count = asPositiveInt(req.body?.count, 10);
        const familiarityBucket = String(req.body?.familiarityBucket || 'General Knowledge');
        const lang = String(req.body?.lang || 'en');

        const entries = await getRandomSeedEntries(length, familiarityBucket, count, lang);
        return res.status(StatusCodes.OK).json({ entries });
    } catch (error: any) {
        console.error('magic puzzle seed entries error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while loading seed entries.',
        });
    }
}

export async function getMagicPuzzleFillerEntries(req: Request, res: Response) {
    try {
        const minLength = asPositiveInt(req.body?.minLength, 3);
        const maxLength = asPositiveInt(req.body?.maxLength, 15);
        const lang = String(req.body?.lang || 'en');

        const entries = await getCrosswordeseAndAbbreviationEntries(minLength, maxLength, lang);
        return res.status(StatusCodes.OK).json({ entries });
    } catch (error: any) {
        console.error('magic puzzle filler entries error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while loading crosswordese / abbreviation entries.',
        });
    }
}

export async function getMagicPuzzleEntryClues(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        const entries: string[] = Array.isArray(req.body?.entries)
            ? req.body.entries.map((entry: unknown) => String(entry || '').trim()).filter(Boolean)
            : [];

        const results = await getGeneratedCluesForEntries(entries, lang);
        return res.status(StatusCodes.OK).json({ entries: results });
    } catch (error: any) {
        console.error('magic puzzle entry clues error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while loading generated clues.',
        });
    }
}

export async function saveMagicPuzzleGeneratedClues(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        const clues: GeneratedClueBody[] = Array.isArray(req.body?.clues) ? req.body.clues : [];
        const inputs = clues
            .filter((clue) => (clue.entry || '').trim() !== '' && (clue.clue || '').trim() !== '')
            .map((clue) => ({
                entry: String(clue.entry).trim(),
                lang,
                generatedClue: String(clue.clue).trim(),
                isSeedword: clue.isSeedword === true,
                clueType: clue.clueType ? String(clue.clueType).trim() : null,
            }));

        const saved = await addGeneratedClues(inputs);
        return res.status(StatusCodes.OK).json({ saved });
    } catch (error: any) {
        console.error('magic puzzle save clues error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while saving generated clues.',
        });
    }
}
