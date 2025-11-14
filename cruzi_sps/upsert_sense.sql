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
