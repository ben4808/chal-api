import { Request, Response } from "express";
import CruziDao from "../daos/CruziDao";
import { StatusCodes } from 'http-status-codes';

let dao = new CruziDao();

/*
Write an Express request handler getCollectionById that retrieves a single clue collection by ID.
It should accept a JWT token for authentication.
- Private collections should be returned only if the user is authenticated and has access to them.
- If the user is not authenticated, only public collections should be returned.
It should return a JSON response with the clue collection or 404 if not found.
- The puzzle and clues fields will be undefined for this call.
- The creator and progressData fields should be populated with the appropriate data.
The handler should handle errors gracefully and return appropriate HTTP status codes.
*/

export async function getCollectionById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = (req as any).userId as string | undefined;

        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Collection ID is required." });
        }

        const collection = await dao.getCollectionById(id, userId);

        if (!collection) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Collection not found or access denied." });
        }

        return res.status(StatusCodes.OK).json(collection);
    } catch (error) {
        console.error("Error retrieving collection:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while retrieving the collection." });
    }
}
