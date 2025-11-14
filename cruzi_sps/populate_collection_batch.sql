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
                        'correct_solves_needed', COALESCE(cd.correct_solves_needed, 0),
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
