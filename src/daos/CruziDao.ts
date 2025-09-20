import { deepConvertToObject } from "../lib/utils";
import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { EntryQueryParams } from "../models/EntryQueryParams";
import { Sense } from "../models/Sense";
import { ICruziDao } from "./ICruziDao";
import { sqlQuery } from "./postgres";

class CruziDao implements ICruziDao {
    public async addClueToCollection(collectionId: string, clue: Clue): Promise<void> {
        const clueData = {
            collection_id: collectionId,
            entry: clue.entry?.entry,
            lang: clue.entry?.lang,
            custom_clue: clue.customClue,
            custom_display_text: clue.customDisplayText,
            source: clue.source,
        };

        await sqlQuery(true, 'add_clue_to_collection', [
            { name: 'clue_data', value: clueData }
        ]);
    }

    public async removeClueFromCollection(collectionId: string, clueId: string): Promise<void> {
        await sqlQuery(true, 'remove_clue_from_collection', [
            { name: 'p_collection_id', value: collectionId },
            { name: 'p_clue_id', value: clueId }
        ]);
    }

    public async addOrUpdateEntries(entries: Entry[]): Promise<void> {
        const entryData = entries.map(entry => ({
            entry: entry.entry,
            lang: entry.lang,
            length: entry.entry.length,
            root_entry: entry.rootEntry,
            display_text: entry.displayText,
            entry_type: entry.entryType,
        }));  

        await sqlQuery(true, 'upsert_entries', [
            { name: 'entries_data', value: entryData }
        ]);
    }

    public async addOrUpdateSense(entry: Entry, sense: Sense): Promise<void> {
        const senseData = deepConvertToObject({
            part_of_speech: sense.partOfSpeech,
            commonness: sense.commonness,
            summary: sense.summary, // Map<lang, text>
            definition: sense.definition, // Map<lang, text>
            example_sentences: sense.exampleSentences, // [Map<lang, text>]
            translations: sense.translations, // Map<lang, EntryTranslation>
            source_ai: sense.sourceAi,
        });

        await sqlQuery(true, 'upsert_sense', [
            { name: 'p_entry', value: entry.entry },
            { name: 'p_lang', value: entry.lang },
            { name: 'sense_data', value: senseData },
        ]);
    }


    // Maps get_crosswords_list result to ClueCollection[]
    public async getCrosswordList(date: Date): Promise<ClueCollection[]> {
        const result = await sqlQuery(true, 'get_crosswords_list', [
            { name: 'p_date', value: date.toISOString().split('T')[0] }
        ]);

        if (!result || result.length === 0 || !result[0].jsonb_agg) {
            return [];
        }

        const rawData = result[0].jsonb_agg;
        return rawData.map((raw: any) => ({
            id: raw.id,
            title: raw.title,
            author: raw.author,
            createdDate: new Date(raw.created_date),
            modifiedDate: raw.modified_date ? new Date(raw.modified_date) : new Date(raw.created_date),
            isPrivate: raw.is_private ?? false,
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            puzzle: {
                id: raw.puzzle_id,
                width: raw.width,
                height: raw.height,
                publication: raw.publication,
            }
        } as ClueCollection));
    }

    // Maps get_clue_collections result to ClueCollection[]
    public async getCollectionList(userId?: string): Promise<ClueCollection[]> {
        const result = await sqlQuery(true, 'get_clue_collections', [
            { name: 'p_user_id', value: userId || null }
        ]);

        if (!result || result.length === 0 || !result[0].jsonb_agg) {
            return [];
        }

        const rawData = result[0].jsonb_agg;
        return rawData.map((raw: any) => ({
            id: raw.id,
            title: raw.title,
            author: raw.author,
            description: raw.description,
            isPrivate: raw.is_private,
            createdDate: new Date(raw.created_date),
            modifiedDate: raw.modified_date ? new Date(raw.modified_date) : new Date(raw.created_date),
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            creator: mapCreator(raw.creator),
            progressData: mapCollectionProgressData(raw.user_progress),
            clues: [],
            clueCount: 0,
        } as ClueCollection));
    }

    // Maps get_crossword_id result to string (collectionId)
    public async getCrosswordId(source: string, date: Date): Promise<string | null> {
        const result = await sqlQuery(true, 'get_crossword_id', [
            { name: 'p_date', value: date.toISOString().split('T')[0] },
            { name: 'p_publication_id', value: source }
        ]);

        if (!result || result.length === 0 || !result[0].get_crossword_id) {
            return null;
        }

        return result[0].get_crossword_id.collection_id;
    }

    // Maps get_collection result to ClueCollection
    public async getCollection(collectionId: string): Promise<ClueCollection | null> {
        const result = await sqlQuery(true, 'get_collection', [
            { name: 'p_collection_id', value: collectionId }
        ]);

        if (!result || result.length === 0 || !result[0].get_collection) {
            return null;
        }

        const raw = result[0].get_collection;
        return {
            id: raw.id,
            title: raw.title,
            author: raw.author,
            description: raw.description,
            isPrivate: raw.is_private ?? false,
            createdDate: new Date(raw.created_date),
            modifiedDate: raw.modified_date ? new Date(raw.modified_date) : new Date(raw.created_date),
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            creator: mapCreator(raw.creator),
            puzzle: raw.puzzle_id ? { id: raw.puzzle_id } : undefined,
            clues: [],
            clueCount: 0,
        } as ClueCollection;
    }

    // Maps get_clues result to Clue[]
    public async getClues(collectionId: string, userId?: string): Promise<Clue[]> {
        const result = await sqlQuery(true, 'get_clues', [
            { name: 'p_collection_id', value: collectionId },
            { name: 'p_user_id', value: userId || null }
        ]);

        if (!result || result.length === 0 || !result[0].clues_json) {
            return [];
        }

        const rawData = result[0].clues_json;
        return rawData.map((raw: any) => ({
            id: raw.id,
            clue: raw.clue,
            entry: {
                entry: raw.entry,
                lang: raw.lang,
            } as Entry,
            lang: raw.lang,
            source: raw.source,
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            progressData: mapClueProgressData(raw.user_progress),
        } as Clue));
    }

    // Maps get_single_clue result to Clue
    public async getSingleClue(clueId: string): Promise<Clue | null> {
        const result = await sqlQuery(true, 'get_single_clue', [
            { name: 'p_clue_id', value: clueId }
        ]);

        if (!result || result.length === 0 || !result[0].get_single_clue) {
            return null;
        }

        const raw = result[0].get_single_clue;
        return {
            id: raw.id,
            clue: raw.clue,
            entry: {
                entry: raw.entry,
                lang: raw.lang,
            } as Entry,
            lang: raw.lang,
            source: raw.source,
        } as Clue;
    }

    // Calls upsert_single_clue
    public async updateSingleClue(clue: Clue): Promise<Clue> {
        const clueData = {
            id: clue.id,
            entry: clue.entry?.entry,
            lang: clue.entry?.lang,
            clue: clue.customClue,
            source: clue.source,
        };

        const result = await sqlQuery(true, 'upsert_single_clue', [
            { name: 'clue_data', value: clueData }
        ]);

        if (!result || result.length === 0 || !result[0].upsert_single_clue) {
            throw new Error('Failed to upsert clue.');
        }

        const raw = result[0].get_single_clue;
        return {
            id: raw.id,
            clue: raw.clue,
            entry: {
                entry: raw.entry,
                lang: raw.lang,
            } as Entry,
            lang: raw.lang,
            source: raw.source,
        } as Clue;
    }

    // Maps get_entry result to Entry
    public async getEntry(entry: string): Promise<Entry | null> {
        const result = await sqlQuery(true, 'get_entry', [
            { name: 'p_entry', value: entry }
        ]);

        if (!result || result.length === 0 || !result[0].get_entry) {
            return null;
        }

        const raw = result[0].get_entry;
        return {
            entry: raw.entry,
            lang: raw.lang,
            length: raw.length,
            displayText: raw.display_text,
            entryType: raw.entry_type,
            obscurityScore: raw.obscurity_score,
            qualityScore: raw.quality_score,
            senses: raw.senses ? raw.senses.map((sense: any) => ({
                id: sense.id,
                summary: sense.summary,
                definition: sense.definition,
                obscurityScore: sense.obscurity_score,
                qualityScore: sense.quality_score,
                sourceAi: sense.source_ai,
                exampleSentences: sense.example_sentences ? sense.example_sentences.map((ex: any) => ({
                    id: ex.id,
                    sentence: ex.sentence,
                    translatedSentence: ex.translated_sentence,
                    sourceAi: ex.source_ai,
                })) : [],
            })) : [],
        } as Entry;
    }

    // Calls add_to_entry_queue
    public async addToEntryInfoQueue(entry: string): Promise<void> {
        await sqlQuery(true, 'add_to_entry_queue', [
            { name: 'p_entry', value: entry }
        ]);
    }

    // Maps query_entries result to Entry[]
    public async queryEntries(params: EntryQueryParams): Promise<Entry[]> {
        const jsonbParams = {
            query: params.query,
            lang: params.lang,
            minFamiliarityScore: params.minFamiliarityScore,
            maxFamiliarityScore: params.maxFamiliarityScore,
            minQualityScore: params.minQualityScore,
            maxQualityScore: params.maxQualityScore,
            filters: params.filters,
        };

        const result = await sqlQuery(true, 'query_entries', [
            { name: 'params', value: jsonbParams }
        ]);

        if (!result || result.length === 0) {
            return [];
        }

        return result.map((raw: any) => ({
            entry: raw.entry,
            lang: raw.lang,
            length: raw.length,
            displayText: raw.display_text,
            entryType: raw.entry_type,
            obscurityScore: raw.familiarity_score,
            qualityScore: raw.quality_score,
        } as Entry));
    }
}

// Helper function to map 'user' fields from the raw creator object
const mapCreator = (creator: any) => {
    if (!creator) return undefined;
    return {
        id: creator.creator_id,
        firstName: creator.creator_first_name,
        lastName: creator.creator_last_name,
        email: creator.email || undefined,
    };
};

// Helper function to map 'progressData' for ClueCollection from the raw user_progress object
const mapCollectionProgressData = (progress: any) => {
    if (!progress) return undefined;
    return {
        unseen: progress.unseen,
        inProgress: progress.in_progress,
        completed: progress.completed,
    };
};

// Helper function to map 'progressData' for Clue from the raw user_progress object
const mapClueProgressData = (progress: any) => {
    if (!progress) return undefined;
    return {
        totalSolves: progress.total_solves,
        correctSolves: progress.correct_solves,
        incorrectSolves: progress.incorrect_solves,
        lastSolve: progress.last_solve ? new Date(progress.last_solve) : undefined,
    };
};

export default CruziDao;
