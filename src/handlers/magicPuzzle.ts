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

function shuffleInPlace<T>(items: T[]): void {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
}

/**
 * A fixed number of random entries from each familiarity bucket, kept in quota order.
 * Length is a range (for example 5-7): each length is queried, then the bucket's quota
 * is drawn from that pool.
 */
async function seedEntriesForQuotas(req: Request, lang: string) {
    const minLength = asPositiveInt(req.body?.minLength, 0);
    const maxLength = asPositiveInt(req.body?.maxLength, 0);
    if (minLength < 3 || maxLength < minLength || maxLength > 15) {
        return { error: 'minLength and maxLength must be integers from 3 to 15, with minLength <= maxLength' };
    }
    const quotas: { familiarityBucket?: unknown; count?: unknown }[] = req.body?.quotas;
    if (!Array.isArray(quotas) || quotas.length === 0) {
        return { error: 'quotas must include at least one bucket' };
    }

    const exclude = new Set<string>(
        (Array.isArray(req.body?.excludeEntries) ? req.body.excludeEntries : [])
            .map((entry: unknown) => normalizeSeed(String(entry || '')))
            .filter(Boolean),
    );
    const lengths: number[] = [];
    for (let length = minLength; length <= maxLength; length++) lengths.push(length);

    const chosen: Awaited<ReturnType<typeof getRandomSeedEntries>> = [];
    for (const quota of quotas) {
        const bucket = String(quota?.familiarityBucket || '').trim();
        const count = asPositiveInt(quota?.count, 0);
        if (!bucket || count < 1) {
            return { error: 'each quota needs a familiarityBucket and a positive count' };
        }
        const fetchCount = Math.min(50, count + exclude.size);
        const pools = await Promise.all(
            lengths.map((length) => getRandomSeedEntries(length, bucket, fetchCount, lang, false)),
        );
        const seen = new Set<string>();
        const pool = pools.flat().filter((entry) => {
            if (exclude.has(entry.entry) || seen.has(entry.entry)) return false;
            seen.add(entry.entry);
            return true;
        });
        shuffleInPlace(pool);
        for (const entry of pool.slice(0, count)) {
            exclude.add(entry.entry);
            chosen.push(entry);
        }
    }
    return { entries: chosen };
}

export async function getMagicPuzzleSeedEntries(req: Request, res: Response) {
    try {
        const lang = String(req.body?.lang || 'en');
        if (Array.isArray(req.body?.quotas)) {
            const result = await seedEntriesForQuotas(req, lang);
            if ('error' in result) {
                return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
            }
            return res.status(StatusCodes.OK).json({ entries: result.entries });
        }

        const length = asPositiveInt(req.body?.length, 0);
        if (length < 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'length must be an integer >= 3' });
        }
        const count = asPositiveInt(req.body?.count, 10);
        const requestedBuckets: string[] = Array.isArray(req.body?.familiarityBuckets)
            ? req.body.familiarityBuckets.map((bucket: unknown) => String(bucket || '').trim()).filter(Boolean)
            : [];
        const familiarityBuckets = requestedBuckets.length > 0
            ? Array.from(new Set(requestedBuckets))
            : [String(req.body?.familiarityBucket || 'General Knowledge')];

        // Take up to `count` random entries from every bucket, then keep a random `count` of
        // the pool, so the buckets are mixed with no fixed proportion.
        const excludeSeedwordClues = req.body?.excludeSeedwordClues === true;
        const pools = await Promise.all(
            familiarityBuckets.map((bucket) =>
                getRandomSeedEntries(length, bucket, count, lang, excludeSeedwordClues),
            ),
        );
        const seen = new Set<string>();
        const pool = pools.flat().filter((entry) => {
            if (seen.has(entry.entry)) return false;
            seen.add(entry.entry);
            return true;
        });
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return res.status(StatusCodes.OK).json({ entries: pool.slice(0, count) });
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
