import { ClueProgressData } from "./ClueProgressData";

export interface Clue {
    id?: string;
    clue?: string;
    customDisplayText?: string; // override for display text
    source?: string;  // crossword, book, etc.
    metadata1?: string;  // puzzle index
    metadata2?: string;

    translatedClues?: Map<string, string>; // <lang, clue>
    progressData?: ClueProgressData;
};
