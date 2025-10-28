-- Mock Data for Guarani clues
-- This file contains sample data for testing and development

-- Insert sample users/authors
INSERT INTO "user" (id, first_name, last_name, email, native_lang, created_at) VALUES
('user_001', 'Cruzi', null, 'cruzi@gmail.com', 'en', '2024-01-01 10:00:00');

-- Insert sample entries (from sampleGuaraniClues.json)
INSERT INTO entry ("entry", root_entry, lang, "length", display_text, entry_type, familiarity_score, quality_score) VALUES
('CHOKOLÁTE', null, 'gn', 9, 'chokoláte', 'word', 30, 30),
('HAYHU', null, 'gn', 5, 'hayhu', 'word', 40, 40),
('MOÑE''Ẽ', null, 'gn', 7, 'moñe''ẽ', 'word', 20, 20),
('KUATIAÑE''Ẽ', null, 'gn', 10, 'kuatiañe''ẽ', 'word', null, null),
('JEROKY', null, 'gn', 6, 'jeroky', 'word', null, null),
('ARETE', null, 'gn', 5, 'arete', 'word', null, null),
('KANE''Õ', null, 'gn', 6, 'kane''õ', 'word', null, null);

-- Insert sample senses (from sampleGuaraniClues.json)
INSERT INTO sense (id, "entry", lang, part_of_speech, commonness, familiarity_score, quality_score, source_ai) VALUES
('sense_001', 'CHOKOLÁTE', 'gn', 'noun', 'primary', null, null, 'common_words'),
('sense_002', 'HAYHU', 'gn', 'verb', 'primary', null, null, 'common_words'),
('sense_003', 'MOÑE''Ẽ', 'gn', 'verb', 'primary', null, null, 'common_words'),
('sense_004', 'KUATIAÑE''Ẽ', 'gn', 'noun', 'primary', null, null, 'common_words'),
('sense_005', 'JEROKY', 'gn', 'verb', 'primary', null, null, 'common_words'),
('sense_006', 'ARETE', 'gn', 'noun', 'primary', null, null, 'common_words'),
('sense_007', 'KANE''Õ', 'gn', 'adjective', 'primary', null, null, 'common_words');

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
INSERT INTO clue_collection (id, title, author, description, created_date, modified_date, is_private, metadata1, metadata2, creator_id, puzzle_id, clue_count) VALUES
('collection_003', 'Guaraní Learning', 'Cruzi', 'Palabras básicas en guaraní.', '2024-01-16 14:30:00', '2024-01-16 14:30:00', false, NULL, NULL, 'user_001', null, 7);

-- Insert collection-clue relationships
INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1, metadata2) VALUES
('collection_003', 'clue_001', 1, NULL, NULL),
('collection_003', 'clue_004', 4, NULL, NULL),
('collection_003', 'clue_002', 2, NULL, NULL),
('collection_003', 'clue_003', 3, NULL, NULL),
('collection_003', 'clue_005', 5, NULL, NULL),
('collection_003', 'clue_006', 6, NULL, NULL),
('collection_003', 'clue_007', 7, NULL, NULL);

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
