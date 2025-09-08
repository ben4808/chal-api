export interface EntryTranslation {
    naturalTranslations?: string[]; 
    colloquialTranslations?: string[]; 
    alternateWaysToSay?: string[];
    source_ai?: string; // Source of the translation (e.g., "Google Translate", "DeepL")
}
