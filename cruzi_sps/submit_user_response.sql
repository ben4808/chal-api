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
    _is_completed boolean;
    _was_completed_before boolean;
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
        _was_completed_before
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
        _was_completed_before := false;
    ELSE
        -- Update the progress based on the response
        IF _is_correct THEN
            -- Correct response: increment correct solves (only if not already completed)
            IF NOT _was_completed_before THEN
                _new_correct_solves := _current_correct_solves + 1;
                _new_correct_solves_needed := _correct_solves_needed;

                UPDATE user__clue
                SET
                    correct_solves = _new_correct_solves,
                    last_solve = CURRENT_DATE
                WHERE user_id = p_user_id AND clue_id = _clue_id;
            ELSE
                -- Already completed, only update last solve date
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

    -- Check if clue is now completed after this submission
    _is_completed := _new_correct_solves >= _new_correct_solves_needed;

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

            -- If clue is now completed, move from in_progress to completed
            IF _is_completed AND NOT _was_completed_before THEN
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
