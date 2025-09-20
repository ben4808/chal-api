import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";

let dao = new CruziDao();

/*
Write an Express handler removeClueFromCollection that removed a clue from a specified collection.
It should accept a request with the following parameters:
- `collectionId`: The ID of the clue collection to remove the clue from.
- `clueId`: The ID of the clue to remove.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function removeClueFromCollection(req: Request, res: Response) {
    try {
        const collectionId = req.body.collectionId as string;
        const clueId = req.body.clueId as string;

        if (!collectionId || !clueId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Collection ID and Clue ID are required." });
        }

        await dao.removeClueFromCollection(collectionId, clueId);
        return res.status(StatusCodes.OK).json({ message: "Clue removed from collection successfully." });
    } catch (error) {
        console.error("Error removing clue from collection:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while removing the clue from the collection." });
    }
}
