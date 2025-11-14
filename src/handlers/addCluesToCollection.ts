import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";
import { Entry } from "../models/Entry";
import { Clue } from "../models/Clue";
import { generateId } from "../lib/utils";
import { processSenses } from "../lib/entryProcessingUtils";

let dao = new CruziDao();

/*
The input information may include the following fields, following their respective schemas in the 
models directory. The DB schema is in schema.sql.

- Entry object
  - Will always be provided at least with an entry and lang so other fields can reference it.
- Sense object (optional)
- Clue object (optional)
  - Could be provided to add custom clue/custom entry information.
  - A clue will be created whether or not this object is input, provided it doesn't already exist
    in the collection.

Operations:
1. Make sure the entry information is upserted.
  - Add a loadingStatus onto the Entry object. If there are already senses for the entry in the DB,
    or senses were sent in with the request, set the loadingStatus to Ready. Otherwise, set it to
    Processing.
  - The Entry and Sense objects will be upserted, reusing the code in upsertEntryInformation.ts.
2. Check if there was already a clue with this entry in the collection. If not, dreate a clue, 
   and add it to the database. Add the created clue to the given collection. If there was already
   such a clue, update it with the new information.
  - If there are senses for the entry, set the clue's sense to the entry's sense with commonness "primary".
3. If the clue was created, increment the clue count for the collection.
4. If there are no senses for the entry, add a record to the entry_queue table for the entry.

It should accept a request with the following parameters:
- `id`: The ID of the clue collection to add the clue to (as a URL parameter).
- The clue information to add (JSON in the request body).
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
            // Step 1: Upsert entry information using upsertEntryInformation logic
            const entryData = clue.entry;
            const sensesData = clue.senses;

            // Check existing senses for the entry to determine loading status
            const existingSenses = await dao.getSensesForEntry(entryData.entry, entryData.lang);
            const hasSensesInDb = existingSenses.length > 0;
            const hasSensesInRequest = sensesData && Array.isArray(sensesData) && sensesData.length > 0;

            // Set loading status: Ready if there are senses in DB or request, Processing otherwise
            const loadingStatus = (hasSensesInDb || hasSensesInRequest) ? "Ready" : "Processing";

            // Create entry object with loading status
            let entry = {
                entry: entryData.entry,
                lang: entryData.lang,
                rootEntry: entryData.rootEntry,
                displayText: entryData.displayText,
                entryType: entryData.entryType,
                loadingStatus: loadingStatus,
            } as Entry;

            // Upsert the entry
            await dao.addOrUpdateEntries([entry]);

            // Process senses if provided
            await processSenses(entry, sensesData, dao);

            // Step 2: Check if there's already a clue with this entry in the collection
            const existingClue = await dao.getClueByEntryInCollection(collectionId, entryData.entry, entryData.lang);
            let clueWasCreated = false;

            if (existingClue) {
                // Update existing clue with new information
                const updatedClue = { ...existingClue };
                if (clue.clue) {
                    updatedClue.customClue = clue.clue.customClue || updatedClue.customClue;
                    updatedClue.customDisplayText = clue.clue.customDisplayText || updatedClue.customDisplayText;
                    updatedClue.source = clue.clue.source || updatedClue.source;
                    updatedClue.customClueTranslations = clue.clue.translatedClues || updatedClue.customClueTranslations;
                }
                await dao.updateSingleClue(updatedClue);
            } else {
                // Step 3: Create new clue
                let newClue = {
                    id: generateId(),
                    entry: {
                        entry: entryData.entry,
                        lang: entryData.lang,
                    },
                    customClue: clue.clue?.customClue,
                    customDisplayText: clue.clue?.customDisplayText,
                    source: clue.clue?.source,
                    customClueTranslations: clue.clue?.translatedClues,
                } as Clue;

                // Step 4: If there are senses for the entry, set the clue's sense to the entry's sense with commonness "primary"
                if (hasSensesInDb || hasSensesInRequest) {
                    const allSenses = hasSensesInRequest ? sensesData : existingSenses;
                    const primarySense = allSenses.find((s: any) => s.commonness === "primary");
                    if (primarySense) {
                        newClue.sense = primarySense.id;
                    } else if (allSenses.length > 0) {
                        // If no primary, use the first sense
                        newClue.sense = allSenses[0].id;
                    }
                }

                await dao.addClueToCollection(collectionId, newClue);
                clueWasCreated = true;
            }

            // Step 6: If there are no senses for the entry, add a record to the entry_queue table
            if (!hasSensesInDb && !hasSensesInRequest) {
                await dao.addToEntryInfoQueue(entryData.entry, entryData.lang);
            }
        }

        return res.status(StatusCodes.OK).json({ message: "Clues added to collection successfully." });
    } catch (error) {
        console.error("Error adding/updating clue:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while adding/updating the clue." });
    }
}

