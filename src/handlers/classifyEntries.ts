import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    addEntryTags,
    deleteEntries,
    deleteEntryTags,
    getEntriesForClassification,
    updateEntryClassifications,
} from 'cruzi-db';

const MANUAL_TAGS: Record<string, string> = {
    baseForm: 'manual_base',
    displayText: 'manual_display',
    entryType: 'manual_classification',
    unityBucket: 'manual unity',
    familiarityBucket: 'manual familiarity',
    qualityBucket: 'manual quality',
    isVulgar: 'manual_vulgar',
};

const CROSSWORDESE_TAG = 'crosswordese';
const BREAKFAST_TAG = 'breakfast_test';

interface ClassifyRowInput {
    rowId?: string;
    fillWord?: string;
    entry?: string | null;
    lang?: string | null;
    baseForm?: string | null;
    displayText?: string | null;
    entryType?: string | null;
    unityBucket?: string | null;
    familiarityBucket?: string | null;
    qualityBucket?: string | null;
    isVulgar?: boolean;
    isCrosswordese?: boolean;
    isBreakfast?: boolean;
}

interface EntryTagChange {
    entry: string;
    lang: string;
    tag: string;
    value?: string;
}

function textVal(value: unknown): string {
    return value == null ? '' : String(value);
}

function collectManualTags(original: ClassifyRowInput | undefined, updated: ClassifyRowInput): EntryTagChange[] {
    const tags: EntryTagChange[] = [];
    if (!updated.entry || !updated.lang) return tags;

    const pushIfChanged = (field: string, originalValue: unknown, newValue: unknown) => {
        const oldText = textVal(originalValue);
        const newText = textVal(newValue);
        if (oldText !== newText) {
            tags.push({
                entry: updated.entry as string,
                lang: updated.lang as string,
                tag: MANUAL_TAGS[field],
                value: `${oldText} -> ${newText}`,
            });
        }
    };

    pushIfChanged('baseForm', original?.baseForm, updated.baseForm);
    pushIfChanged('displayText', original?.displayText, updated.displayText);
    pushIfChanged('entryType', original?.entryType, updated.entryType);
    pushIfChanged('unityBucket', original?.unityBucket, updated.unityBucket);
    pushIfChanged('familiarityBucket', original?.familiarityBucket, updated.familiarityBucket);
    pushIfChanged('qualityBucket', original?.qualityBucket, updated.qualityBucket);

    const originalVulgar = original?.isVulgar === true;
    const updatedVulgar = !!updated.isVulgar;
    if (originalVulgar !== updatedVulgar) {
        tags.push({
            entry: updated.entry,
            lang: updated.lang,
            tag: MANUAL_TAGS.isVulgar,
            value: `${originalVulgar} -> ${updatedVulgar}`,
        });
    }

    return tags;
}

function flagTag(row: ClassifyRowInput, tag: string): EntryTagChange {
    return {
        entry: row.entry as string,
        lang: row.lang as string,
        tag,
    };
}

function applyFlagTagChange(
    original: ClassifyRowInput | undefined,
    row: ClassifyRowInput,
    field: 'isCrosswordese' | 'isBreakfast',
    tag: string,
    adds: EntryTagChange[],
    deletes: EntryTagChange[],
) {
    const wasSet = original ? original[field] === true : false;
    const isSet = !!row[field];
    if (wasSet === isSet) return;
    if (isSet) adds.push(flagTag(row, tag));
    else deletes.push(flagTag(row, tag));
}

export async function getClassifyEntries(req: Request, res: Response) {
    try {
        const fillWords = Array.isArray(req.body?.fillWords) ? req.body.fillWords : [];
        const entries = await getEntriesForClassification(fillWords);
        return res.status(StatusCodes.OK).json({ entries });
    } catch (error: any) {
        console.error('classify entries error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while loading entries.',
        });
    }
}

export async function saveClassifyEntries(req: Request, res: Response) {
    try {
        const originals: ClassifyRowInput[] = Array.isArray(req.body?.originals) ? req.body.originals : [];
        const rows: ClassifyRowInput[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
        const originalById = new Map(
            originals.map((row) => [row.rowId || row.fillWord, row]),
        );

        const updates = [];
        const tags: EntryTagChange[] = [];
        const flagAdds: EntryTagChange[] = [];
        const flagDeletes: EntryTagChange[] = [];

        for (const row of rows) {
            if (!row.entry || !row.lang) continue;
            const original = originalById.get(row.rowId) || originalById.get(row.fillWord);
            updates.push({
                entry: row.entry,
                lang: row.lang,
                baseForm: row.baseForm || null,
                displayText: row.displayText || null,
                entryType: row.entryType || null,
                unityBucket: row.unityBucket || null,
                familiarityBucket: row.familiarityBucket || null,
                qualityBucket: row.qualityBucket || null,
                isVulgar: !!row.isVulgar,
            });
            tags.push(...collectManualTags(original, row));
            applyFlagTagChange(original, row, 'isCrosswordese', CROSSWORDESE_TAG, flagAdds, flagDeletes);
            applyFlagTagChange(original, row, 'isBreakfast', BREAKFAST_TAG, flagAdds, flagDeletes);
        }

        await updateEntryClassifications(updates);
        await addEntryTags([...tags, ...flagAdds]);
        await deleteEntryTags(flagDeletes);

        return res.status(StatusCodes.OK).json({
            updated: updates.length,
            tags: tags.length,
            flagAdds: flagAdds.length,
            flagDeletes: flagDeletes.length,
        });
    } catch (error: any) {
        console.error('classify save error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while saving entries.',
        });
    }
}

export async function deleteClassifyEntry(req: Request, res: Response) {
    try {
        const entry = req.body?.entry ? String(req.body.entry).trim() : '';
        const lang = req.body?.lang ? String(req.body.lang).trim() : 'en';
        if (!entry) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Entry is required' });
        }
        const deleted = await deleteEntries([{ entry, lang }]);
        return res.status(StatusCodes.OK).json({ deleted });
    } catch (error: any) {
        console.error('classify delete error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while deleting the entry.',
        });
    }
}
