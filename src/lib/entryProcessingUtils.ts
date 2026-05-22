import { Entry, EntryTranslation, ExampleSentence, Sense } from 'cruzi-models';
import { convertObjectToMap, displayTextToEntry, generateId, mapKeys, pickLocalizedText } from "./utils";
import CruziDao from "../daos/CruziDao";

export function convertTranslationsToModel(translationsObj: any): Map<string, EntryTranslation> {
    let translationsMap = convertObjectToMap(translationsObj);
    let output = new Map<string, EntryTranslation>();

    for (const lang of mapKeys(translationsMap)) {
        let naturalTranslations = translationsMap.get(lang)?.naturalTranslations || [];
        let colloquialTranslations = translationsMap.get(lang)?.colloquialTranslations || [];

        output.set(lang, {
            naturalTranslations: naturalTranslations.map((t: any) => ({
                entry: displayTextToEntry(t),
                lang: lang,
                displayText: t
            }) as Entry),
            colloquialTranslations: colloquialTranslations.map((t: any) => ({
                entry: displayTextToEntry(t),
                lang: lang,
                displayText: t
            }) as Entry),
        } as EntryTranslation);
    }

    return output;
}

export function convertExampleSentencesToModel(exampleSentencesObj: any, senseId: string): ExampleSentence[] {
    if (!exampleSentencesObj || !Array.isArray(exampleSentencesObj)) {
        return [];
    }
    let output: ExampleSentence[] = [];

    for (const exampleSentenceData of exampleSentencesObj) {
        if (!exampleSentenceData || typeof exampleSentenceData !== "object") {
            continue;
        }
        const { source_ai, id: existingId, ...langFields } = exampleSentenceData as Record<string, unknown>;
        let exampleSentence: ExampleSentence = {
            id: (existingId as string) || generateId(),
            senseId: senseId,
            translations: convertObjectToMap(langFields),
            source_ai: source_ai as string | undefined,
        };
        output.push(exampleSentence);
    }

    return output;
}

export async function processSenses(entry: Entry, sensesData: any[], dao: CruziDao): Promise<void> {
    if (!sensesData || !Array.isArray(sensesData)) {
        return;
    }

    for (const inputSense of sensesData) {
        let senseId = inputSense.id || generateId();
        let sense = {
            id: senseId,
            entry,
            partOfSpeech: inputSense.partOfSpeech,
            commonness: inputSense.commonness,
            summary: pickLocalizedText(inputSense.summary),
            definition: pickLocalizedText(inputSense.definition),
            exampleSentences: convertExampleSentencesToModel(inputSense.exampleSentences, senseId),
            translations: convertTranslationsToModel(inputSense.translations),
            sourceAi: inputSense.sourceAi,
        } as Sense;

        await dao.addOrUpdateSense(entry, sense);

        // Add entries for all translations of the entry
        let entriesToAdd: Entry[] = [];
        if (sense.translations) {
            for (const langGroup of mapKeys(sense.translations)) {
                let translations = [
                    sense.translations.get(langGroup)?.naturalTranslations,
                    sense.translations.get(langGroup)?.colloquialTranslations,
                ].flat().filter(t => t !== undefined);

                for (const translation of translations) {
                    entriesToAdd.push(translation);
                }
            }
            if (entriesToAdd.length > 0) {
                await dao.addOrUpdateEntries(entriesToAdd);
            }
        }
    }
}
