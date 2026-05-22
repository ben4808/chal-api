import { deepConvertToObject, pickLocalizedText } from "../lib/utils";
import {
    Clue,
    ClueCollection,
    CollectionClueRow,
    Entry,
    EntryQueryParams,
    Sense,
    User,
} from 'cruzi-models';
import { CluePersisted, ICruziDao } from "./ICruziDao";
import { sqlQuery } from "./postgres";

class CruziDao implements ICruziDao {
    public async addClueToCollection(collectionId: string, clue: CluePersisted): Promise<void> {
        const clueData = {
            collection_id: collectionId,
            id: clue.id,
            entry: clue.entry.entry,
            lang: clue.lang,
            custom_clue: clue.customClue,
            custom_display_text: clue.customDisplayText,
            source: clue.source,
        };

        await sqlQuery(true, 'add_clues_to_collection', [
            { name: 'clue_data', value: [clueData]}
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
            loading_status: entry.loadingStatus,
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
            summary: sense.summary,
            definition: sense.definition,
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
            lang: raw.lang ?? "en",
            author: raw.author,
            createdDate: new Date(raw.created_date),
            modifiedDate: raw.modified_date ? new Date(raw.modified_date) : new Date(raw.created_date),
            isPrivate: raw.is_private ?? false,
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            puzzle: raw.puzzle_id
                ? {
                      id: raw.puzzle_id,
                      title: raw.title ?? "",
                      publication: raw.publication,
                      date,
                      width: raw.width ?? 0,
                      height: raw.height ?? 0,
                      grid: [],
                      entries: new Map(),
                  }
                : undefined,
        } as ClueCollection));
    }

    // Maps get_collection_by_id result to ClueCollection | null
    public async getCollectionById(collectionId: string, userId?: string): Promise<ClueCollection | null> {
        const result = await sqlQuery(true, 'get_collection_by_id', [
            { name: 'p_collection_id', value: collectionId },
            { name: 'p_user_id', value: userId || null }
        ]);

        if (!result || result.length === 0 || !result[0].get_collection_by_id) {
            return null;
        }

        const raw = result[0].get_collection_by_id;
        return {
            id: raw.id,
            title: raw.title,
            author: raw.author,
            lang: raw.lang,
            description: raw.description,
            isPrivate: raw.is_private,
            createdDate: new Date(raw.created_date),
            modifiedDate: raw.modified_date ? new Date(raw.modified_date) : new Date(raw.created_date),
            clueCount: raw.clue_count,
            metadata1: raw.metadata1,
            metadata2: raw.metadata2,
            creator: mapCreator(raw.creator),
            progressData: mapCollectionProgressData(raw.user_progress, userId, raw.id),
            clues: [],
        } as ClueCollection;
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
            lang: raw.lang,
            description: raw.description,
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
                return {
                    id: clueId,
                    entry: { entry: "", lang: "" },
                    lang: "",
                } as Clue;
            }

            const entryModel = {
                entry: raw.entry,
                lang: raw.lang,
                displayText: raw.display_text,
                loadingStatus: raw.loading_status,
            } as Entry;

            return {
                id: raw.id,
                entry: entryModel,
                lang: raw.lang,
                sense: raw.sense
                    ? ({
                          id: raw.sense.id,
                          entry: entryModel,
                          partOfSpeech: raw.sense.partOfSpeech,
                          commonness: raw.sense.commonness,
                          summary: pickLocalizedText(raw.sense.summary),
                          definition: pickLocalizedText(raw.sense.definition),
                          exampleSentences: transformExampleSentences(
                              raw.sense.exampleSentences
                          ) as Sense["exampleSentences"],
                          familiarityScore: raw.sense.familiarityScore,
                          qualityScore: raw.sense.qualityScore,
                          sourceAi: raw.sense.sourceAi,
                      } as Sense)
                    : undefined,
                customClue: raw.custom_clue,
                customDisplayText: raw.custom_display_text,
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
            entry: {
                entry: raw.entry,
                lang: raw.lang,
                loadingStatus: raw.loading_status,
            } as Entry,
            lang: raw.lang,
            customClue: raw.clue,
            order: raw.collection_order,
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
            senses: raw.senses || [],
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
    public async getSingleClue(clueId: string): Promise<CluePersisted | null> {
        const result = await sqlQuery(true, 'get_single_clue', [
            { name: 'p_clue_id', value: clueId }
        ]);

        if (!result || result.length === 0 || !result[0].get_single_clue) {
            return null;
        }

        const raw = result[0].get_single_clue;
        const entryModel = {
            entry: raw.entry,
            lang: raw.lang,
            loadingStatus: raw.loading_status,
        } as Entry;
        return {
            id: raw.id,
            customClue: raw.custom_clue,
            customDisplayText: raw.custom_display_text,
            entry: entryModel,
            lang: raw.lang,
            sense: raw.sense_id
                ? ({ id: raw.sense_id, entry: entryModel } as Sense)
                : undefined,
            source: raw.source,
        } as CluePersisted;
    }

    // Calls upsert_single_clue
    public async updateSingleClue(clue: CluePersisted): Promise<CluePersisted> {
        const clueData = {
            id: clue.id,
            entry: clue.entry.entry,
            lang: clue.lang,
            sense_id: clue.sense?.id,
            custom_clue: clue.customClue,
            custom_display_text: clue.customDisplayText,
            source: clue.source,
        };

        await sqlQuery(true, 'upsert_single_clue', [
            { name: 'clue_data', value: clueData }
        ]);

        return clue;
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
        const baseEntry: Entry = {
            entry: raw.entry,
            lang: raw.lang,
            displayText: raw.display_text,
            entryType: raw.entry_type,
            familiarityScore: raw.familiarity_score,
            qualityScore: raw.quality_score,
            loadingStatus: raw.loading_status,
        };

        const sensesMap = new Map<string, Sense>();
        for (const sense of raw.senses || []) {
            sensesMap.set(sense.id, {
                id: sense.id,
                entry: baseEntry,
                summary: pickLocalizedText(sense.summary),
                definition: pickLocalizedText(sense.definition),
                familiarityScore: sense.familiarity_score,
                qualityScore: sense.quality_score,
                sourceAi: sense.source_ai,
                exampleSentences: (sense.example_sentences || []).map((ex: any) => ({
                    id: ex.id,
                    senseId: sense.id,
                    translations: ex.sentence
                        ? new Map([[raw.lang, ex.sentence]])
                        : undefined,
                    source_ai: ex.source_ai,
                })),
            } as Sense);
        }

        return {
            ...baseEntry,
            senses: sensesMap,
        } as Entry;
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
            displayText: raw.display_text,
            entryType: raw.entry_type,
            familiarityScore: raw.familiarity_score,
            qualityScore: raw.quality_score,
            loadingStatus: raw.loading_status,
        } as Entry));
    }

    // Inserts a user if they don't already exist (based on id)
    public async insertUserIfNotExists(user: User): Promise<void> {
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

    // Gets senses for a specific entry
    public async getSensesForEntry(entry: string, lang: string): Promise<Sense[]> {
        const result = await sqlQuery(true, 'get_senses_for_entry', [
            { name: 'p_entry', value: entry },
            { name: 'p_lang', value: lang }
        ]);

        if (!result || result.length === 0) {
            return [];
        }

        const entryModel = { entry, lang } as Entry;

        return result.map((row: any) => ({
            id: row.id,
            entry: entryModel,
            partOfSpeech: row.part_of_speech,
            commonness: row.commonness,
            summary: pickLocalizedText(deepConvertToObject(row.summary)),
            definition: pickLocalizedText(deepConvertToObject(row.definition)),
            exampleSentences: row.example_sentences || [],
            translations: deepConvertToObject(row.translations),
            sourceAi: row.source_ai,
        } as Sense));
    }

    // Gets a clue by entry in a specific collection
    public async getClueByEntryInCollection(collectionId: string, entry: string, lang: string): Promise<CluePersisted | null> {
        const result = await sqlQuery(true, 'get_clue_by_entry_in_collection', [
            { name: 'p_collection_id', value: collectionId },
            { name: 'p_entry', value: entry },
            { name: 'p_lang', value: lang }
        ]);

        if (!result || result.length === 0 || !result[0].get_clue_by_entry_in_collection || result[0].get_clue_by_entry_in_collection.length === 0) {
            return null;
        }

        const row = result[0].get_clue_by_entry_in_collection[0];
        const entryModel = {
            entry: row.entry,
            lang: row.lang,
        } as Entry;
        return {
            id: row.id,
            entry: entryModel,
            lang: row.lang,
            sense: row.sense_id ? ({ id: row.sense_id, entry: entryModel } as Sense) : undefined,
            customClue: row.custom_clue,
            customDisplayText: row.custom_display_text,
            source: row.source,
            translatedClues: deepConvertToObject(row.translated_clues),
        } as CluePersisted;
    }

    // Adds an entry to the entry info queue
    public async addToEntryInfoQueue(entry: string, lang: string): Promise<void> {
        await sqlQuery(true, 'add_to_entry_info_queue', [
            { name: 'p_entry', value: entry },
            { name: 'p_lang', value: lang }
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
        email: creator.email ?? "",
        createdAt: creator.created_at ? new Date(creator.created_at) : undefined,
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
        userId: progress.user_id ?? "",
        clueId: progress.clue_id ?? "",
        correctSolvesNeeded: progress.correct_solves_needed ?? 0,
        correctSolves: progress.correct_solves ?? 0,
        incorrectSolves: progress.incorrect_solves ?? 0,
        lastSolveDate: progress.last_solve ? new Date(progress.last_solve) : undefined,
    };
};

export default CruziDao;
