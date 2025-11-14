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
