import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";
import { Entry } from "../models/Entry";
import { Sense } from "../models/Sense";
import { Clue } from "../models/Clue";
import { generateId } from "../lib/utils";

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
            if (clue.entry) {
              let entry = {
                entry: clue.entry.entry,
                lang: clue.entry.lang,
                rootEntry: clue.entry.rootEntry,
                displayText: clue.entry.displayText,
                entryType: clue.entry.entryType,
              } as Entry;

              await dao.addOrUpdateEntry(entry);
            }

            if (clue.senses && Array.isArray(clue.senses)) {
              for (const inputSense of clue.senses) {
                let sense = {
                  id: generateId(),
                  partOfSpeech: inputSense.partOfSpeech,
                  commonness: inputSense.commonness,
                  summary: inputSense.summary,
                  definition: inputSense.definition,
                  exampleSentences: inputSense.exampleSentences,
                  translations: inputSense.translations,
                } as Sense;

                await dao.addOrUpdateSense(sense);
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
    } catch (error) {
        console.error("Error adding/updating clue:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while adding/updating the clue." });
    }
}
