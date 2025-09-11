import { ClueProgressData } from "./ClueProgressData";

export interface Clue {
    id?: string;
    entry: string;
    lang: string;
    clue?: string;
    customDisplayText?: string; // override for entry display text
    source?: string;  // crossword, book, etc.

    translatedClues?: Map<string, string>; // <lang, clue>
    progressData?: ClueProgressData;
};
