import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    addEntryTags,
    addSenseTags,
    deleteEntryTags,
    deleteSenseTags,
    getEntriesForClassification,
    updateEntryClassifications,
    updateSenseClassifications,
} from 'cruzi-db';

const MANUAL_TAGS: Record<string, string> = {
    displayText: 'manual_display',
    classification: 'manual_classification',
    unityBucket: 'manual unity',
    familiarityBucket: 'manual familiarity',
    qualityBucket: 'manual quality',
};

const CROSSWORDESE_TAG = 'crosswordese';
const BREAKFAST_TAG = 'breakfast_test';
const SENSITIVE_TAG = 'sensitive';
const VULGAR_TAG = 'vulgar';

interface ClassifyRowInput {
    rowId?: string;
    fillWord?: string;
    entry?: string | null;
    lang?: string | null;
    displayText?: string | null;
    classification?: string | null;
    unityBucket?: string | null;
    familiarityBucket?: string | null;
    qualityBucket?: string | null;
    isVulgar?: boolean;
    isCrosswordese?: boolean;
    isBreakfast?: boolean;
    isReviewed?: boolean;
    isSensitive?: boolean;
    senseId?: string | null;
}

interface EntryTagChange {
    entry: string;
    lang: string;
    tag: string;
    value?: string;
}

interface SenseTagChange {
    senseId: string;
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

    pushIfChanged('displayText', original?.displayText, updated.displayText);
    pushIfChanged('classification', original?.classification, updated.classification);
    pushIfChanged('unityBucket', original?.unityBucket, updated.unityBucket);
    pushIfChanged('familiarityBucket', original?.familiarityBucket, updated.familiarityBucket);
    pushIfChanged('qualityBucket', original?.qualityBucket, updated.qualityBucket);

    return tags;
}

function collectSenseManualTags(
    original: ClassifyRowInput | undefined,
    updated: ClassifyRowInput,
): SenseTagChange[] {
    const tags: SenseTagChange[] = [];
    const senseId = (updated.senseId || '').trim();
    if (!senseId) return tags;

    const pushIfChanged = (field: string, originalValue: unknown, newValue: unknown) => {
        const oldText = textVal(originalValue);
        const newText = textVal(newValue);
        if (oldText !== newText) {
            tags.push({
                senseId,
                tag: MANUAL_TAGS[field],
                value: `${oldText} -> ${newText}`,
            });
        }
    };

    pushIfChanged('displayText', original?.displayText, updated.displayText);
    pushIfChanged('classification', original?.classification, updated.classification);
    pushIfChanged('unityBucket', original?.unityBucket, updated.unityBucket);
    pushIfChanged('familiarityBucket', original?.familiarityBucket, updated.familiarityBucket);
    pushIfChanged('qualityBucket', original?.qualityBucket, updated.qualityBucket);

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
    field: 'isCrosswordese' | 'isBreakfast' | 'isSensitive' | 'isVulgar',
    tag: string,
    adds: EntryTagChange[],
    deletes: EntryTagChange[],
) {
    if (!row.entry || !row.lang) return;
    const wasSet = original ? original[field] === true : false;
    const isSet = !!row[field];
    if (wasSet === isSet) return;
    if (isSet) adds.push(flagTag(row, tag));
    else deletes.push(flagTag(row, tag));
}

function applySenseFlagTagChange(
    original: ClassifyRowInput | undefined,
    row: ClassifyRowInput,
    field: 'isVulgar' | 'isSensitive',
    tag: string,
    adds: SenseTagChange[],
    deletes: SenseTagChange[],
) {
    const senseId = (row.senseId || '').trim();
    if (!senseId) return;
    const wasSet = original ? original[field] === true : false;
    const isSet = !!row[field];
    if (wasSet === isSet) return;
    if (isSet) adds.push({ senseId, tag });
    else deletes.push({ senseId, tag });
}

function classificationFieldsEqual(a: ClassifyRowInput | undefined, b: ClassifyRowInput): boolean {
    return textVal(a?.displayText) === textVal(b.displayText)
        && textVal(a?.classification) === textVal(b.classification)
        && textVal(a?.unityBucket) === textVal(b.unityBucket)
        && textVal(a?.familiarityBucket) === textVal(b.familiarityBucket)
        && textVal(a?.qualityBucket) === textVal(b.qualityBucket);
}

function parseClassifyItems(body: any): Array<{ fillWord: string; senseId?: string | null }> {
    if (Array.isArray(body?.items)) {
        return body.items
            .map((item: any) => ({
                fillWord: String(item?.fillWord || item?.fill_word || '').trim(),
                senseId: item?.senseId || item?.sense_id || null,
            }))
            .filter((item: { fillWord: string }) => item.fillWord !== '');
    }
    if (Array.isArray(body?.fillWords)) {
        return body.fillWords
            .map((word: unknown) => String(word || '').trim())
            .filter(Boolean)
            .map((fillWord: string) => ({ fillWord }));
    }
    return [];
}

export async function getClassifyEntries(req: Request, res: Response) {
    try {
        const entries = await getEntriesForClassification(parseClassifyItems(req.body));
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

        const entryUpdates = [];
        const tags: EntryTagChange[] = [];
        const flagAdds: EntryTagChange[] = [];
        const flagDeletes: EntryTagChange[] = [];
        const senseUpdates = [];
        const senseManualTags: SenseTagChange[] = [];
        const senseFlagAdds: SenseTagChange[] = [];
        const senseFlagDeletes: SenseTagChange[] = [];

        for (const row of rows) {
            const original = originalById.get(row.rowId || '')
                || originalById.get(row.fillWord || '');
            const senseId = (row.senseId || '').trim();

            if (row.entry && row.lang) {
                applyFlagTagChange(original, row, 'isCrosswordese', CROSSWORDESE_TAG, flagAdds, flagDeletes);
                applyFlagTagChange(original, row, 'isBreakfast', BREAKFAST_TAG, flagAdds, flagDeletes);
            }

            if (senseId) {
                if (!classificationFieldsEqual(original, row)) {
                    senseUpdates.push({
                        senseId,
                        displayText: row.displayText || null,
                        classification: row.classification || null,
                        unityBucket: row.unityBucket || null,
                        familiarityBucket: row.familiarityBucket || null,
                        qualityBucket: row.qualityBucket || null,
                    });
                    senseManualTags.push(...collectSenseManualTags(original, row));
                }
                applySenseFlagTagChange(original, row, 'isVulgar', VULGAR_TAG, senseFlagAdds, senseFlagDeletes);
                applySenseFlagTagChange(original, row, 'isSensitive', SENSITIVE_TAG, senseFlagAdds, senseFlagDeletes);
                continue;
            }

            if (!row.entry || !row.lang) continue;
            entryUpdates.push({
                entry: row.entry,
                lang: row.lang,
                baseForm: null,
                displayText: row.displayText || null,
                classification: row.classification || null,
                unityBucket: row.unityBucket || null,
                familiarityBucket: row.familiarityBucket || null,
                qualityBucket: row.qualityBucket || null,
                isVulgar: !!row.isVulgar,
                humanReviewed: !!row.isReviewed,
            });
            tags.push(...collectManualTags(original, row));
            applyFlagTagChange(original, row, 'isVulgar', VULGAR_TAG, flagAdds, flagDeletes);
            applyFlagTagChange(original, row, 'isSensitive', SENSITIVE_TAG, flagAdds, flagDeletes);
        }

        await updateEntryClassifications(entryUpdates);
        await addEntryTags([...tags, ...flagAdds]);
        await deleteEntryTags(flagDeletes);
        await updateSenseClassifications(senseUpdates);
        await addSenseTags([...senseManualTags, ...senseFlagAdds]);
        await deleteSenseTags(senseFlagDeletes);

        return res.status(StatusCodes.OK).json({
            updated: entryUpdates.length,
            senseUpdated: senseUpdates.length,
            tags: tags.length,
            flagAdds: flagAdds.length,
            flagDeletes: flagDeletes.length,
            senseTags: senseManualTags.length + senseFlagAdds.length,
        });
    } catch (error: any) {
        console.error('classify save error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: error?.message || 'An error occurred while saving entries.',
        });
    }
}
