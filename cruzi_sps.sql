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

    -- Handle sense_translation
    WITH translations AS (
        SELECT
            v_sense_id AS sense_id,
            key AS lang,
            value->>'summary' AS summary,
            value->>'definition' AS definition
        FROM jsonb_each(sense_data) AS t(key, value)
        WHERE key IN ('summary', 'definition')
    )
    INSERT INTO sense_translation (sense_id, lang, summary, definition)
    SELECT
        t.sense_id,
        t.lang,
        COALESCE(s.summary->>t.lang, t.summary),
        COALESCE(d.definition->>t.lang, t.definition)
    FROM translations AS t
    LEFT JOIN jsonb_each(sense_data->'summary') AS s(lang, summary) ON t.lang = s.lang
    LEFT JOIN jsonb_each(sense_data->'definition') AS d(lang, definition) ON t.lang = d.lang
    ON CONFLICT (sense_id, lang) DO UPDATE SET
        summary = COALESCE(EXCLUDED.summary, sense_translation.summary),
        definition = COALESCE(EXCLUDED.definition, sense_translation.definition);

    -- Handle sense_entry_translation (with bulk upsert)
    INSERT INTO sense_entry_translation (sense_id, "entry", lang, display_text)
    SELECT
        v_sense_id AS sense_id,
        unnested_translation->>'entry' AS "entry",
        unnested_translation->>'lang' AS lang,
        unnested_translation->>'displayText' AS display_text
    FROM (
        SELECT
            key AS lang,
            unnest(
                ARRAY(
                    SELECT jsonb_array_elements_text(
                        (value->'naturalTranslations')
                    )
                ) || ARRAY(
                    SELECT jsonb_array_elements_text(
                        (value->'colloquialTranslations')
                    )
                )  || ARRAY(
                    SELECT jsonb_array_elements_text(
                        (value->'alternatives')
                    )
                )
            ) AS unnested_translation
        FROM jsonb_each(sense_data->'translations')
    ) AS translations_data
    ON CONFLICT (sense_id, "entry", lang) DO UPDATE SET
        display_text = EXCLUDED.display_text;

    -- Handle example_sentence (with bulk upsert)
    INSERT INTO example_sentence (
        id,
        sense_id,
        lang,
        sentence
    )
    SELECT
        v_example_sentence->>'id' AS id,
        v_sense_id AS sense_id,
        example_key AS lang,
        example_value AS sentence
    FROM (
        SELECT
            v_example_sentence_data,
            jsonb_each_text(v_example_sentence_data) AS example_pair
        FROM jsonb_array_elements(sense_data->'examplesSentences') AS v_example_sentence_data
    ) AS t(v_example_sentence_data, example_key, example_value)
    ON CONFLICT (id) DO UPDATE SET
        sense_id = EXCLUDED.sense_id,
        lang = EXCLUDED.lang,
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
        -- Aggregate the results into a single JSONB array
        SELECT jsonb_agg(
            -- Construct a JSONB object for each clue collection
            jsonb_build_object(
                'id', c.id,
                'title', c.title,
                'author', c.author,
                'description', c.description,
                'is_private', c.is_private,
                'created_date', c.created_date,
                'metadata1', c.metadata1,
                'metadata2', c.metadata2,
                -- Nest the creator's data into a 'creator' key
                'creator', CASE WHEN u.id IS NOT NULL
                                THEN jsonb_build_object(
                                    'creator_id', u.id,
                                    'creator_first_name', u.first_name,
                                    'creator_last_name', u.last_name,
                                )
                                ELSE NULL
                          END,
                'user_progress', CASE WHEN p_user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'unseen', uc.unseen,
                            'in_progress', uc.in_progress,
                            'completed', uc.completed,
                        )
                    ELSE
                        NULL
                END
            )
        )

        FROM user__collection uc
        JOIN clue_collection c ON uc.collection_id = c.id
        LEFT JOIN "user" u ON c.creator_id = u.id
        WHERE uc.user_id = p_user_id
        AND uc.collection_id = ANY(p_collection_ids)
        AND (c.is_private = FALSE OR c.creator_id = p_user_id);
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

CREATE OR REPLACE FUNCTION get_collection(
    p_collection_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    result_json JSONB;
BEGIN
    SELECT
        jsonb_build_object(
            'id', c.id,
            'puzzle_id', c.puzzle_id,
            'title', c.title,
            'author', c.author,
            'description', c.description,
            'created_date', c.created_date,
            'modified_date', c.modified_date,
            'metadata1', c.metadata1,
            'metadata2', c.metadata2,
            'creator', jsonb_build_object(
                'id', u.id,
                'email', u.email,
                'first_name', u.first_name,
                'last_name', u.last_name
            )
        )
    INTO
        result_json
    FROM
        clue_collection c
    LEFT JOIN
        "user" u ON c.creator_id = u.id
    WHERE
        c.id = p_collection_id
    LIMIT 1;

    RETURN result_json;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_clues(
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
                'clue', c.clue,
                'source', c.source,
                'collection_order', cc.order,
                'metadata1', cc.metadata1,
                'metadata2', cc.metadata2,
                'user_progress', CASE
                    WHEN p_user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'total_solves', uc.total_solves,
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
        user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE
        cc.collection_id = p_collection_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_single_clue(
    p_clue_id text
)
RETURNS jsonb AS
$$
DECLARE
    clue_record jsonb;
BEGIN
    -- Select the entire row from the clue table where the id matches the input parameter.
    -- The to_jsonb() function is used to convert the entire row into a JSONB object.
    SELECT to_jsonb(c)
    INTO clue_record
    FROM clue AS c
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
                'obscurity_score', e.obscurity_score,
                'quality_score', e.quality_score,
                'senses', jsonb_agg(
                    jsonb_build_object(
                        'id', es.id,
                        'summary', es.summary,
                        'definition', es.definition,
                        'obscurity_score', es.obscurity_score,
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
            entry_sense es ON e.entry = es.entry AND e.lang = es.lang
        WHERE
            e.entry = p_entry
        GROUP BY
            e.entry, e.lang, e.length, e.display_text, e.entry_type, e.obscurity_score, e.quality_score
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
  quality_score int
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
        e.quality_score
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
