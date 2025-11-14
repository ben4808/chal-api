-- Function to select a batch of clue IDs for a collection based on user progress
CREATE OR REPLACE FUNCTION select_collection_batch(
    p_collection_id TEXT,
    p_user_id TEXT DEFAULT NULL
)
RETURNS TEXT[] AS $$
DECLARE
    v_clue_ids TEXT[];
    v_eligible_clues RECORD;
    v_unseen_clues TEXT[];
    v_seen_clues TEXT[];
    v_target_unseen INT := 13;
    v_target_seen INT := 7;
    v_batch_size INT := 20;
BEGIN
    -- Initialize user collection progress if user is provided and progress doesn't exist
    IF p_user_id IS NOT NULL THEN
        PERFORM initialize_user_collection_progress(p_user_id, p_collection_id);
    END IF;

    -- If no user provided, return random batch of 20 clues
    IF p_user_id IS NULL THEN
        SELECT array_agg(clue_id ORDER BY random())
        INTO v_clue_ids
        FROM (
            SELECT clue_id
            FROM collection__clue
            WHERE collection_id = p_collection_id
            ORDER BY random()
            LIMIT v_batch_size
        ) sub;

        RETURN COALESCE(v_clue_ids, '{}');
    END IF;

    -- Get eligible clues (not completed and not seen in last 24 hours)
    CREATE TEMP TABLE eligible_clues ON COMMIT DROP AS
    SELECT
        cc.clue_id,
        CASE
            WHEN uc.correct_solves >= uc.correct_solves_needed THEN 'completed'
            WHEN uc.last_solve >= CURRENT_DATE - INTERVAL '1 day' THEN 'recent'
            WHEN uc.correct_solves > 0 OR uc.incorrect_solves > 0 THEN 'seen'
            ELSE 'unseen'
        END as status,
        uc.last_solve
    FROM collection__clue cc
    LEFT JOIN user__clue uc ON cc.clue_id = uc.clue_id AND uc.user_id = p_user_id
    WHERE cc.collection_id = p_collection_id
    AND (uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed)  -- not completed
    AND (uc.last_solve IS NULL OR uc.last_solve < CURRENT_DATE - INTERVAL '1 day'); -- not seen recently

    -- Get unseen clues ordered by earliest last_solve (NULL first, then oldest)
    SELECT array_agg(clue_id)
    INTO v_unseen_clues
    FROM (
        SELECT clue_id
        FROM eligible_clues
        WHERE status = 'unseen'
        ORDER BY last_solve NULLS FIRST, clue_id
    ) t;

    -- Get seen clues ordered by earliest last_solve
    SELECT array_agg(clue_id)
    INTO v_seen_clues
    FROM (
        SELECT clue_id
        FROM eligible_clues
        WHERE status = 'seen'
        ORDER BY last_solve NULLS FIRST, clue_id
    ) t;

    -- If no eligible clues, return random batch of 20 clues from collection
    IF (array_length(v_unseen_clues, 1) IS NULL OR array_length(v_unseen_clues, 1) = 0) AND
       (array_length(v_seen_clues, 1) IS NULL OR array_length(v_seen_clues, 1) = 0) THEN
        SELECT array_agg(clue_id ORDER BY random())
        INTO v_clue_ids
        FROM (
            SELECT clue_id
            FROM collection__clue
            WHERE collection_id = p_collection_id
            ORDER BY random()
            LIMIT v_batch_size
        ) sub;

        RETURN COALESCE(v_clue_ids, '{}');
    END IF;

    -- Build the batch according to target mix
    v_clue_ids := '{}';

    -- Add unseen clues (up to target, or all available)
    IF array_length(v_unseen_clues, 1) IS NOT NULL AND array_length(v_unseen_clues, 1) > 0 THEN
        v_clue_ids := array_cat(
            v_clue_ids,
            (SELECT array_agg(elem ORDER BY random())
             FROM (
                 SELECT elem
                 FROM unnest(v_unseen_clues) AS elem
                 LIMIT LEAST(v_target_unseen, array_length(v_unseen_clues, 1))
             ) sub)
        );
    END IF;

    -- Add seen clues (up to target, or all available)
    IF array_length(v_seen_clues, 1) IS NOT NULL AND array_length(v_seen_clues, 1) > 0 THEN
        v_clue_ids := array_cat(
            v_clue_ids,
            (SELECT array_agg(elem ORDER BY random())
             FROM (
                 SELECT elem
                 FROM unnest(v_seen_clues) AS elem
                 LIMIT LEAST(v_target_seen, array_length(v_seen_clues, 1))
             ) sub)
        );
    END IF;

    -- If we have fewer than 20 clues, fill remaining with additional unseen or seen clues
    IF array_length(v_clue_ids, 1) < v_batch_size THEN
        -- First try to fill with remaining unseen clues
        IF array_length(v_unseen_clues, 1) IS NOT NULL AND array_length(v_unseen_clues, 1) > v_target_unseen THEN
            v_clue_ids := array_cat(
                v_clue_ids,
                (SELECT array_agg(elem ORDER BY random())
                 FROM (
                     SELECT elem
                     FROM unnest(v_unseen_clues[v_target_unseen + 1:]) AS elem
                     LIMIT v_batch_size - array_length(v_clue_ids, 1)
                 ) sub)
            );
        END IF;

        -- If still need more, fill with remaining seen clues
        IF array_length(v_clue_ids, 1) < v_batch_size AND
           array_length(v_seen_clues, 1) IS NOT NULL AND array_length(v_seen_clues, 1) > v_target_seen THEN
            v_clue_ids := array_cat(
                v_clue_ids,
                (SELECT array_agg(elem ORDER BY random())
                 FROM (
                     SELECT elem
                     FROM unnest(v_seen_clues[v_target_seen + 1:]) AS elem
                     LIMIT v_batch_size - array_length(v_clue_ids, 1)
                 ) sub)
            );
        END IF;
    END IF;

    -- Final randomization of the batch
    SELECT array_agg(elem ORDER BY random())
    INTO v_clue_ids
    FROM unnest(v_clue_ids) AS elem;

    RETURN COALESCE(v_clue_ids, '{}');
END;
$$ LANGUAGE plpgsql;
