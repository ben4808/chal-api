CREATE OR REPLACE FUNCTION add_to_entry_info_queue(
  p_entry text,
  p_lang text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert the entry and the provided language into the entry_info_queue table.
    INSERT INTO entry_info_queue ("entry", lang)
    VALUES (p_entry, p_lang);
END;
$$;
