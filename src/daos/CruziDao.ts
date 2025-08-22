import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { CollectionProgressData } from "../models/CollectionProgressData";
import { Entry } from "../models/Entry";
import { EntryFilter } from "../models/EntryFilter";
import { User } from "../models/User";
import { ICruziDao } from "./ICruziDao";
import { sqlQuery } from "./postgres";

export class CruziDao implements ICruziDao {
  async getCrosswordList(date: Date): Promise<ClueCollection[]> {
    puzzle.id = puzzle.id || generateId();

    await sqlQuery(true, "add_puzzle", [
        {name: "p_puzzle_id", value: puzzle.id},
        {name: "p_publication_id", value: puzzle.publicationId},
        {name: "p_date", value: puzzle.date},
        {name: "p_author", value: puzzle.authors.join(", ")},
        {name: "p_title", value: puzzle.title},
        {name: "p_copyright", value: puzzle.copyright},
        {name: "p_notes", value: puzzle.notes},
        {name: "p_width", value: puzzle.width},
        {name: "p_height", value: puzzle.height},
        {name: "p_source_link", value: puzzle.sourceLink},
    ]);
  }

  async getCollectionProgress(collectionId: string, user?: User): Promise<CollectionProgressData> {
    // Example: Fetch progress from the database
    const progress = await this.db.collectionProgress.findFirst({
      where: { collectionId, userId: user?.id },
    });
    return progress as CollectionProgressData;
  }

  async getCrosswordId(source: string, date: Date): Promise<string> {
    // Example: Find crossword by source and date
    const crossword = await this.db.crosswords.findFirst({
      where: { source, date: date.toISOString().slice(0, 10) },
      select: { id: true },
    });
    return crossword?.id ?? "";
  }

  async populateClues(collection: ClueCollection): Promise<ClueCollection> {
    // Example: Populate clues for a collection
    const clues = await this.db.clues.findMany({
      where: { collectionId: collection.id },
    });
    collection.clues = clues;
    return collection;
  }

  async populateClueProgress(collection: ClueCollection, user?: User): Promise<ClueCollection> {
    // Example: Attach progress to each clue
    if (!user) return collection;
    const clueIds = collection.clues.map((clue) => clue.id);
    const progresses = await this.db.clueProgress.findMany({
      where: { clueId: { in: clueIds }, userId: user.id },
    });
    const progressMap = new Map(progresses.map((p: any) => [p.clueId, p]));
    collection.clues = collection.clues.map((clue) => ({
      ...clue,
      progress: progressMap.get(clue.id) || null,
    }));
    return collection;
  }

  async getCollectionList(user: User): Promise<ClueCollection[]> {
    // Implementation to fetch collection list for the user
    return [];
  }

  async getCrossword(source?: string, date?: Date, collectionId?: string): Promise<ClueCollection> {
    // Implementation to fetch a crossword based on source, date, or collectionId
    return {} as ClueCollection;
  }

  async getCollection(collectionId: string): Promise<ClueCollection> {
    // Implementation to fetch a specific collection by ID
    return {} as ClueCollection;
  }

  async getSingleClue(clueId: number): Promise<Clue> {
    // Implementation to fetch a single clue by ID
    return {} as Clue;
  }

  async createSingleClue(clue: Clue): Promise<Clue> {
    // Implementation to create a single clue and return its ID
    return {} as Clue;
  }

  async getEntry(entry: string): Promise<Entry> {
    // Implementation to fetch entry information
    return {} as Entry;
  }

  async addToEntryInfoQueue(entry: string): Promise<void> {
    // Implementation to generate entry information
  }

  async queryEntries(query: string, filters: EntryFilter[]): Promise<Entry[]> {
    // Implementation to query entries based on the provided filters
    return [];
  }
}
