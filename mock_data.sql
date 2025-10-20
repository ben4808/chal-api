-- Mock Data for Chal API
-- This file contains sample data for testing and development

-- Insert sample users/authors
INSERT INTO "user" (id, first_name, last_name, email, native_lang, created_at) VALUES
('user_001', 'María', 'González', 'maria.gonzalez@example.com', 'es', '2024-01-01 10:00:00'),
('user_002', 'Carlos', 'Rodríguez', 'carlos.rodriguez@example.com', 'es', '2024-01-02 10:00:00'),
('user_003', 'Ana', 'Silva', 'ana.silva@example.com', 'gn', '2024-01-03 10:00:00'),
('user_004', 'Luis', 'Martínez', 'luis.martinez@example.com', 'es', '2024-01-04 10:00:00'),
('user_005', 'Elena', 'Fernández', 'elena.fernandez@example.com', 'en', '2024-01-05 10:00:00');

-- Insert sample publications
INSERT INTO publication (id, "name") VALUES
('pub_001', 'New York Times'),
('pub_002', 'Los Angeles Times'),
('pub_003', 'Guaraní Learning'),
('pub_004', 'Cruzi');

-- Insert sample puzzles
INSERT INTO puzzle (id, publication_id, "date", lang, author, title, copyright, notes, width, height, source_link) VALUES
('puzzle_001', 'New York Times', '2024-01-15', 'en', 'Will Shortz', 'NYT Crossword January 15, 2024', '© 2024 The New York Times', 'Daily crossword puzzle', 15, 15, 'https://www.nytimes.com/crosswords'),
('puzzle_002', 'Los Angeles Times', '2024-01-16', 'en', 'Rich Norris', 'LA Times Crossword January 16, 2024', '© 2024 Los Angeles Times', 'Daily crossword puzzle', 15, 15, 'https://www.latimes.com/games/crossword'),
('puzzle_003', 'Guaraní Learning', '2024-01-17', 'gn', 'Ana Silva', 'Guaraní Básico Collection', '© 2024 Guaraní Learning', 'Educational Guaraní language collection', 12, 12, 'https://guaranilearning.org');

-- Insert sample entries (from sampleGuaraniClues.json)
INSERT INTO entry ("entry", root_entry, lang, "length", display_text, entry_type, familiarity_score, quality_score) VALUES
('CHOKOLÁTE', 'chokoláte', 'gn', 9, 'chokoláte', 'word', 7, 8),
('HAYHU', 'hayhu', 'gn', 5, 'hayhu', 'word', 9, 9),
('MOÑE''Ẽ', 'moñe''ẽ', 'gn', 7, 'moñe''ẽ', 'word', 8, 8),
('KUATIAÑE''Ẽ', 'kuatiañe''ẽ', 'gn', 10, 'kuatiañe''ẽ', 'word', 6, 7),
('JEROKY', 'jeroky', 'gn', 6, 'jeroky', 'word', 8, 8),
('ARETE', 'arete', 'gn', 5, 'arete', 'word', 7, 7),
('KANE''Õ', 'kane''õ', 'gn', 6, 'kane''õ', 'word', 5, 6);

-- Insert sample senses (from sampleGuaraniClues.json)
INSERT INTO sense (id, "entry", lang, part_of_speech, commonness, familiarity_score, quality_score, source_ai) VALUES
('sense_001', 'CHOKOLÁTE', 'gn', 'noun', 'primary', 7, 8, 'gemini2.5'),
('sense_002', 'HAYHU', 'gn', 'verb', 'primary', 9, 9, 'gemini2.5'),
('sense_003', 'MOÑE''Ẽ', 'gn', 'verb', 'primary', 8, 8, 'gemini2.5'),
('sense_004', 'KUATIAÑE''Ẽ', 'gn', 'noun', 'primary', 6, 7, 'gemini2.5'),
('sense_005', 'JEROKY', 'gn', 'verb', 'primary', 8, 8, 'gemini2.5'),
('sense_006', 'ARETE', 'gn', 'noun', 'primary', 7, 7, 'gemini2.5'),
('sense_007', 'KANE''Õ', 'gn', 'adjective', 'primary', 5, 6, 'gemini2.5');

-- Insert sense translations
INSERT INTO sense_translation (sense_id, lang, summary, definition) VALUES
('sense_001', 'es', 'pasta de cacao y azúcar', 'Pasta hecha con cacao y azúcar molidos, a la que generalmente se añade canela o vainilla.'),
('sense_001', 'en', 'cocoa and sugar paste', 'Paste made from ground cocoa and sugar, to which cinnamon or vanilla is usually added.'),
('sense_002', 'es', 'amar, querer', 'Expresar amor o cariño hacia una persona, lugar o cosa.'),
('sense_002', 'en', 'to love, to care for', 'To express love or affection towards a person, place, or thing.'),
('sense_003', 'es', 'leer', 'Interpretar o pronunciar en voz alta un texto escrito.'),
('sense_003', 'en', 'to read', 'To interpret or read aloud written text.'),
('sense_004', 'es', 'libro', 'Conjunto de hojas impresas o escritas, encuadernadas, que contienen texto o información.'),
('sense_004', 'en', 'book', 'A set of printed or written pages, bound together, containing text or information.'),
('sense_005', 'es', 'bailar', 'Mover el cuerpo al ritmo de la música, generalmente en un evento social o festivo.'),
('sense_005', 'en', 'to dance', 'To move the body to the rhythm of music, usually at a social or festive event.'),
('sense_006', 'es', 'fiesta', 'Celebración o evento social donde las personas se reúnen para disfrutar, bailar o compartir.'),
('sense_006', 'en', 'party', 'A celebration or social event where people gather to enjoy, dance, or share.'),
('sense_007', 'es', 'cansado', 'Estado de fatiga o agotamiento físico o mental después de una actividad.'),
('sense_007', 'en', 'tired', 'A state of physical or mental fatigue after an activity.');

-- Insert sample clues (from sampleGuaraniClues.json)
INSERT INTO clue (id, entry, lang, sense_id, custom_clue, custom_display_text, source) VALUES
('clue_001', 'CHOKOLÁTE', 'gn', 'sense_001', NULL, NULL, 'Isabel'),
('clue_002', 'HAYHU', 'gn', 'sense_002', NULL, NULL, 'Isabel'),
('clue_003', 'MOÑE''Ẽ', 'gn', 'sense_003', NULL, NULL, 'Isabel'),
('clue_004', 'KUATIAÑE''Ẽ', 'gn', 'sense_004', NULL, NULL, 'Isabel'),
('clue_005', 'JEROKY', 'gn', 'sense_005', NULL, NULL, 'Isabel'),
('clue_006', 'ARETE', 'gn', 'sense_006', NULL, NULL, 'Isabel'),
('clue_007', 'KANE''Õ', 'gn', 'sense_007', NULL, NULL, 'Isabel');

-- Insert sample clue collections
INSERT INTO clue_collection (id, title, author, description, created_date, modified_date, is_private, metadata1, metadata2, creator_id, puzzle_id) VALUES
('collection_001', 'Idaho Counties', 'María Fuentes', 'Learn Idaho counties, county seats, and numbers.', '2024-01-15 10:00:00', '2024-01-15 10:00:00', false, NULL, NULL, 'user_001', 'puzzle_003'),
('collection_003', 'Guaraní Learning', 'Ana Silva', 'Palabras básicas en guaraní.', '2024-01-16 14:30:00', '2024-01-16 14:30:00', false, NULL, NULL, 'user_003', 'puzzle_003');

-- Insert collection-clue relationships
INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1, metadata2) VALUES
-- Collection 001: Guaraní Básico - Familia y Emociones
('collection_001', 'clue_001', 1, NULL, NULL),
('collection_001', 'clue_002', 2, NULL, NULL),
('collection_001', 'clue_003', 3, NULL, NULL),
('collection_001', 'clue_004', 4, NULL, NULL),
-- Collection 003: Guaraní Avanzado - Verbos de Acción
('collection_003', 'clue_002', 1, NULL, NULL),
('collection_003', 'clue_003', 2, NULL, NULL),
('collection_003', 'clue_005', 3, NULL, NULL),
('collection_003', 'clue_006', 4, NULL, NULL),
('collection_003', 'clue_007', 5, NULL, NULL);

-- Insert user-collection relationships (users who have access to collections)
INSERT INTO user__collection (user_id, collection_id, unseen, in_progress, completed) VALUES
-- User 001 (María) - has access to all collections
('user_001', 'collection_001', 0, 2, 2),  -- Guaraní Básico - partially completed
('user_001', 'collection_003', 3, 1, 1),  -- Guaraní Avanzado - mostly unseen
-- User 002 (Carlos) - has access to Guaraní Básico
('user_002', 'collection_001', 1, 1, 2),  -- Guaraní Básico - good progress
-- User 003 (Ana) - creator of Guaraní Avanzado, has access to all
('user_003', 'collection_001', 2, 0, 2),  -- Guaraní Básico - mostly completed
('user_003', 'collection_003', 2, 2, 1),  -- Guaraní Avanzado - moderate progress
-- User 004 (Luis) - has access to public collections only
('user_004', 'collection_001', 3, 1, 0),  -- Guaraní Básico - just started
-- User 005 (Elena) - has access to all collections
('user_005', 'collection_001', 0, 0, 4),  -- Guaraní Básico - completed
('user_005', 'collection_003', 4, 0, 1);  -- Guaraní Avanzado - mostly unseen

-- Insert user-clue progress data
INSERT INTO user__clue (user_id, clue_id, correct_solves_needed, correct_solves, incorrect_solves, last_solve) VALUES
-- User 001 progress
('user_001', 'clue_001', 2, 2, 0, '2024-01-15'),  -- CHOKOLÁTE - mastered
('user_001', 'clue_002', 2, 1, 1, '2024-01-15'),  -- HAYHU - in progress
('user_001', 'clue_003', 2, 0, 2, '2024-01-15'),  -- MOÑE'Ẽ - struggling
('user_001', 'clue_004', 2, 2, 0, '2024-01-15'),  -- KUATIAÑE'Ẽ - mastered
-- User 002 progress
('user_002', 'clue_001', 2, 2, 0, '2024-01-15'),  -- CHOKOLÁTE - mastered
('user_002', 'clue_002', 2, 2, 0, '2024-01-15'),  -- HAYHU - mastered
('user_002', 'clue_003', 2, 2, 0, '2024-01-15'),  -- MOÑE'Ẽ - mastered
('user_002', 'clue_004', 2, 2, 0, '2024-01-15'),  -- KUATIAÑE'Ẽ - mastered
-- User 003 progress
('user_003', 'clue_001', 2, 2, 0, '2024-01-16'),  -- CHOKOLÁTE - mastered
('user_003', 'clue_002', 2, 2, 0, '2024-01-16'),  -- HAYHU - mastered
('user_003', 'clue_003', 2, 0, 1, '2024-01-16'),  -- MOÑE'Ẽ - struggling
('user_003', 'clue_004', 2, 2, 0, '2024-01-16'),  -- KUATIAÑE'Ẽ - mastered
('user_003', 'clue_005', 2, 1, 0, '2024-01-16'),  -- JEROKY - in progress
('user_003', 'clue_006', 2, 1, 1, '2024-01-16'),  -- ARETE - in progress
-- User 004 progress
('user_004', 'clue_001', 2, 0, 1, '2024-01-16'),  -- CHOKOLÁTE - struggling
('user_004', 'clue_002', 2, 1, 0, '2024-01-16'),  -- HAYHU - in progress
-- User 005 progress
('user_005', 'clue_001', 2, 2, 0, '2024-01-17'),  -- CHOKOLÁTE - mastered
('user_005', 'clue_002', 2, 2, 0, '2024-01-17'),  -- HAYHU - mastered
('user_005', 'clue_003', 2, 2, 0, '2024-01-17'),  -- MOÑE'Ẽ - mastered
('user_005', 'clue_004', 2, 2, 0, '2024-01-17'),  -- KUATIAÑE'Ẽ - mastered
('user_005', 'clue_007', 2, 2, 0, '2024-01-17');  -- KANE'Õ - mastered

-- Insert entry tags
INSERT INTO entry_tags ("entry", lang, tag, value) VALUES
('CHOKOLÁTE', 'gn', 'nyt_count', '0'),
('HAYHU', 'gn', 'nyt_count', '0'),
('MOÑE''Ẽ', 'gn', 'nyt_count', '0'),
('KUATIAÑE''Ẽ', 'gn', 'nyt_count', '0'),
('JEROKY', 'gn', 'nyt_count', '0'),
('ARETE', 'gn', 'nyt_count', '0'),
('KANE''Õ', 'gn', 'nyt_count', '0');

-- Insert entry scores
INSERT INTO entry_score ("entry", lang, familiarity_score, quality_score, source_ai) VALUES
('CHOKOLÁTE', 'gn', 7, 8, 'gemini2.5'),
('HAYHU', 'gn', 9, 9, 'gemini2.5'),
('MOÑE''Ẽ', 'gn', 8, 8, 'gemini2.5'),
('KUATIAÑE''Ẽ', 'gn', 6, 7, 'gemini2.5'),
('JEROKY', 'gn', 8, 8, 'gemini2.5'),
('ARETE', 'gn', 7, 7, 'gemini2.5'),
('KANE''Õ', 'gn', 5, 6, 'gemini2.5');

-- Insert sense entry translations (from sampleGuaraniClues.json)
INSERT INTO sense_entry_translation (sense_id, "entry", lang, display_text) VALUES
-- CHOKOLÁTE alternatives
('sense_001', 'chokora', 'gn', 'chokora'),
('sense_001', 'kakau', 'gn', 'kakau'),
-- HAYHU translations
('sense_002', 'amar', 'es', 'amar'),
('sense_002', 'querer', 'es', 'querer'),
('sense_002', 'love', 'en', 'love'),
('sense_002', 'care for', 'en', 'care for'),
-- MOÑE'Ẽ translations
('sense_003', 'leer', 'es', 'leer'),
('sense_003', 'lectura', 'es', 'lectura'),
('sense_003', 'read', 'en', 'read'),
('sense_003', 'reading', 'en', 'reading'),
-- KUATIAÑE'Ẽ translations
('sense_004', 'libro', 'es', 'libro'),
('sense_004', 'texto', 'es', 'texto'),
('sense_004', 'book', 'en', 'book'),
('sense_004', 'volume', 'en', 'volume'),
-- JEROKY translations
('sense_005', 'bailar', 'es', 'bailar'),
('sense_005', 'danza', 'es', 'danza'),
('sense_005', 'dance', 'en', 'dance'),
('sense_005', 'dancing', 'en', 'dancing'),
-- ARETE translations
('sense_006', 'fiesta', 'es', 'fiesta'),
('sense_006', 'celebración', 'es', 'celebración'),
('sense_006', 'party', 'en', 'party'),
('sense_006', 'celebration', 'en', 'celebration'),
-- KANE'Õ translations
('sense_007', 'cansado', 'es', 'cansado'),
('sense_007', 'fatigado', 'es', 'fatigado'),
('sense_007', 'tired', 'en', 'tired'),
('sense_007', 'weary', 'en', 'weary');

-- Insert example sentences (from sampleGuaraniClues.json)
INSERT INTO example_sentence (id, sense_id) VALUES
('ex_001_001', 'sense_001'),
('ex_001_002', 'sense_001'),
('ex_001_003', 'sense_001'),
('ex_002_001', 'sense_002'),
('ex_002_002', 'sense_002'),
('ex_002_003', 'sense_002'),
('ex_003_001', 'sense_003'),
('ex_003_002', 'sense_003'),
('ex_003_003', 'sense_003'),
('ex_004_001', 'sense_004'),
('ex_004_002', 'sense_004'),
('ex_004_003', 'sense_004'),
('ex_005_001', 'sense_005'),
('ex_005_002', 'sense_005'),
('ex_005_003', 'sense_005'),
('ex_006_001', 'sense_006'),
('ex_006_002', 'sense_006'),
('ex_006_003', 'sense_006'),
('ex_007_001', 'sense_007'),
('ex_007_002', 'sense_007');

-- Insert example sentence translations
INSERT INTO example_sentence_translation (example_id, lang, sentence) VALUES
-- CHOKOLÁTE examples
('ex_001_001', 'es', 'Se preparó chocolate con café para el desayuno.'),
('ex_001_001', 'en', 'Chocolate with coffee was prepared for breakfast.'),
('ex_001_001', 'gn', 'Ojejapo {{chokoláte}} kafe rehe rambosahagua.'),
('ex_001_002', 'es', 'El chocolate de gallina se ofrece antes de la ceremonia.'),
('ex_001_002', 'en', 'The chicken chocolate is offered before the ceremony.'),
('ex_001_002', 'gn', '{{Chokoláte}} ryguasundie oñeme''ẽ aretepe.'),
('ex_001_003', 'es', 'Esa niña prefiere el chocolate con té.'),
('ex_001_003', 'en', 'That girl prefers chocolate with tea.'),
('ex_001_003', 'gn', 'Pe mitãkuña oiporavo {{chokoláte}} ka''ay rehe.'),
-- HAYHU examples
('ex_002_001', 'es', 'Amo a mi amigo que va al monte.'),
('ex_002_001', 'en', 'I love my friend who goes to the forest.'),
('ex_002_001', 'gn', 'Che {{ahayhu}} che irũ ka''aguyre ohóvo.'),
('ex_002_002', 'es', 'Ella ama mucho a su hija por las tardes.'),
('ex_002_002', 'en', 'She loves her daughter a lot in the afternoons.'),
('ex_002_002', 'gn', 'Ha''e {{ohayhu}} heta itajy asajepe.'),
('ex_002_003', 'es', 'Nosotros amamos nuestra tierra donde trabajamos.'),
('ex_002_003', 'en', 'We love our land where we work.'),
('ex_002_003', 'gn', 'Ñande {{jahayhu}} ñande yvy romba''apóvape.'),
-- MOÑE'Ẽ examples
('ex_003_001', 'es', 'Leí un libro anoche.'),
('ex_003_001', 'en', 'I read a book last night.'),
('ex_003_001', 'gn', 'Che {{amoñe''ẽ}} peteĩ kuatiañe''ẽ kuehe pyhare.'),
('ex_003_002', 'es', 'El maestro lee mucho en guaraní.'),
('ex_003_002', 'en', 'The teacher reads a lot in Guaraní.'),
('ex_003_002', 'gn', 'Mbo''ehára {{omoñe''ẽ}} heta ñe''ẽ guaraniha.'),
('ex_003_003', 'es', 'Los niños leen un libro sobre plantas en la escuela.'),
('ex_003_003', 'en', 'The children read a book about plants at school.'),
('ex_003_003', 'gn', 'Mitãkuera {{omoñe''ẽ}} kuatia yvyratype mbo''ehaópe.'),
-- KUATIAÑE'Ẽ examples
('ex_004_001', 'es', 'Mi libro llegó anoche para leer.'),
('ex_004_001', 'en', 'My book arrived last night for reading.'),
('ex_004_001', 'gn', 'Che {{kuatiañe''ẽ}} oguahẽ kuehe pyhare oñemoñe''ẽravo.'),
('ex_004_002', 'es', 'Un libro nuevo se encuentra en la biblioteca de la escuela.'),
('ex_004_002', 'en', 'A new book is found in the school library.'),
('ex_004_002', 'gn', '{{Kuatiañe''ẽ}} pyahu ojejuhu mbo''ehaope.'),
('ex_004_003', 'es', 'Puso el libro sobre la mesa para leer.'),
('ex_004_003', 'en', 'She put the book on the table to read.'),
('ex_004_003', 'gn', 'Oñemoĩ {{kuatiañe''ẽ}} mesa ári oñemoñe''ẽvo.'),
-- JEROKY examples
('ex_005_001', 'es', 'Nosotros bailamos en una gran fiesta.'),
('ex_005_001', 'en', 'We danced at a big party.'),
('ex_005_001', 'gn', 'Ñande {{jajeroky}} peteĩ arete guasúpe.'),
('ex_005_002', 'es', 'La niña baila chamamé con alegría.'),
('ex_005_002', 'en', 'The girl dances chamamé with joy.'),
('ex_005_002', 'gn', 'Mitãkuña {{ojeroky}} chamamé vyape.'),
('ex_005_003', 'es', 'Él bailó polka anoche en el bosque.'),
('ex_005_003', 'en', 'He danced polka last night in the forest.'),
('ex_005_003', 'gn', 'Ha''e {{ojeroky}} polka pyharekue ka''aguýpe.'),
-- ARETE examples
('ex_006_001', 'es', 'La fiesta se realiza esta tarde.'),
('ex_006_001', 'en', 'The party is happening this afternoon.'),
('ex_006_001', 'gn', 'Pe {{arete}} oikota ka''aruete.'),
('ex_006_002', 'es', 'Nuestra fiesta se organiza en el monte.'),
('ex_006_002', 'en', 'Our party is organized in the forest.'),
('ex_006_002', 'gn', 'Ñande {{arete}} ojejapota ka''aguype.'),
('ex_006_003', 'es', 'Una gran fiesta tuvo lugar en mi casa anoche.'),
('ex_006_003', 'en', 'A big party took place at my house last night.'),
('ex_006_003', 'gn', '{{Arete}} guasu oikokuri che rogape kuehepyhare.'),
-- KANE'Õ examples
('ex_007_001', 'es', 'Estoy cansado después de caminar en el bosque.'),
('ex_007_001', 'en', 'I''m tired after walking in the forest.'),
('ex_007_001', 'gn', 'Che {{chekane''õ}} aguata rire ka''aguýpe.'),
('ex_007_002', 'es', 'Ella está muy cansada después de cocinar.'),
('ex_007_002', 'en', 'She is very tired after cooking.'),
('ex_007_002', 'gn', 'Ha''e {{ikane''õ}} heta ojapo cenagua rire.');

-- Insert sense entry scores
INSERT INTO sense_entry_score (sense_id, familiarity_score, quality_score, source_ai) VALUES
('sense_001', 7, 8, 'gemini2.5'),
('sense_002', 9, 9, 'gemini2.5'),
('sense_003', 8, 8, 'gemini2.5'),
('sense_004', 6, 7, 'gemini2.5'),
('sense_005', 8, 8, 'gemini2.5'),
('sense_006', 7, 7, 'gemini2.5'),
('sense_007', 5, 6, 'gemini2.5');
