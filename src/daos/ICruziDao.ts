import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { CollectionProgressData } from "../models/CollectionProgressData";
import { Entry } from "../models/Entry";
import { EntryFilter } from "../models/EntryFilter";
import { User } from "../models/User";

export interface ICruziDao {
  getCrosswordList(date: Date): Promise<ClueCollection[]>;
  getCollectionList(user?: User): Promise<ClueCollection[]>;
  getCollectionProgress(collectionId: string, user?: User): Promise<CollectionProgressData>;

  getCrosswordId(source: string, date: Date): Promise<string>;
  getCollection(collectionId: string): Promise<ClueCollection>;
  populateClues(collection: ClueCollection): Promise<ClueCollection>;
  populateClueProgress(collection: ClueCollection, user?: User): Promise<ClueCollection>;

  getSingleClue(clueId: number): Promise<Clue>;
  createSingleClue(clue: Clue): Promise<Clue>;

  getEntry(entry: string): Promise<Entry>;
  addToEntryInfoQueue(entry: string): Promise<void>;

  queryEntries(query: string, filters: EntryFilter[]): Promise<Entry[]>;
}
