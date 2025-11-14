CREATE OR REPLACE FUNCTION upsert_entries(entries_data jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO entry ("entry", root_entry, lang, "length", display_text, entry_type, familiarity_score, quality_score, loading_status)
  SELECT
    elem->>'entry',
    elem->>'root_entry',
    elem->>'lang',
    (elem->>'length')::int,
    elem->>'display_text',
    elem->>'entry_type',
    (elem->>'familiarity_score')::int,
    (elem->>'quality_score')::int,
    elem->>'loading_status'
  FROM jsonb_array_elements(entries_data) AS elem
  ON CONFLICT ("entry", lang) DO UPDATE SET
    root_entry = COALESCE(EXCLUDED.root_entry, entry.root_entry),
    "length" = COALESCE(EXCLUDED."length", entry."length"),
    display_text = COALESCE(EXCLUDED.display_text, entry.display_text),
    entry_type = COALESCE(EXCLUDED.entry_type, entry.entry_type),
    familiarity_score = COALESCE(EXCLUDED.familiarity_score, entry.familiarity_score),
    quality_score = COALESCE(EXCLUDED.quality_score, entry.quality_score),
    loading_status = COALESCE(EXCLUDED.loading_status, entry.loading_status);
END;
$$ LANGUAGE plpgsql;
