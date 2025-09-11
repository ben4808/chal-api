import { Sense } from "./Sense";

export interface Entry {
    entry: string;
    lang: string;
    rootEntry?: string; // for inflected forms
    displayText?: string;
    entryType?: string;
    familiarityScore?: number;
    qualityScore?: number;
    cruziScore?: number;

    senses?: Sense[];
    tags?: string[];
}
