import { Publication } from "./Publication";

export interface Puzzle {
    id?: string;
    publication: Publication;
    title: string;
    authors: string[];
    copyright: string;
    notes?: string;
    date: Date;
    source: string;
    lang?: string;
    width: number;
    height: number;
    sourceLink?: string; // Link to the source of the puzzle
}
