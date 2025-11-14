import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import CruziDao from "../daos/CruziDao";
import { Clue } from "../models/Clue";

let dao = new CruziDao();

/*
Update the sense for a specific clue in a collection.

It should accept a POST body with:
- clueId: string - The ID of the clue to update
- senseId: string - The ID of the new sense to assign (can be null to remove sense)

It should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function updateClueSense(req: Request, res: Response) {
    try {
        const { clueId, senseId } = req.body;

        if (!clueId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "clueId is required"
            });
        }

        // Get the existing clue
        const existingClue = await dao.getSingleClue(clueId);
        if (!existingClue) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Clue not found"
            });
        }

        // Update the clue with the new sense
        const updatedClue: Clue = {
            ...existingClue,
            sense: senseId // Store sense ID as string
        };

        await dao.updateSingleClue(updatedClue);

        return res.status(StatusCodes.OK).json({
            message: "Clue sense updated successfully"
        });
    } catch (error) {
        console.error("Error updating clue sense:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while updating the clue sense."
        });
    }
}
