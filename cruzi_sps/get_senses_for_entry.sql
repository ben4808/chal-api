CREATE OR REPLACE FUNCTION get_senses_for_entry(
    p_entry text,
    p_lang text
)
RETURNS TABLE(
    id text,
    part_of_speech text,
    commonness text,
    summary jsonb,
    definition jsonb,
    example_sentences jsonb,
    translations jsonb,
    source_ai text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.part_of_speech,
        s.commonness,
        -- Aggregate summaries by language
        jsonb_object_agg(st.lang, st.summary) FILTER (WHERE st.summary IS NOT NULL) as summary,
        -- Aggregate definitions by language
        jsonb_object_agg(st.lang, st.definition) FILTER (WHERE st.definition IS NOT NULL) as definition,
        -- Aggregate example sentences
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', es.id,
                    'sentence', est.sentence,
                    'lang', est.lang
                )
            ) FILTER (WHERE es.id IS NOT NULL),
            '[]'::jsonb
        ) as example_sentences,
        -- Aggregate translations
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'entry', set.entry,
                    'lang', set.lang,
                    'display_text', set.display_text
                )
            ) FILTER (WHERE set.entry IS NOT NULL),
            '[]'::jsonb
        ) as translations,
        s.source_ai
    FROM sense s
    LEFT JOIN sense_translation st ON s.id = st.sense_id
    LEFT JOIN example_sentence es ON s.id = es.sense_id
    LEFT JOIN example_sentence_translation est ON es.id = est.example_id
    LEFT JOIN sense_entry_translation set ON s.id = set.sense_id
    WHERE s.entry = p_entry AND s.lang = p_lang
    GROUP BY s.id, s.part_of_speech, s.commonness, s.source_ai;
END;
$$;
