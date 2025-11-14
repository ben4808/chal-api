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
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 'Completed'
                ELSE 'In Progress'
            END AS progress_status,
            -- Progress display text
            CASE
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 'Unseen'
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 'Completed'
                ELSE COALESCE(uc.correct_solves, 0)::text || '/' || COALESCE(uc.correct_solves_needed, 2)::text
            END AS progress_display,
            -- Progress sort helper: 1 for Completed, 2 for In Progress, 3 for Unseen
            CASE
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 3
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 1
                ELSE 2
            END AS progress_sort_order,
            -- Progress solves needed for sorting In Progress clues
            COALESCE(uc.correct_solves_needed, 2) AS solves_needed,
            -- Status: loading_status from entry or 'Ready'
            COALESCE(e.loading_status, 'Ready') AS status,
            -- Senses: list of all senses for the entry
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'sense_id', s.id,
                        'sense_summary', COALESCE(
                            (SELECT st.summary
                             FROM sense_translation st
                             WHERE st.sense_id = s.id
                             AND st.lang = c.lang
                             LIMIT 1),
                            (SELECT st.summary
                             FROM sense_translation st
                             WHERE st.sense_id = s.id
                             AND st.lang = 'en'
                             LIMIT 1),
                            'N/A'
                        )
                    )
                )
                FROM sense s
                WHERE s.entry = c.entry AND s.lang = c.lang
            ) AS senses
        FROM collection__clue cc
        JOIN clue c ON cc.clue_id = c.id
        LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
        LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
        WHERE cc.collection_id = p_collection_id
        -- Apply progress filter
        AND (
            p_progress_filter IS NULL OR
            (p_progress_filter = 'Unseen' AND (p_user_id IS NULL OR uc.user_id IS NULL)) OR
            (p_progress_filter = 'Completed' AND p_user_id IS NOT NULL AND uc.user_id IS NOT NULL
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
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 1 THEN answer END ASC, -- Completed: alphabetical
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
            'status', status,
            'senses', COALESCE(senses, '[]'::jsonb)
        )
    )
    INTO result_json
    FROM paginated_data;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
