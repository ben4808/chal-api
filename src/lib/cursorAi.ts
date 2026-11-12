import { Agent, type ModelSelection } from '@cursor/sdk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Models that makeAICall can route to the Cursor SDK instead of Gemini. */
export type CursorModel = 'grok-4.6';

/**
 * Explicit SDK selections so we never fall through to Fast defaults.
 * Mirrors CURSOR_MODEL_SELECTION in cruzi-aws/src/ai/cursor.ts.
 */
const CURSOR_MODEL_SELECTION: Record<CursorModel, ModelSelection> = {
    'grok-4.6': {
        id: 'grok-4.6',
        params: [
            { id: 'effort', value: 'medium' },
            { id: 'fast', value: 'false' },
        ],
    },
};

const CURSOR_REQUEST_TIMEOUT_MS = 110_000;

export function isCursorModel(value: unknown): value is CursorModel {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURSOR_MODEL_SELECTION, value);
}

export function hasCursorApiKey(): boolean {
    return !!process.env.CURSOR_API_KEY?.trim();
}

let sharedEmptyWorkspaceCwd: string | undefined;

/**
 * Empty workspace so the agent answers as a text model instead of exploring this repo.
 * Override with CURSOR_AI_CWD if you want a specific working directory.
 */
function getCursorWorkspaceCwd(): string {
    if (process.env.CURSOR_AI_CWD) return process.env.CURSOR_AI_CWD;
    if (!sharedEmptyWorkspaceCwd) {
        sharedEmptyWorkspaceCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'chal-cursor-ai-'));
    }
    return sharedEmptyWorkspaceCwd;
}

function buildTextOnlyPrompt(prompt: string): string {
    return [
        'You are a text-generation API. Reply with only the final answer text.',
        'Do not use tools, web search, edit files, run shell commands, or ask follow-up questions.',
        '',
        prompt,
    ].join('\n');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timeoutId = setTimeout(
                    () => reject(new Error(`Cursor AI request timed out after ${timeoutMs / 1000}s`)),
                    timeoutMs,
                );
            }),
        ]);
    } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
}

/**
 * One text generation through the Cursor SDK. Callers (the web apps) retry failures,
 * so this makes a single attempt rather than sleeping through long backoffs.
 */
export async function generateWithCursor(model: CursorModel, prompt: string): Promise<string> {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) throw new Error('CURSOR_API_KEY environment variable is not set');

    const result = await withTimeout(
        Agent.prompt(buildTextOnlyPrompt(prompt), {
            apiKey,
            model: CURSOR_MODEL_SELECTION[model],
            local: {
                cwd: getCursorWorkspaceCwd(),
                // Inline config only — do not load project/user Cursor settings.
                settingSources: [],
            },
        }),
        CURSOR_REQUEST_TIMEOUT_MS,
    );

    if (result.status === 'error') {
        throw new Error(result.error?.message ?? `Cursor run failed (id=${result.id})`);
    }
    if (result.status === 'cancelled') {
        throw new Error(`Cursor run was cancelled (id=${result.id})`);
    }
    const text = result.result?.trim();
    if (!text) throw new Error('Cursor API returned an empty response');
    return text;
}
