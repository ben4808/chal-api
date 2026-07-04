import { Entry, EntryTranslation, ExampleSentence, Sense } from 'cruzi-models';
import { displayTextToEntry, generateId, pickLocalizedText } from "./utils";
import CruziDao from "cruzi-db";

export function convertTranslationsToModel(translationsObj: any): Record<string, EntryTranslation> {
    if (!translationsObj || typeof translationsObj !== 'object') {
        return {};
    }

    const output: Record<string, EntryTranslation> = {};

    for (const lang of Object.keys(translationsObj)) {
        const translation = translationsObj[lang];
        const naturalTranslations = translation?.naturalTranslations || [];
        const colloquialTranslations = translation?.colloquialTranslations || [];

        output[lang] = {
            naturalTranslations: naturalTranslations.map((t: any) => ({
                entry: displayTextToEntry(t),
                lang,
                displayText: t,
            }) as Entry),
            colloquialTranslations: colloquialTranslations.map((t: any) => ({
                entry: displayTextToEntry(t),
                lang,
                displayText: t,
            }) as Entry),
        };
    }

    return output;
}

export function convertExampleSentencesToModel(exampleSentencesObj: any, senseId: string): ExampleSentence[] {
    if (!exampleSentencesObj || !Array.isArray(exampleSentencesObj)) {
        return [];
    }
    const output: ExampleSentence[] = [];

    for (const exampleSentenceData of exampleSentencesObj) {
        if (!exampleSentenceData || typeof exampleSentenceData !== "object") {
            continue;
        }
        const { source_ai, sourceAi, id: existingId, ...langFields } = exampleSentenceData as Record<string, unknown>;
        output.push({
            id: (existingId as string) || generateId(),
            senseId,
            translations: langFields as Record<string, string>,
            sourceAi: (sourceAi ?? source_ai) as string | undefined,
        });
    }

    return output;
}

export async function processSenses(entry: Entry, sensesData: any[], dao: CruziDao): Promise<void> {
    if (!sensesData || !Array.isArray(sensesData)) {
        return;
    }

    for (const inputSense of sensesData) {
        const senseId = inputSense.id || generateId();
        const sense: Sense = {
            id: senseId,
            entry,
            partOfSpeech: inputSense.partOfSpeech,
            frequency: inputSense.frequency,
            summary: pickLocalizedText(inputSense.summary),
            definition: pickLocalizedText(inputSense.definition),
            exampleSentences: convertExampleSentencesToModel(inputSense.exampleSentences, senseId),
            translations: convertTranslationsToModel(inputSense.translations),
            sourceAi: inputSense.sourceAi,
        };

        await dao.addOrUpdateSense(entry, sense);

        const entriesToAdd: Entry[] = [];
        if (sense.translations) {
            for (const langGroup of Object.keys(sense.translations)) {
                const translationGroup = sense.translations[langGroup];
                const translations = [
                    ...(translationGroup?.naturalTranslations || []),
                    ...(translationGroup?.colloquialTranslations || []),
                ];

                for (const translation of translations) {
                    entriesToAdd.push(translation as Entry);
                }
            }
            if (entriesToAdd.length > 0) {
                await dao.addOrUpdateEntries(entriesToAdd);
            }
        }
    }
}
