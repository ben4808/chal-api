/*
Write a Postgre function "upsert_sense" to provide upsert functionality for the above tables.
The function should take a single parameter of type jsonb and use jsonb throughout.
Every field in the table should only be updated if it is present in the jsonb parameter.
Output the function in a SQL file.
*/

CREATE OR REPLACE FUNCTION upsert_entries(entries_data jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO entry ("entry", root_entry, lang, "length", display_text, entry_type, familiarity_score, quality_score)
  SELECT
    elem->>'entry',
    elem->>'root_entry',
    elem->>'lang',
    (elem->>'length')::int,
    elem->>'display_text',
    elem->>'entry_type',
    (elem->>'familiarity_score')::int,
    (elem->>'quality_score')::int
  FROM jsonb_array_elements(entries_data) AS elem
  ON CONFLICT ("entry", lang) DO UPDATE SET
    root_entry = COALESCE(EXCLUDED.root_entry, entry.root_entry),
    "length" = COALESCE(EXCLUDED."length", entry."length"),
    display_text = COALESCE(EXCLUDED.display_text, entry.display_text),
    entry_type = COALESCE(EXCLUDED.entry_type, entry.entry_type),
    familiarity_score = COALESCE(EXCLUDED.familiarity_score, entry.familiarity_score),
    quality_score = COALESCE(EXCLUDED.quality_score, entry.quality_score);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_sense(
    p_entry text,
    p_lang text,
    sense_data jsonb
)
RETURNS void AS $$
DECLARE
    v_sense_id text := sense_data->>'id';
BEGIN
    INSERT INTO sense (
        id,
        "entry",
        lang,
        part_of_speech,
        commonness,
        source_ai
    ) VALUES (
        v_sense_id,
        p_entry,
        p_lang,
        sense_data->>'part_of_speech',
        sense_data->>'commonness',
        sense_data->>'source_ai'
    )
    ON CONFLICT (id) DO UPDATE SET
        "entry" = EXCLUDED."entry",
        lang = EXCLUDED.lang,
        part_of_speech = EXCLUDED.part_of_speech,
        commonness = EXCLUDED.commonness,
        source_ai = EXCLUDED.source_ai;

    INSERT INTO sense_translation (sense_id, lang, summary, definition)
    SELECT
        v_sense_id AS sense_id,
        summary_lang AS lang,
        summary_text AS summary,
        definition_data.definition_text AS definition
    FROM jsonb_each_text(sense_data->'summary') AS summary_data(summary_lang, summary_text)
    LEFT JOIN LATERAL jsonb_each_text(sense_data->'definition') AS definition_data(definition_lang, definition_text) ON summary_data.summary_lang = definition_data.definition_lang
    ON CONFLICT (sense_id, lang) DO UPDATE SET
        summary = EXCLUDED.summary,
        definition = EXCLUDED.definition;

    INSERT INTO sense_entry_translation (sense_id, "entry", lang, display_text)
    SELECT
        v_sense_id AS sense_id,
        translation_obj->>'entry' AS "entry",
        translation_obj->>'lang' AS lang,
        translation_obj->>'displayText' AS display_text
    FROM (
        SELECT
            key AS lang,
            jsonb_array_elements(value->'naturalTranslations') AS translation_obj
        FROM jsonb_each(sense_data->'translations')
        WHERE jsonb_typeof(value->'naturalTranslations') = 'array'
        
        UNION ALL
        
        SELECT
            key AS lang,
            jsonb_array_elements(value->'colloquialTranslations') AS translation_obj
        FROM jsonb_each(sense_data->'translations')
        WHERE jsonb_typeof(value->'colloquialTranslations') = 'array'
        
        UNION ALL
        
        SELECT
            key AS lang,
            jsonb_array_elements(value->'alternatives') AS translation_obj
        FROM jsonb_each(sense_data->'translations')
        WHERE jsonb_typeof(value->'alternatives') = 'array'
    ) AS translations_data
    ON CONFLICT (sense_id, "entry", lang) DO UPDATE SET
        display_text = EXCLUDED.display_text;

    INSERT INTO example_sentence (id, sense_id)
    SELECT
        ex_sentence->>'id' AS id,
        ex_sentence->>'senseId' AS sense_id
    FROM
        jsonb_array_elements(sense_data->'example_sentences') AS ex_sentence
    ON CONFLICT (id) DO UPDATE SET
        sense_id = EXCLUDED.sense_id;

    INSERT INTO example_sentence_translation (example_id, lang, sentence)
    SELECT
        ex_sentence->>'id' AS example_id,
        lang,
        sentence
    FROM
        jsonb_array_elements(sense_data->'example_sentences') AS ex_sentence,
        jsonb_each_text(ex_sentence->'translations') AS translation_pair(lang, sentence)
    ON CONFLICT (example_id, lang) DO UPDATE SET
        sentence = EXCLUDED.sentence;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_clue_from_collection(
    p_collection_id text,
    p_clue_id text
)
RETURNS void AS $$
BEGIN
    DELETE FROM clue_collection
    WHERE collection_id = p_collection_id AND clue_id = p_clue_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_crosswords_list(
  p_date DATE
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cc.id,
      'title', cc.title,
      'author', cc.author,
      'created_date', cc.created_date,
      'metadata1', cc.metadata1,
      'metadata2', cc.metadata2,
      'puzzle_id', p.id,
      'width', p.width,
      'height', p.height,
      'publication_id', pub.id,
      'publication_name', pub.name
    )
  )
  INTO result
  FROM clue_collection cc
  JOIN puzzle p ON cc.puzzle_id = p.id
  JOIN publication pub ON p.publication_id = pub.id
  WHERE DATE(cc.created_date) = p_date;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_clue_collections(
    p_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'title', c.title,
                'author', c.author,
                'description', c.description,
                'is_private', c.is_private,
                'created_date', c.created_date,
                'metadata1', c.metadata1,
                'metadata2', c.metadata2,
                'clue_count', c.clue_count,
                'creator', CASE WHEN u.id IS NOT NULL
                                THEN jsonb_build_object(
                                    'creator_id', u.id,
                                    'creator_first_name', u.first_name,
                                    'creator_last_name', u.last_name
                                )
                                ELSE NULL
                          END,
                'user_progress', CASE WHEN p_user_id IS NOT NULL AND uc.user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'unseen', uc.unseen,
                            'in_progress', uc.in_progress,
                            'completed', uc.completed
                        )
                    ELSE
                        NULL
                END
            )
        )
        FROM clue_collection c
        LEFT JOIN "user" u ON c.creator_id = u.id
        LEFT JOIN user__collection uc ON c.id = uc.collection_id AND uc.user_id = p_user_id
        LEFT JOIN collection_access ca ON c.id = ca.collection_id AND ca.user_id = p_user_id
        WHERE (p_user_id IS NULL AND c.is_private = FALSE) 
           OR (p_user_id IS NOT NULL AND (c.is_private = FALSE OR c.creator_id = p_user_id OR ca.user_id IS NOT NULL))
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_crossword_id(
  p_date date, 
  p_publication_id text
)
RETURNS jsonb AS $$
DECLARE
    v_puzzle_id text;
    v_collection_id text;
BEGIN
    -- Find the puzzle ID using the provided date and source link.
    SELECT id
    INTO v_puzzle_id
    FROM puzzle
    WHERE "date" = p_date AND publication_id = p_publication_id;

    -- If a puzzle is found, retrieve the corresponding clue collection ID.
    IF v_puzzle_id IS NOT NULL THEN
        SELECT id
        INTO v_collection_id
        FROM clue_collection
        WHERE puzzle_id = v_puzzle_id;
    END IF;

    -- Return the result as a JSONB object.
    -- If no collection ID is found, the value will be NULL in the JSON output.
    RETURN jsonb_build_object('collection_id', v_collection_id);
END;
$$ LANGUAGE plpgsql;

-- Function to select clue IDs for a collection batch based on user progress
CREATE OR REPLACE FUNCTION select_collection_batch(
    p_collection_id TEXT,
    p_user_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result_json JSONB;
    unseen_clue_ids JSONB;
    seen_clue_ids JSONB;
    batch_size INTEGER := 20;
    unseen_count INTEGER := 13;
    seen_count INTEGER := 7;
    total_unseen INTEGER;
    total_seen INTEGER;
    clues_seen_24h INTEGER;
    total_clues INTEGER;
    all_mastered BOOLEAN := FALSE;
BEGIN
    -- If no user is provided, return randomized clue IDs from all clues in the collection
    IF p_user_id IS NULL THEN
        SELECT jsonb_agg(c.id)
        INTO result_json
        FROM (
            SELECT c.id
            FROM clue c
            INNER JOIN collection__clue cc ON c.id = cc.clue_id
            WHERE cc.collection_id = p_collection_id
            ORDER BY random()
            LIMIT batch_size
        ) c;
        
        RETURN COALESCE(result_json, '[]'::jsonb);
    END IF;

    -- Check if all clues are mastered
    SELECT COUNT(*) = 0 INTO all_mastered
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE cc.collection_id = p_collection_id
    AND (uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed);

    -- Count clues seen in the past 24 hours
    SELECT COUNT(*) INTO clues_seen_24h
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    INNER JOIN user__clue uc ON c.id = uc.clue_id
    WHERE cc.collection_id = p_collection_id
    AND uc.user_id = p_user_id
    AND uc.last_solve >= NOW() - INTERVAL '24 hours';

    -- Get total clues count
    SELECT COUNT(*) INTO total_clues
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    WHERE cc.collection_id = p_collection_id;

    -- If all clues have been seen in the past 24 hours, return empty batch
    IF clues_seen_24h >= total_clues THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Get unseen clue IDs (clues user has never seen or not mastered)
    SELECT jsonb_agg(c.id ORDER BY COALESCE(uc.last_solve, '1900-01-01'::date) ASC)
    INTO unseen_clue_ids
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE cc.collection_id = p_collection_id
    AND (uc.user_id IS NULL OR uc.last_solve IS NULL OR (uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed))
    AND (all_mastered OR uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed);

    -- Get seen clue IDs (clues user has seen but not mastered, not seen in past 24 hours)
    SELECT jsonb_agg(c.id ORDER BY COALESCE(uc.last_solve, '1900-01-01'::date) ASC)
    INTO seen_clue_ids
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    INNER JOIN user__clue uc ON c.id = uc.clue_id
    WHERE cc.collection_id = p_collection_id
    AND uc.user_id = p_user_id
    AND uc.last_solve IS NOT NULL
    AND uc.last_solve < NOW() - INTERVAL '24 hours'
    AND (all_mastered OR uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed);

    -- Count available clues
    SELECT 
        COALESCE(jsonb_array_length(unseen_clue_ids), 0),
        COALESCE(jsonb_array_length(seen_clue_ids), 0)
    INTO total_unseen, total_seen;

    -- Adjust counts based on availability with improved logic
    IF total_seen < seen_count THEN
        -- If fewer than 7 seen clues, fill remaining slots with unseen clues
        seen_count := total_seen;
        unseen_count := LEAST(batch_size - seen_count, total_unseen);
    ELSIF total_unseen < unseen_count THEN
        -- If fewer than 13 unseen clues, fill remaining slots with seen clues
        unseen_count := total_unseen;
        seen_count := LEAST(batch_size - unseen_count, total_seen);
    END IF;

    -- Combine and randomize the batch
    WITH unseen_sample AS (
        SELECT value FROM jsonb_array_elements(COALESCE(unseen_clue_ids, '[]'::jsonb)) LIMIT unseen_count
    ),
    seen_sample AS (
        SELECT value FROM jsonb_array_elements(COALESCE(seen_clue_ids, '[]'::jsonb)) LIMIT seen_count
    )
    SELECT jsonb_agg(value ORDER BY random())
    INTO result_json
    FROM (
        SELECT value FROM unseen_sample
        UNION ALL
        SELECT value FROM seen_sample
    ) AS combined;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to populate full clue data for a batch of clue IDs
CREATE OR REPLACE FUNCTION populate_collection_batch(
    p_clue_ids JSONB,
    p_user_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result_json JSONB;
BEGIN
    -- If no clue IDs provided, return empty array
    IF p_clue_ids IS NULL OR jsonb_array_length(p_clue_ids) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Get full clue data for the provided clue IDs with all related data
    WITH clue_data AS (
        SELECT 
            c.id,
            c.entry,
            c.lang,
            c.sense_id,
            c.custom_clue,
            c.custom_display_text,
            c.source,
            s.id as sense_id_full,
            s.part_of_speech,
            s.commonness,
            s.familiarity_score,
            s.quality_score,
            s.source_ai,
            uc.correct_solves,
            uc.incorrect_solves,
            uc.last_solve,
            uc.correct_solves_needed,
            e.display_text,
            e.loading_status,
            -- Get sense translations directly
            COALESCE(
                (SELECT jsonb_agg(DISTINCT
                    jsonb_build_object(
                        'lang', st2.lang,
                        'summary', st2.summary,
                        'definition', st2.definition
                    )
                )
                FROM sense_translation st2 
                WHERE st2.sense_id = s.id),
                '[]'::jsonb
            ) as sense_translations,
            -- Get example sentences directly
            COALESCE(
                (SELECT jsonb_agg(DISTINCT
                    jsonb_build_object(
                        'id', es2.id,
                        'sentence', est2.sentence,
                        'lang', est2.lang
                    )
                )
                FROM example_sentence es2
                LEFT JOIN example_sentence_translation est2 ON es2.id = est2.example_id
                WHERE es2.sense_id = s.id),
                '[]'::jsonb
            ) as example_sentences
        FROM clue c
        LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
        LEFT JOIN sense s ON c.sense_id = s.id
        LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
        WHERE c.id = ANY(SELECT jsonb_array_elements_text(p_clue_ids)::text)
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', cd.id,
            'entry', cd.entry,
            'lang', cd.lang,
            'display_text', cd.display_text,
            'loading_status', cd.loading_status,
            'sense_id', cd.sense_id,
            'custom_clue', cd.custom_clue,
            'custom_display_text', cd.custom_display_text,
            'source', cd.source,
            'sense', CASE 
                WHEN cd.sense_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', cd.sense_id_full,
                        'partOfSpeech', cd.part_of_speech,
                        'commonness', cd.commonness,
                        'summary', (
                            SELECT jsonb_object_agg(lang, summary)
                            FROM jsonb_to_recordset(cd.sense_translations) AS t(lang text, summary text)
                            WHERE summary IS NOT NULL
                        ),
                        'definition', (
                            SELECT jsonb_object_agg(lang, definition)
                            FROM jsonb_to_recordset(cd.sense_translations) AS t(lang text, definition text)
                            WHERE definition IS NOT NULL
                        ),
                        'exampleSentences', cd.example_sentences,
                        'familiarityScore', cd.familiarity_score,
                        'qualityScore', cd.quality_score,
                        'sourceAi', cd.source_ai
                    )
                ELSE NULL
            END,
            'progress_data', CASE 
                WHEN p_user_id IS NOT NULL THEN
                    jsonb_build_object(
                        'total_solves', COALESCE(cd.correct_solves, 0) + COALESCE(cd.incorrect_solves, 0),
                        'correct_solves', COALESCE(cd.correct_solves, 0),
                        'incorrect_solves', COALESCE(cd.incorrect_solves, 0),
                        'last_solve', cd.last_solve
                    )
                ELSE NULL
            END
        )
    )
    INTO result_json
    FROM clue_data cd;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_crossword_clues(
    p_collection_id text,
    p_user_id text DEFAULT NULL
)
RETURNS TABLE (clues_json jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'entry', c.entry,
                'lang', c.lang,
                'loading_status', e.loading_status,
                'clue', c.clue,
                'source', c.source,
                'collection_order', cc.order,
                'metadata1', cc.metadata1,
                'metadata2', cc.metadata2,
                'user_progress', CASE
                    WHEN p_user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'total_solves', uc.correct_solves + uc.incorrect_solves,
                            'correct_solves', uc.correct_solves,
                            'incorrect_solves', uc.incorrect_solves,
                            'last_solve', uc.last_solve
                        )
                    ELSE
                        NULL
                END
            )
            ORDER BY cc.order ASC
        ) AS clues_json
    FROM
        collection__clue cc
    JOIN
        clue c ON cc.clue_id = c.id
    LEFT JOIN
        entry e ON c.entry = e.entry AND c.lang = e.lang
    LEFT JOIN
        user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE
        cc.collection_id = p_collection_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_collection_clues(
    p_collection_id text,
    p_user_id text DEFAULT NULL,
    p_sort_by text DEFAULT 'Answer',
    p_sort_direction text DEFAULT 'asc',
    p_progress_filter text DEFAULT NULL,
    p_status_filter text DEFAULT NULL,
    p_page int DEFAULT 1
)
RETURNS jsonb AS $$
DECLARE
    result_json jsonb;
    page_size int := 100;
    offset_val int;
BEGIN
    offset_val := (p_page - 1) * page_size;

    WITH clue_data AS (
        SELECT 
            c.id,
            c.entry,
            c.lang,
            c.custom_clue,
            c.custom_display_text,
            c.sense_id,
            -- Answer: custom_display_text if exists, otherwise display_text from entry
            COALESCE(c.custom_display_text, e.display_text, '') AS answer,
            -- Sense: summary from sense_translation (entry's lang, or English, or N/A)
            COALESCE(
                (SELECT st.summary 
                 FROM sense_translation st 
                 WHERE st.sense_id = c.sense_id 
                 AND st.lang = c.lang
                 LIMIT 1),
                (SELECT st.summary 
                 FROM sense_translation st 
                 WHERE st.sense_id = c.sense_id 
                 AND st.lang = 'en'
                 LIMIT 1),
                'N/A'
            ) AS sense,
            -- Clue: custom_clue or N/A
            COALESCE(c.custom_clue, 'N/A') AS clue,
            -- Progress status and sorting helpers
            CASE 
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 'Unseen'
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 'Mastered'
                ELSE 'In Progress'
            END AS progress_status,
            -- Progress display text
            CASE 
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 'Unseen'
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 'Mastered'
                ELSE COALESCE(uc.correct_solves, 0)::text || '/' || COALESCE(uc.correct_solves_needed, 2)::text
            END AS progress_display,
            -- Progress sort helper: 1 for Mastered, 2 for In Progress, 3 for Unseen
            CASE 
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 3
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 1
                ELSE 2
            END AS progress_sort_order,
            -- Progress solves needed for sorting In Progress clues
            COALESCE(uc.correct_solves_needed, 2) AS solves_needed,
            -- Status: loading_status from entry or 'Ready'
            COALESCE(e.loading_status, 'Ready') AS status
        FROM collection__clue cc
        JOIN clue c ON cc.clue_id = c.id
        LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
        LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
        WHERE cc.collection_id = p_collection_id
        -- Apply progress filter
        AND (
            p_progress_filter IS NULL OR
            (p_progress_filter = 'Unseen' AND (p_user_id IS NULL OR uc.user_id IS NULL)) OR
            (p_progress_filter = 'Mastered' AND p_user_id IS NOT NULL AND uc.user_id IS NOT NULL 
             AND COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2)) OR
            (p_progress_filter = 'In Progress' AND p_user_id IS NOT NULL AND uc.user_id IS NOT NULL 
             AND COALESCE(uc.correct_solves, 0) < COALESCE(uc.correct_solves_needed, 2))
        )
        -- Apply status filter
        AND (
            p_status_filter IS NULL OR
            COALESCE(e.loading_status, 'Ready') = p_status_filter
        )
    ),
    sorted_data AS (
        SELECT *
        FROM clue_data
        ORDER BY
            -- When sorting by Answer
            CASE WHEN p_sort_by = 'Answer' AND p_sort_direction = 'asc' THEN answer END ASC,
            CASE WHEN p_sort_by = 'Answer' AND p_sort_direction = 'desc' THEN answer END DESC,
            -- When sorting by Progress, use the special ordering
            CASE WHEN p_sort_by = 'Progress' THEN progress_sort_order END,
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 1 THEN answer END ASC, -- Mastered: alphabetical
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 2 THEN solves_needed END DESC, -- In Progress: solves needed desc
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 3 THEN answer END ASC -- Unseen: alphabetical
    ),
    paginated_data AS (
        SELECT *
        FROM sorted_data
        LIMIT page_size
        OFFSET offset_val
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'answer', answer,
            'sense', sense,
            'clue', clue,
            'progress', progress_display,
            'status', status
        )
    )
    INTO result_json
    FROM paginated_data;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_single_clue(
    p_clue_id text
)
RETURNS jsonb AS
$$
DECLARE
    clue_record jsonb;
BEGIN
    -- Select the entire row from the clue table where the id matches the input parameter.
    -- Include loading_status from the entry table.
    SELECT to_jsonb(c) || jsonb_build_object('loading_status', e.loading_status)
    INTO clue_record
    FROM clue AS c
    LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
    WHERE c.id = p_clue_id;

    -- Return the JSONB object containing the clue's data.
    RETURN clue_record;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_single_clue(
  clue_data jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    clue_id text;
BEGIN
    -- Extract the 'id' from the JSONB input
    clue_id := clue_data ->> 'id';

    -- Perform the UPSERT (INSERT or UPDATE) operation
    INSERT INTO clue (
        id,
        entry,
        lang,
        clue,
        source
        -- metadata1 and metadata2 are not in the clue table schema provided
    )
    VALUES (
        clue_id,
        clue_data ->> 'entry',
        clue_data ->> 'lang',
        clue_data ->> 'clue',
        clue_data ->> 'source'
    )
    ON CONFLICT (id) DO UPDATE SET
        entry = EXCLUDED.entry,
        lang = EXCLUDED.lang,
        clue = EXCLUDED.clue,
        source = EXCLUDED.source
    RETURNING id INTO clue_id;

    -- Return the ID of the inserted/updated record
    RETURN clue_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_entry(
    p_entry text
)
RETURNS jsonb AS $$
BEGIN
    RETURN (
        SELECT
            jsonb_build_object(
                'entry', e.entry,
                'lang', e.lang,
                'length', e.length,
                'display_text', e.display_text,
                'entry_type', e.entry_type,
                'familiarity_score', e.familiarity_score,
                'quality_score', e.quality_score,
                'loading_status', e.loading_status,
                'senses', jsonb_agg(
                    jsonb_build_object(
                        'id', es.id,
                        'summary', st.summary,
                        'definition', st.definition,
                        'familiarity_score', es.familiarity_score,
                        'quality_score', es.quality_score,
                        'source_ai', es.source_ai,
                        'example_sentences', (
                            SELECT
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id', exs.id,
                                        'sentence', exs.sentence,
                                        'translated_sentence', exs.translated_sentence,
                                        'source_ai', exs.source_ai
                                    )
                                )
                            FROM
                                example_sentence exs
                            WHERE
                                exs.sense_id = es.id
                        )
                    )
                )
            )
        FROM
            entry e
        LEFT JOIN
            sense es ON e.entry = es.entry AND e.lang = es.lang
        LEFT JOIN
            sense_translation st ON es.id = st.sense_id
        WHERE
            e.entry = p_entry
        GROUP BY
            e.entry, e.lang, e.length, e.display_text, e.entry_type, e.familiarity_score, e.quality_score, e.loading_status
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE add_to_entry_queue(
  p_entry text
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variable to store the language found in the entry table
    v_lang text;
BEGIN
    -- Query the entry table to find the language for the given entry.
    SELECT lang INTO v_lang
    FROM entry
    WHERE "entry" = p_entry
    LIMIT 1;

    -- If a language was found, proceed with the insertion.
    IF v_lang IS NOT NULL THEN
        -- Insert the entry and the found language into the entry_info_queue table.
        INSERT INTO entry_info_queue ("entry", lang)
        VALUES (p_entry, v_lang);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION query_entries(
  params jsonb
)
RETURNS TABLE(
  "entry" text, 
  lang text, 
  "length" int, 
  display_text text, 
  entry_type text, 
  familiarity_score int, 
  quality_score int,
  loading_status text
)
LANGUAGE plpgsql AS $$
DECLARE
    _pattern text;
    _query text := params->>'query';
    _lang text := params->>'lang';
    _minFamiliarityScore int := (params->>'minFamiliarityScore')::int;
    _maxFamiliarityScore int := (params->>'maxFamiliarityScore')::int;
    _minQualityScore int := (params->>'minQualityScore')::int;
    _maxQualityScore int := (params->>'maxQualityScore')::int;
    _notInNYT boolean := false;
BEGIN
    -- Check if 'query' is provided and convert it to a valid SQL LIKE pattern
    IF _query IS NOT NULL AND _query != '' THEN
        _pattern := REPLACE(REPLACE(lower(_query), '.', '_'), '*', '%');
    END IF;

    -- Check if the 'NotInNYT' filter is present in the filters array
    IF params->'filters' IS NOT NULL THEN
        -- Check for the 'NotInNYT' string in the filters array
        IF (params->'filters' @> '["NotInNYT"]') THEN
            _notInNYT := true;
        END IF;
    END IF;

    -- Return the result of the query
    RETURN QUERY
    SELECT
        e."entry",
        e.lang,
        e."length",
        e.display_text,
        e.entry_type,
        e.familiarity_score,
        e.quality_score,
        e.loading_status
    FROM
        "entry" e
    WHERE
        -- Match the language if specified
        (_lang IS NULL OR e.lang = _lang) AND
        -- Match the pattern if specified
        (_pattern IS NULL OR lower(e."entry") LIKE _pattern) AND
        -- Match the familiarity score range
        (e.familiarity_score IS NULL OR
         (_minFamiliarityScore IS NULL OR e.familiarity_score >= _minFamiliarityScore) AND
         (_maxFamiliarityScore IS NULL OR e.familiarity_score <= _maxFamiliarityScore)) AND
        -- Match the quality score range
        (e.quality_score IS NULL OR
         (_minQualityScore IS NULL OR e.quality_score >= _minQualityScore) AND
         (_maxQualityScore IS NULL OR e.quality_score <= _maxQualityScore)) AND
        -- Handle the 'NotInNYT' filter
        (NOT _notInNYT OR NOT EXISTS (
            SELECT 1
            FROM entry_tags et
            WHERE et.lang = e.lang AND et."entry" = e."entry" AND et.tag = 'nyt_count'
        ));
END;
$$;

-- Function to submit a user response to a clue
CREATE OR REPLACE FUNCTION submit_user_response(
    p_user_id text,
    p_response jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    _clue_id text;
    _collection_id text;
    _is_correct boolean;
    _current_correct_solves integer;
    _current_incorrect_solves integer;
    _current_total_solves integer;
    _correct_solves_needed integer;
    _is_mastered boolean;
    _was_mastered_before boolean;
    _default_solves_needed integer;
    _is_first_submission boolean;
    _new_correct_solves integer;
    _new_correct_solves_needed integer;
BEGIN
    -- Extract values from the response JSON
    _clue_id := p_response->>'clueId';
    _collection_id := p_response->>'collectionId';
    _is_correct := (p_response->>'isCorrect')::boolean;
    _default_solves_needed := 2;
    
    -- Get current progress data for the user and clue
    SELECT 
        COALESCE(uc.correct_solves, 0),
        COALESCE(uc.incorrect_solves, 0),
        COALESCE(uc.correct_solves, 0) + COALESCE(uc.incorrect_solves, 0),
        COALESCE(uc.correct_solves_needed, _default_solves_needed),
        COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, _default_solves_needed)
    INTO 
        _current_correct_solves,
        _current_incorrect_solves,
        _current_total_solves,
        _correct_solves_needed,
        _was_mastered_before
    FROM user__clue uc
    WHERE uc.user_id = p_user_id AND uc.clue_id = _clue_id;
    
    -- Check if this is the first submission
    _is_first_submission := NOT FOUND;
    
    -- If no progress record exists, create one with default values
    IF _is_first_submission THEN
        IF _is_correct THEN
            -- Correct response: create with 1 correct solve (one of which is fulfilled)
            INSERT INTO user__clue (user_id, clue_id, correct_solves, incorrect_solves, correct_solves_needed, last_solve)
            VALUES (p_user_id, _clue_id, 1, 0, _default_solves_needed, CURRENT_DATE)
            ON CONFLICT (user_id, clue_id) DO NOTHING;
            
            _current_correct_solves := 0;
            _new_correct_solves := 1;
            _new_correct_solves_needed := _default_solves_needed;
        ELSE
            -- Incorrect response: create with 4 correct solves needed
            INSERT INTO user__clue (user_id, clue_id, correct_solves, incorrect_solves, correct_solves_needed, last_solve)
            VALUES (p_user_id, _clue_id, 0, 1, 4, CURRENT_DATE)
            ON CONFLICT (user_id, clue_id) DO NOTHING;
            
            _current_correct_solves := 0;
            _new_correct_solves := 0;
            _new_correct_solves_needed := 4;
        END IF;
        
        -- Set default values for new record
        _current_incorrect_solves := 0;
        _current_total_solves := 0;
        _correct_solves_needed := _new_correct_solves_needed;
        _was_mastered_before := false;
    ELSE
        -- Update the progress based on the response
        IF _is_correct THEN
            -- Correct response: increment correct solves (only if not already mastered)
            IF NOT _was_mastered_before THEN
                _new_correct_solves := _current_correct_solves + 1;
                _new_correct_solves_needed := _correct_solves_needed;
                
                UPDATE user__clue 
                SET 
                    correct_solves = _new_correct_solves,
                    last_solve = CURRENT_DATE
                WHERE user_id = p_user_id AND clue_id = _clue_id;
            ELSE
                -- Already mastered, only update last solve date
                UPDATE user__clue 
                SET last_solve = CURRENT_DATE
                WHERE user_id = p_user_id AND clue_id = _clue_id;
                
                _new_correct_solves := _current_correct_solves;
                _new_correct_solves_needed := _correct_solves_needed;
            END IF;
        ELSE
            -- Incorrect response: increment incorrect solves and add 2 to correct solves needed
            _new_correct_solves_needed := _correct_solves_needed + 2;
            _new_correct_solves := _current_correct_solves;
            
            UPDATE user__clue 
            SET 
                incorrect_solves = _current_incorrect_solves + 1,
                correct_solves_needed = _new_correct_solves_needed,
                last_solve = CURRENT_DATE
            WHERE user_id = p_user_id AND clue_id = _clue_id;
        END IF;
    END IF;
    
    -- Check if clue is now mastered after this submission
    _is_mastered := _new_correct_solves >= _new_correct_solves_needed;
    
    -- Update user__collection progress as a side effect (if collection_id is provided and record exists)
    IF _collection_id IS NOT NULL THEN
        -- Check if user__collection record exists
        IF EXISTS (SELECT 1 FROM user__collection WHERE user_id = p_user_id AND collection_id = _collection_id) THEN
            -- If this was the first submission, move from unseen to in_progress
            IF _is_first_submission THEN
                UPDATE user__collection
                SET 
                    unseen = GREATEST(0, unseen - 1),
                    in_progress = in_progress + 1
                WHERE user_id = p_user_id AND collection_id = _collection_id;
            END IF;
            
            -- If clue is now mastered, move from in_progress to completed
            IF _is_mastered AND NOT _was_mastered_before THEN
                UPDATE user__collection
                SET 
                    in_progress = GREATEST(0, in_progress - 1),
                    completed = completed + 1
                WHERE user_id = p_user_id AND collection_id = _collection_id;
            END IF;
        END IF;
    END IF;
END;
$$;

-- Function to reopen a collection by incrementing correctResponsesNeeded for mastered clues
CREATE OR REPLACE FUNCTION reopen_collection(
    p_user_id text,
    p_collection_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Increment correct_solves_needed by 1 for all mastered clues in the collection
    -- A clue is considered mastered when correct_solves >= correct_solves_needed
    UPDATE user__clue 
    SET correct_solves_needed = correct_solves_needed + 1
    WHERE user_id = p_user_id 
    AND clue_id IN (
        SELECT cc.clue_id 
        FROM collection__clue cc 
        WHERE cc.collection_id = p_collection_id
    )
    AND correct_solves >= correct_solves_needed;
END;
$$;

-- Function to insert a user if they don't already exist (based on id)
CREATE OR REPLACE FUNCTION insert_user_if_not_exists(
    p_id text,
    p_email text,
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_native_lang text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "user" (id, email, first_name, last_name, native_lang, created_at)
    VALUES (p_id, p_email, p_first_name, p_last_name, p_native_lang, NOW())
    ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Function to initialize user collection progress if it doesn't exist
-- Creates a record with all clues marked as unseen
CREATE OR REPLACE FUNCTION initialize_user_collection_progress(
    p_user_id text,
    p_collection_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user__collection (user_id, collection_id, unseen, in_progress, completed)
    SELECT 
        p_user_id,
        p_collection_id,
        COUNT(*)::int,
        0,
        0
    FROM collection__clue
    WHERE collection_id = p_collection_id
    ON CONFLICT (user_id, collection_id) DO NOTHING;
END;
$$;
