import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";
import { Entry } from "../models/Entry";
import { processSenses } from "../lib/entryProcessingUtils";

let dao = new CruziDao();

/*
The entry information may include the following fields, following the schemas in the models directory.
The DB schema is en schema.sql.

- Entry object
  - Will always be provided at least with an entry and lang so other fields can reference it.
  - If the entry doesn't exist, it will be created, otherwise it will be updated.
    - Use upsert_entries DB function.
- Sense object
  - If provided, sense data will be updated using the upsert_sense DB function.

It should accept a POST body with the clue information.
- See sampleGuaraniClues.json for an example.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function upsertEntryInformation(req: Request, res: Response) {
    try {
        const entryData = req.body.entry;
        const sensesData = req.body.senses;

        if (!entryData || !entryData.entry || !entryData.lang) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Entry with entry and lang fields are required." });
        }

        // Create entry object
        let entry = {
            entry: entryData.entry,
            lang: entryData.lang,
            rootEntry: entryData.rootEntry,
            displayText: entryData.displayText,
            entryType: entryData.entryType,
        } as Entry;

        // Upsert the entry
        await dao.addOrUpdateEntries([entry]);

        // Process senses if provided
        await processSenses(entry, sensesData, dao);

        return res.status(StatusCodes.OK).json({ message: "Entry information upserted successfully." });
    } catch (error) {
        console.error("Error upserting entry information:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while upserting entry information." });
    }
}

