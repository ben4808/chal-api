import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { EntryQueryParams } from "../models/EntryQueryParams";
import { Sense } from "../models/Sense";

export interface ICruziDao {
  getCrosswordList(date: Date): Promise<ClueCollection[]>;
  getCollectionList(userId?: string): Promise<ClueCollection[]>;

  getCrosswordId(source: string, date: Date): Promise<string | null>;
  getCollection(collectionId: string): Promise<ClueCollection | null>;
  getClues(collectionId: string): Promise<Clue[]>;

  addClueToCollection(collectionId: string, clue: Clue): Promise<void>;
  removeClueFromCollection(collectionId: string, clueId: string): Promise<void>;
  addOrUpdateEntries(entries: Entry[]): Promise<void>;
  addOrUpdateSense(entry: Entry, sense: Sense): Promise<void>;

  getSingleClue(clueId: string): Promise<Clue | null>;
  updateSingleClue(clue: Clue): Promise<Clue>;

  getEntry(entry: string): Promise<Entry | null>;
  addToEntryInfoQueue(entry: string): Promise<void>;

  queryEntries(params: EntryQueryParams): Promise<Entry[]>;
}
