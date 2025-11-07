import { deepConvertToObject } from "../lib/utils";
import { Clue } from "../models/Clue";
import { ClueCollection } from "../models/ClueCollection";
import { Entry } from "../models/Entry";
import { EntryQueryParams } from "../models/EntryQueryParams";
import { Sense } from "../models/Sense";
import { CollectionClueRow } from "../models/CollectionClueRow";
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
            id: sense.id,
            part_of_speech: sense.partOfSpeech,
            commonness: sense.commonness,
            summary: sense.summary, // Map<lang, text>
            definition: sense.definition, // Map<lang, text>
            example_sentences: sense.exampleSentences, // ExampleSentence[]
            translations: sense.translations, // Map<lang, EntryTranslation>
            source_ai: sense.sourceAi,
        });

        console.log(JSON.stringify(senseData, null, 2));

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

        if (!result || result.length === 0 || !result[0].get_clue_collections) {
            return [];
        }

        const rawData = result[0].get_clue_collections;
        return rawData.map((raw: any) => ({
            id: raw.id,
            title: raw.title,
            author: raw.author,
            description: raw.description,
            isCrosswordCollection: raw.is_crossword_collection,
            isPrivate: raw.is_private,
            createdDate: new Date(raw.created_date),
            modifiedDate: raw.modified_date ? new Date(raw.modified_date) : new Date(raw.created_date),
            clueCount: raw.clue_count,
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            creator: mapCreator(raw.creator),
            progressData: mapCollectionProgressData(raw.user_progress, userId, raw.id),
            clues: [],
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

    // Maps select_collection_batch result to string[] (clue IDs)
    public async selectCollectionBatch(userId: string | undefined, collectionId: string): Promise<string[]> {
        const result = await sqlQuery(true, 'select_collection_batch', [
            { name: 'p_collection_id', value: collectionId },
            { name: 'p_user_id', value: userId || null }
        ]);

        if (!result || result.length === 0 || !result[0].select_collection_batch) {
            return [];
        }

        return result[0].select_collection_batch;
    }

    // Maps populate_collection_batch result to Clue[]
    public async populateCollectionBatch(clueIds: string[], userId?: string): Promise<Clue[]> {
        const result = await sqlQuery(true, 'populate_collection_batch', [
            { name: 'p_clue_ids', value: clueIds },
            { name: 'p_user_id', value: userId || null }
        ]);

        if (!result || result.length === 0 || !result[0].populate_collection_batch) {
            return [];
        }

        const rawData = result[0].populate_collection_batch;
        
        // Create a map from clue ID to clue data to preserve input order
        const clueMap = new Map<string, any>();
        for (const raw of rawData) {
            clueMap.set(raw.id, raw);
        }

        // Transform example sentences from [{id, sentence, lang}, ...] format
        // to [{_id, en, es, gn, ...}, ...] format grouped by id
        // Supports any language code that exists in the database
        const transformExampleSentences = (exampleSentences: any[]): any[] => {
            if (!exampleSentences || !Array.isArray(exampleSentences)) {
                return [];
            }

            // Group by id - use index signature to allow any language code
            const grouped = new Map<string, { _id: string; [lang: string]: string | undefined }>();
            
            for (const ex of exampleSentences) {
                if (!ex.id || !ex.lang || !ex.sentence) continue;
                
                if (!grouped.has(ex.id)) {
                    grouped.set(ex.id, { _id: ex.id });
                }
                
                const example = grouped.get(ex.id)!;
                const lang = ex.lang;
                const sentence = ex.sentence;
                
                // Dynamically assign the sentence to the language property
                example[lang] = sentence;
            }
            
            return Array.from(grouped.values());
        };

        // Return results in the same order as the input array
        return clueIds.map((clueId: string) => {
            const raw = clueMap.get(clueId);
            if (!raw) {
                // If a clue ID was not found, return a minimal clue object
                return {
                    id: clueId,
                } as Clue;
            }

            return {
                id: raw.id,
                entry: raw.entry ? {
                    entry: raw.entry,
                    lang: raw.lang,
                    displayText: raw.display_text,
                    loadingStatus: raw.loading_status,
                } as Entry : undefined,
                sense: raw.sense ? {
                    id: raw.sense.id,
                    partOfSpeech: raw.sense.partOfSpeech,
                    commonness: raw.sense.commonness,
                    summary: raw.sense.summary,
                    definition: raw.sense.definition,
                    exampleSentences: transformExampleSentences(raw.sense.exampleSentences),
                    familiarityScore: raw.sense.familiarityScore,
                    qualityScore: raw.sense.qualityScore,
                    sourceAi: raw.sense.sourceAi,
                } as Sense : undefined,
                customClue: raw.custom_clue,
                customDisplayText: raw.custom_display_text,
                source: raw.source,
                progressData: raw.progress_data ? mapClueProgressData(raw.progress_data) : undefined,
            } as Clue;
        });
    }

    // Maps get_clues result to Clue[]
    public async getCrosswordClues(collectionId: string, userId?: string): Promise<Clue[]> {
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
                loadingStatus: raw.loading_status,
            } as Entry,
            lang: raw.lang,
            source: raw.source,
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            progressData: mapClueProgressData(raw.user_progress),
        } as Clue));
    }

    // Maps get_collection_clues result to CollectionClueRow[]
    public async getCollectionClues(
        collectionId: string,
        userId?: string,
        sortBy?: string,
        sortDirection?: string,
        progressFilter?: string,
        statusFilter?: string,
        page?: number
    ): Promise<CollectionClueRow[]> {
        const result = await sqlQuery(true, 'get_collection_clues', [
            { name: 'p_collection_id', value: collectionId },
            { name: 'p_user_id', value: userId || null },
            { name: 'p_sort_by', value: sortBy || 'Answer' },
            { name: 'p_sort_direction', value: sortDirection || 'asc' },
            { name: 'p_progress_filter', value: progressFilter || null },
            { name: 'p_status_filter', value: statusFilter || null },
            { name: 'p_page', value: page || 1 }
        ]);

        if (!result || result.length === 0 || !result[0].get_collection_clues) {
            return [];
        }

        const rawData = result[0].get_collection_clues;
        return rawData.map((raw: any) => ({
            id: raw.id,
            answer: raw.answer,
            sense: raw.sense,
            clue: raw.clue,
            progress: raw.progress,
            status: raw.status,
        } as CollectionClueRow));
    }

    // Calls submit_user_response
    public async submitUserResponse(userId: string, response: any): Promise<void> {
        await sqlQuery(true, 'submit_user_response', [
            { name: 'p_user_id', value: userId },
            { name: 'p_response', value: response }
        ]);
    }

    // Calls reopen_collection
    public async reopenCollection(userId: string, collectionId: string): Promise<void> {
        await sqlQuery(true, 'reopen_collection', [
            { name: 'p_user_id', value: userId },
            { name: 'p_collection_id', value: collectionId }
        ]);
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
                loadingStatus: raw.loading_status,
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
                loadingStatus: raw.loading_status,
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
            loadingStatus: raw.loading_status,
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
            loadingStatus: raw.loading_status,
        } as Entry));
    }

    // Inserts a user if they don't already exist (based on id)
    public async insertUserIfNotExists(user: { id: string; email: string; firstName?: string; lastName?: string; nativeLang?: string }): Promise<void> {
        await sqlQuery(true, 'insert_user_if_not_exists', [
            { name: 'p_id', value: user.id },
            { name: 'p_email', value: user.email },
            { name: 'p_first_name', value: user.firstName || null },
            { name: 'p_last_name', value: user.lastName || null },
            { name: 'p_native_lang', value: user.nativeLang || null }
        ]);
    }

    // Initializes user collection progress if it doesn't exist
    // Creates a record with all clues marked as unseen
    public async initializeUserCollectionProgress(userId: string, collectionId: string): Promise<void> {
        await sqlQuery(true, 'initialize_user_collection_progress', [
            { name: 'p_user_id', value: userId },
            { name: 'p_collection_id', value: collectionId }
        ]);
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
const mapCollectionProgressData = (progress: any, userId?: string, collectionId?: string) => {
    if (!progress) return undefined;
    return {
        userId: userId || '',
        collectionId: collectionId || '',
        unseen: progress.unseen,
        in_progress: progress.in_progress,
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
