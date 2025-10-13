import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";
import { Entry } from "../models/Entry";
import { Sense } from "../models/Sense";
import { Clue } from "../models/Clue";
import { convertObjectToMap, displayTextToEntry, generateId, mapKeys } from "../lib/utils";
import { EntryTranslation } from "../models/EntryTranslation";
import { ExampleSentence } from "../models/ExampleSentence";

let dao = new CruziDao();

/*
Write an Express handler addClueToCollection that creates clues and/or adds clues to a specified collection.
It should accept a request with the following parameters:
- `id`: The ID of the clue collection to add the clue to (as a URL parameter).
- The clue information to add (JSON in the request body).
The clue information can include any of the following:
- entry object (if no clue object is provided, the example sentences of the entry will be used as the clue text)
- clue object (if provided, this will be used as the clue text instead of the entry's example sentences)
- sesnses (if provided, will be added to the entry)
Any provided data that doesn't exist should be created.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function addCluesToCollection(req: Request, res: Response) {
    try {
        const collectionId = req.query.id as string;
        const clues = req.body;
        if (!collectionId || !clues || !Array.isArray(clues) || clues.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Collection ID and clue data are required." });
        }

        for (const clue of clues) {
            let entry = {
              entry: clue.entry.entry,
              lang: clue.entry.lang,
              rootEntry: clue.entry.rootEntry,
              displayText: clue.entry.displayText,
              entryType: clue.entry.entryType,
            } as Entry;

            await dao.addOrUpdateEntries([entry]);

            if (clue.senses && Array.isArray(clue.senses)) {
              for (const inputSense of clue.senses) {
                let senseId = generateId();
                let sense = {
                  id: senseId,
                  partOfSpeech: inputSense.partOfSpeech,
                  commonness: inputSense.commonness,
                  summary: convertObjectToMap(inputSense.summary),
                  definition: convertObjectToMap(inputSense.definition),
                  exampleSentences: convertExampleSentencesToModel(inputSense.exampleSentences, senseId),
                  translations: convertTranslationsToModel(inputSense.translations),
                  sourceAi: inputSense.sourceAi,
                } as Sense;

                await dao.addOrUpdateSense(entry, sense);

                // add entries for all translations of the entry
                let entriesToAdd: Entry[] = [];
                if (sense.translations) {
                  for (const langGroup of mapKeys(sense.translations)) {
                    let translations = [
                      sense.translations.get(langGroup)?.naturalTranslations,
                      sense.translations.get(langGroup)?.colloquialTranslations,
                      sense.translations.get(langGroup)?.alternatives,
                    ].flat().filter(t => t !== undefined);

                    for (const translation of translations) {
                      entriesToAdd.push(translation);
                    }
                  }
                  await dao.addOrUpdateEntries(entriesToAdd);
                }
              }
            }

            let newClue = {} as Clue; // Doesn't need any data by default
            if (clue.clue) {
              newClue.id = generateId();
              newClue.entry = {
                entry: clue.entry.entry,
                lang: clue.entry.lang,
              };
              newClue.customClue = clue.clue;
              newClue.senseId = clue.clue.senseId;
              newClue.customDisplayText = clue.clue.customDisplayText;
              newClue.source = clue.clue.source;
              newClue.translatedClues = clue.clue.translatedClues;
            }

            await dao.addClueToCollection(collectionId, newClue);
        }
        
        return res.status(StatusCodes.OK).json({ message: "Clues added to collection successfully." });
    } catch (error) {
        console.error("Error adding/updating clue:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while adding/updating the clue." });
    }
}

function convertTranslationsToModel(translationsObj: any): Map<string, EntryTranslation> {
    let translationsMap = convertObjectToMap(translationsObj);
    let output = new Map<string, EntryTranslation>();

    for (const lang of mapKeys(translationsMap)) {
      let naturalTranslations = translationsMap.get(lang)?.naturalTranslations || [];
      let colloquialTranslations = translationsMap.get(lang)?.colloquialTranslations || [];
      let alternatives = translationsMap.get(lang)?.alternatives || [];

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
        alternatives: alternatives.map((t: any) => ({
          entry: displayTextToEntry(t),
          lang: lang,
          displayText: t
        }) as Entry),
      } as EntryTranslation);
    }

    return output;
}

function convertExampleSentencesToModel(exampleSentencesObj: any, senseId: string): ExampleSentence[] {
    if (!exampleSentencesObj || !Array.isArray(exampleSentencesObj)) {
      return [];
    }
    let output: ExampleSentence[] = [];

    for (const exampleSentenceData of exampleSentencesObj) {
      let exampleSentence: ExampleSentence = {
        id: generateId(),
        senseId: senseId,
        translations: convertObjectToMap(exampleSentenceData),
      };
      output.push(exampleSentence);
    }

    return output;
}
