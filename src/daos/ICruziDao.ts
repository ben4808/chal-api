import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { EntryQueryParams } from "../models/EntryQueryParams";
import { Sense } from "../models/Sense";
import { UserResponse } from "../models/UserResponse";
import { CollectionClueRow } from "../models/CollectionClueRow";
import { User } from "../models/User";

export interface ICruziDao {
  getCrosswordList(date: Date): Promise<ClueCollection[]>;
  getCollectionList(userId?: string): Promise<ClueCollection[]>;
  getCollectionById(collectionId: string, userId?: string): Promise<ClueCollection | null>;

  getCrosswordId(source: string, date: Date): Promise<string | null>;
  selectCollectionBatch(userId: string | undefined, collectionId: string): Promise<string[]>;
  populateCollectionBatch(clueIds: string[], userId?: string): Promise<Clue[]>;
  getCrosswordClues(collectionId: string): Promise<Clue[]>;
  getCollectionClues(
    collectionId: string,
    userId?: string,
    sortBy?: string,
    sortDirection?: string,
    progressFilter?: string,
    statusFilter?: string,
    page?: number
  ): Promise<CollectionClueRow[]>;
  submitUserResponse(userId: string, response: UserResponse): Promise<void>;
  reopenCollection(userId: string, collectionId: string): Promise<void>;

  addClueToCollection(collectionId: string, clue: Clue): Promise<void>;
  removeClueFromCollection(collectionId: string, clueId: string): Promise<void>;
  addOrUpdateEntries(entries: Entry[]): Promise<void>;
  addOrUpdateSense(entry: Entry, sense: Sense): Promise<void>;

  getSingleClue(clueId: string): Promise<Clue | null>;
  updateSingleClue(clue: Clue): Promise<Clue>;

  getEntry(entry: string): Promise<Entry | null>;
  getSensesForEntry(entry: string, lang: string): Promise<Sense[]>;
  getClueByEntryInCollection(collectionId: string, entry: string, lang: string): Promise<Clue | null>;
  addToEntryInfoQueue(entry: string, lang: string): Promise<void>;

  queryEntries(params: EntryQueryParams): Promise<Entry[]>;

  insertUserIfNotExists(user: User): Promise<void>;
  
  initializeUserCollectionProgress(userId: string, collectionId: string): Promise<void>;
}
