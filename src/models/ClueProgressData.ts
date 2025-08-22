export interface ClueProgressData {
    userId: string; // ID of the user
    clueId: string; // ID of the clue
    totalSolves: number; // Total number of solves for the clue
    correctSolves: number; // Number of correct solves for the clue
    incorrectSolves: number; // Number of incorrect solves for the clue
    lastSolveDate?: Date; // Date of the last solve attempt
}
