import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
    addEntryTags,
    addSenseTags,
    deleteEntries,
    deleteEntryTags,
    deleteSenseTags,
    getEntriesForClassification,
    updateClueSenseMatches,
    updateEntryClassifications,
    updateSenseClassifications,
} from 'cruzi-db';

const MANUAL_TAGS: Record<string, string> = {
    baseForm: 'manual_base',
    displayText: 'manual_display',
    entryType: 'manual_classification',
    unityBucket: 'manual unity',
    familiarityBucket: 'manual familiarity',
    qualityBucket: 'manual quality',
    domain: 'manual_domain',
    isVulgar: 'manual_vulgar',
};

const CROSSWORDESE_TAG = 'crosswordese';
const BREAKFAST_TAG = 'breakfast_test';
const SENSITIVE_TAG = 'sensitive';
const REGIONALITY_TAG = 'regionality';
const VULGAR_TAG = 'vulgar';

interface ClassifySenseOptionInput {
    senseId?: string;
    summary?: string;
    displayText?: string;
    entryType?: string;
    unityBucket?: string;
    familiarityBucket?: string;
    qualityBucket?: string;
    domain?: string;
    regionality?: string;
    isVulgar?: boolean;
    isSensitive?: boolean;
}

interface ClassifyRowInput {
    rowId?: string;
    kind?: 'entry' | 'sense';
    fillWord?: string;
    entry?: string | null;
    lang?: string | null;
    baseForm?: string | null;
    displayText?: string | null;
    entryType?: string | null;
    unityBucket?: string | null;
    familiarityBucket?: string | null;
    qualityBucket?: string | null;
    domain?: string | null;
    regionality?: string | null;
    isVulgar?: boolean;
    isCrosswordese?: boolean;
    isBreakfast?: boolean;
    isSensitive?: boolean;
    senseId?: string | null;
    clueIds?: string[];
    senses?: ClassifySenseOptionInput[];
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

    pushIfChanged('baseForm', original?.baseForm, updated.baseForm);
    pushIfChanged('displayText', original?.displayText, updated.displayText);
    pushIfChanged('entryType', original?.entryType, updated.entryType);
    pushIfChanged('unityBucket', original?.unityBucket, updated.unityBucket);
    pushIfChanged('familiarityBucket', original?.familiarityBucket, updated.familiarityBucket);
    pushIfChanged('qualityBucket', original?.qualityBucket, updated.qualityBucket);
    pushIfChanged('domain', original?.domain, updated.domain);

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
    pushIfChanged('entryType', original?.entryType, updated.entryType);
    pushIfChanged('unityBucket', original?.unityBucket, updated.unityBucket);
    pushIfChanged('familiarityBucket', original?.familiarityBucket, updated.familiarityBucket);
    pushIfChanged('qualityBucket', original?.qualityBucket, updated.qualityBucket);
    pushIfChanged('domain', original?.domain, updated.domain);

    return tags;
}

function flagTag(row: ClassifyRowInput, tag: string, value?: string): EntryTagChange {
    return {
        entry: row.entry as string,
        lang: row.lang as string,
        tag,
        ...(value !== undefined ? { value } : {}),
    };
}

function applyFlagTagChange(
    original: ClassifyRowInput | undefined,
    row: ClassifyRowInput,
    field: 'isCrosswordese' | 'isBreakfast' | 'isSensitive',
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

function applyRegionalityChange(
    original: ClassifyRowInput | undefined,
    row: ClassifyRowInput,
    adds: EntryTagChange[],
    deletes: EntryTagChange[],
) {
    if (!row.entry || !row.lang) return;
    const oldValue = textVal(original?.regionality).trim();
    const newValue = textVal(row.regionality).trim();
    if (oldValue === newValue) return;
    if (newValue) adds.push(flagTag(row, REGIONALITY_TAG, newValue));
    else deletes.push(flagTag(row, REGIONALITY_TAG));
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

function applySenseRegionalityChange(
    original: ClassifyRowInput | undefined,
    row: ClassifyRowInput,
    adds: SenseTagChange[],
    deletes: SenseTagChange[],
) {
    const senseId = (row.senseId || '').trim();
    if (!senseId) return;
    const oldValue = textVal(original?.regionality).trim();
    const newValue = textVal(row.regionality).trim();
    if (oldValue === newValue) return;
    if (newValue) adds.push({ senseId, tag: REGIONALITY_TAG, value: newValue });
    else deletes.push({ senseId, tag: REGIONALITY_TAG });
}

function senseFieldsEqual(a: ClassifyRowInput | undefined, b: ClassifyRowInput): boolean {
    return textVal(a?.displayText) === textVal(b.displayText)
        && textVal(a?.entryType) === textVal(b.entryType)
        && textVal(a?.unityBucket) === textVal(b.unityBucket)
        && textVal(a?.familiarityBucket) === textVal(b.familiarityBucket)
        && textVal(a?.qualityBucket) === textVal(b.qualityBucket)
        && textVal(a?.domain) === textVal(b.domain)
        && textVal(a?.regionality) === textVal(b.regionality)
        && !!a?.isVulgar === !!b.isVulgar
        && !!a?.isSensitive === !!b.isSensitive;
}

function catalogOptionFor(row: ClassifyRowInput): ClassifySenseOptionInput | undefined {
    const senseId = (row.senseId || '').trim();
    if (!senseId || !Array.isArray(row.senses)) return undefined;
    return row.senses.find((sense) => (sense.senseId || '').trim() === senseId);
}

function catalogAsRow(option: ClassifySenseOptionInput | undefined): ClassifyRowInput | undefined {
    if (!option) return undefined;
    return {
        displayText: option.displayText,
        entryType: option.entryType,
        unityBucket: option.unityBucket,
        familiarityBucket: option.familiarityBucket,
        qualityBucket: option.qualityBucket,
        domain: option.domain,
        regionality: option.regionality,
        isVulgar: option.isVulgar === true,
        isSensitive: option.isSensitive === true,
    };
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
            originals.map((row) => [row.rowId || `${row.kind || 'entry'}:${row.fillWord}`, row]),
        );

        const entryUpdates = [];
        const tags: EntryTagChange[] = [];
        const flagAdds: EntryTagChange[] = [];
        const flagDeletes: EntryTagChange[] = [];
        const senseUpdates = [];
        const senseManualTags: SenseTagChange[] = [];
        const senseFlagAdds: SenseTagChange[] = [];
        const senseFlagDeletes: SenseTagChange[] = [];
        const clueSenseUpdates: { clueId: string; senseId: string | null; matchAttempted: boolean }[] = [];

        for (const row of rows) {
            const original = originalById.get(row.rowId || '')
                || originalById.get(`${row.kind || 'entry'}:${row.fillWord}`);

            if (row.kind === 'sense') {
                const nextSenseId = row.senseId ? String(row.senseId).trim() : '';
                const originalSenseId = original?.senseId ? String(original.senseId).trim() : '';
                const clueIds = Array.isArray(row.clueIds) ? row.clueIds.filter(Boolean) : [];

                if (nextSenseId !== originalSenseId) {
                    for (const clueId of clueIds) {
                        clueSenseUpdates.push({
                            clueId,
                            senseId: nextSenseId || null,
                            matchAttempted: true,
                        });
                    }
                }

                if (!nextSenseId) continue;

                const compareAgainst = nextSenseId === originalSenseId
                    ? original
                    : catalogAsRow(catalogOptionFor(row));
                if (senseFieldsEqual(compareAgainst, row)) continue;

                senseUpdates.push({
                    senseId: nextSenseId,
                    displayText: row.displayText || null,
                    classification: row.entryType || null,
                    unityBucket: row.unityBucket || null,
                    familiarityBucket: row.familiarityBucket || null,
                    qualityBucket: row.qualityBucket || null,
                    domain: row.domain || null,
                });
                senseManualTags.push(...collectSenseManualTags(compareAgainst, row));
                applySenseFlagTagChange(compareAgainst, row, 'isVulgar', VULGAR_TAG, senseFlagAdds, senseFlagDeletes);
                applySenseFlagTagChange(compareAgainst, row, 'isSensitive', SENSITIVE_TAG, senseFlagAdds, senseFlagDeletes);
                applySenseRegionalityChange(compareAgainst, row, senseFlagAdds, senseFlagDeletes);
                continue;
            }

            if (!row.entry || !row.lang) continue;
            entryUpdates.push({
                entry: row.entry,
                lang: row.lang,
                baseForm: row.baseForm || null,
                displayText: row.displayText || null,
                entryType: row.entryType || null,
                unityBucket: row.unityBucket || null,
                familiarityBucket: row.familiarityBucket || null,
                qualityBucket: row.qualityBucket || null,
                domain: row.domain || null,
                isVulgar: !!row.isVulgar,
            });
            tags.push(...collectManualTags(original, row));
            applyFlagTagChange(original, row, 'isCrosswordese', CROSSWORDESE_TAG, flagAdds, flagDeletes);
            applyFlagTagChange(original, row, 'isBreakfast', BREAKFAST_TAG, flagAdds, flagDeletes);
            applyFlagTagChange(original, row, 'isSensitive', SENSITIVE_TAG, flagAdds, flagDeletes);
            applyRegionalityChange(original, row, flagAdds, flagDeletes);
        }

        await updateEntryClassifications(entryUpdates);
        await addEntryTags([...tags, ...flagAdds]);
        await deleteEntryTags(flagDeletes);
        await updateSenseClassifications(senseUpdates);
        await addSenseTags([...senseManualTags, ...senseFlagAdds]);
        await deleteSenseTags(senseFlagDeletes);
        await updateClueSenseMatches(clueSenseUpdates);

        return res.status(StatusCodes.OK).json({
            updated: entryUpdates.length,
            senseUpdated: senseUpdates.length,
            clueSenseUpdated: clueSenseUpdates.length,
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
