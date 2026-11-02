import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    addGeneratedClues,
    deleteGeneratedClue,
    getCommunityCluesForEntries,
    getCrosswordeseAndAbbreviationEntries,
    getGeneratedCluesForEntries,
    getRandomSeedEntries,
    ensureSeedEntry,
    getMagicPuzzle,
    incrementDontUseTags,
    saveMagicPuzzle,
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

/** Same letter key the Magic Crossword grid places: accents folded, A-Z only. */
function normalizeSeed(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
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

export async function ensureMagicPuzzleSeedEntry(req: Request, res: Response) {
    try {
        const displayText = typeof req.body?.displayText === 'string' ? req.body.displayText : '';
        const entry = normalizeSeed(displayText);
        const lang = String(req.body?.lang || 'en');
        if (entry.length < 3 || entry.length > 7) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'seed answer must be 3-7 letters' });
        }

        const created = await ensureSeedEntry(displayText, entry, lang);
        return res.status(StatusCodes.OK).json({ created });
    } catch (error: any) {
        console.error('magic puzzle ensure seed entry error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while saving the seed answer.',
        });
    }
}

export async function saveMagicPuzzleDontUse(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        const entries: string[] = Array.isArray(req.body?.entries)
            ? req.body.entries.map((entry: unknown) => String(entry || '').trim()).filter(Boolean)
            : [];

        const updated = await incrementDontUseTags(entries, lang);
        return res.status(StatusCodes.OK).json({ updated });
    } catch (error: any) {
        console.error('magic puzzle dont-use error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while saving don\'t-use entries.',
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

export async function deleteMagicPuzzleGeneratedClue(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        const entry = String(req.body?.entry || '').trim();
        const clue = String(req.body?.clue || '').trim();
        if (!entry || !clue) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'entry and clue are required' });
        }

        const deleted = await deleteGeneratedClue(entry, clue, lang);
        return res.status(StatusCodes.OK).json({ deleted });
    } catch (error: any) {
        console.error('magic puzzle delete clue error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while deleting the generated clue.',
        });
    }
}

export async function getMagicPuzzleCommunityClues(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        const entries: string[] = Array.isArray(req.body?.entries)
            ? req.body.entries.map((entry: unknown) => String(entry || '').trim()).filter(Boolean)
            : [];

        const results = await getCommunityCluesForEntries(entries, lang);
        return res.status(StatusCodes.OK).json({ entries: results });
    } catch (error: any) {
        console.error('magic puzzle community clues error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while loading community clues.',
        });
    }
}

interface FinishClueBody {
    entry?: string;
    clue?: string;
    order?: number;
    metadata1?: string;
}

interface FinishCommunityClueBody {
    entry?: string;
    clue?: string;
}

export async function getMagicPuzzleById(req: Request, res: Response) {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'id is required' });
        }
        const puzzle = await getMagicPuzzle(id);
        if (!puzzle) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: 'Puzzle not found' });
        }
        return res.status(StatusCodes.OK).json(puzzle);
    } catch (error: any) {
        console.error('magic puzzle load error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while loading the magic puzzle.',
        });
    }
}

export async function saveMagicPuzzleFinish(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        const width = Number(req.body?.width);
        const height = Number(req.body?.height);
        const seedAnswer = String(req.body?.seedAnswer || '').trim();
        const clues: FinishClueBody[] = Array.isArray(req.body?.clues) ? req.body.clues : [];
        const communityClues: FinishCommunityClueBody[] = Array.isArray(req.body?.communityClues)
            ? req.body.communityClues
            : [];

        if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'width and height must be positive integers' });
        }
        if (!seedAnswer) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'seedAnswer is required' });
        }

        const clueInputs = clues
            .filter((clue) => (clue.entry || '').trim() !== '' && (clue.clue || '').trim() !== '')
            .map((clue, index) => ({
                entry: String(clue.entry).trim(),
                clue: String(clue.clue).trim(),
                order: Number.isInteger(clue.order) ? Number(clue.order) : index,
                metadata1: String(clue.metadata1 || '').trim(),
            }));
        if (clueInputs.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'clues are required' });
        }

        const saved = await saveMagicPuzzle({
            id: typeof req.body?.id === 'string' ? req.body.id : undefined,
            lang,
            width,
            height,
            seedAnswer,
            title: req.body?.title ? String(req.body.title) : undefined,
            source: req.body?.source ? String(req.body.source) : undefined,
            grid: req.body?.grid ? String(req.body.grid) : undefined,
            clues: clueInputs,
            communityClues: communityClues
                .filter((clue) => (clue.entry || '').trim() !== '' && (clue.clue || '').trim() !== '')
                .map((clue) => ({
                    entry: String(clue.entry).trim(),
                    lang,
                    clue: String(clue.clue).trim(),
                })),
        });
        return res.status(StatusCodes.OK).json(saved);
    } catch (error: any) {
        console.error('magic puzzle finish error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while saving the magic puzzle.',
        });
    }
}
