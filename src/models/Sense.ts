import { EntryTranslation } from "./EntryTranslation";

export interface Sense {
  id?: string;
  partOfSpeech?: string;
  commonness?: string;
  summary: Map<string, string>; // <lang, summary>
  definition?: Map<string, string>; // <lang, definition>
  exampleSentences?: [Map<string, string>]; // array of <lang, example sentence>
  translations?: Map<string, EntryTranslation>; // <lang, EntryTranslation>
  familiarityScore?: number;
  qualityScore?: number;
  sourceAi?: string; // Source of the sense (e.g., "ChatGPT", "WordNet")
}
