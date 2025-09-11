import { Clue } from "./Clue";
import { CollectionProgressData } from "./CollectionProgressData";
import { Puzzle } from "./Puzzle";
import { User } from "./User";

export interface ClueCollection {
    id?: string;
    puzzle?: Puzzle;
    title: string;
    author?: string;
    creator?: User;
    description?: string;
    createdDate: Date;
    modifiedDate: Date;
    source?: string; // e.g. "NYT", "LA Times", etc. for URL
    isPrivate: boolean; // true if the collection is private
    metadata1?: string;
    metadata2?: string;

    progressData?: CollectionProgressData;
    clueCount?: number;
    clues?: Clue[];
};
