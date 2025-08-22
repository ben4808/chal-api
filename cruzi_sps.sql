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
                          END
            )
        )
        FROM clue_collection c
        -- Use a LEFT JOIN to include user data only if a creator_id exists
        LEFT JOIN "user" u ON c.creator_id = u.id
        -- Filter collections based on visibility rules
        WHERE c.is_private = FALSE OR c.creator_id = p_user_id
    );
END;
$$;

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