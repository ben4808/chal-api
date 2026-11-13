import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { searchExplorerEntries } from 'cruzi-db';

/** Keep letters, numbers, and periods. Periods match any letter or number. */
function entryPatternToRegex(raw: unknown): string | null {
    const cleaned = String(raw || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9.]/g, '');
    if (!cleaned) return null;
    let regex = '^';
    for (const ch of cleaned) {
        regex += ch === '.' ? '[A-Z0-9]' : ch;
    }
    return regex + '$';
}

function optionalPositiveInt(
    value: unknown,
    label: string,
    max?: number,
): { value: number | null } | { error: string } {
    if (value == null || String(value).trim() === '') return { value: null };
    const n = Number(String(value).trim());
    if (!Number.isInteger(n) || n < 1 || (max != null && n > max)) {
        const limit = max != null ? ` up to ${max}` : '';
        return { error: `${label} must be a positive whole number${limit}` };
    }
    return { value: n };
}

export async function getExplorerEntries(req: Request, res: Response) {
    try {
        const body = req.body || {};
        const length = optionalPositiveInt(body.length, 'Length');
        if ('error' in length) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: length.error });
        }
        const pageSize = optionalPositiveInt(
            body.pageSize == null || String(body.pageSize).trim() === '' ? 100 : body.pageSize,
            'Results per page',
            1000,
        );
        if ('error' in pageSize || pageSize.value == null) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'error' in pageSize ? pageSize.error : 'Results per page is required',
            });
        }
        const pageParsed = optionalPositiveInt(
            body.page == null || String(body.page).trim() === '' ? 1 : body.page,
            'Page',
        );
        if ('error' in pageParsed || pageParsed.value == null) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'error' in pageParsed ? pageParsed.error : 'Page is required',
            });
        }

        const reviewedRaw = body.humanReviewed == null ? 'both' : String(body.humanReviewed).trim().toLowerCase();
        let humanReviewed: boolean | null = null;
        if (reviewedRaw === 'yes') humanReviewed = true;
        else if (reviewedRaw === 'no') humanReviewed = false;
        else if (reviewedRaw !== 'both' && reviewedRaw !== '') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Human reviewed must be both, yes, or no',
            });
        }

        const familiarityBuckets = Array.isArray(body.familiarityBuckets)
            ? body.familiarityBuckets.map((bucket: unknown) => String(bucket).trim()).filter(Boolean)
            : [];

        const result = await searchExplorerEntries({
            length: length.value,
            pattern: entryPatternToRegex(body.pattern),
            familiarityBuckets,
            humanReviewed,
            limit: pageSize.value,
            offset: (pageParsed.value - 1) * pageSize.value,
        });

        return res.status(StatusCodes.OK).json({
            entries: result.entries.map((row) => ({
                entry: row.entry,
                displayText: row.displayText,
            })),
            total: result.total,
            page: pageParsed.value,
            pageSize: pageSize.value,
        });
    } catch (error: any) {
        console.error('explorer entries error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while searching entries.',
        });
    }
}
