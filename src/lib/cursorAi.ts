import { Agent, Cursor, JsonlLocalAgentStore, type ModelSelection } from '@cursor/sdk';
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
const CURSOR_GATEWAY_ATTEMPTS = 3;
const CURSOR_GATEWAY_RETRY_DELAY_MS = 1_500;

export function isCursorModel(value: unknown): value is CursorModel {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURSOR_MODEL_SELECTION, value);
}

export function hasCursorApiKey(): boolean {
    return !!process.env.CURSOR_API_KEY?.trim();
}

let sharedEmptyWorkspaceCwd: string | undefined;
let sharedLocalStore: JsonlLocalAgentStore | undefined;
let didConfigureCursor = false;

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

/**
 * Default SDK storage uses node:sqlite (Node >= 22.13). chal-api uses JSONL so
 * local Node 20 and any runtime without node:sqlite still work.
 */
function getCursorLocalStore(): JsonlLocalAgentStore {
    if (!sharedLocalStore) {
        const rootDir = process.env.CURSOR_AI_STORE_DIR
            ?? path.join(getCursorWorkspaceCwd(), '.cursor-agent-store');
        fs.mkdirSync(rootDir, { recursive: true });
        sharedLocalStore = new JsonlLocalAgentStore(rootDir);
    }
    return sharedLocalStore;
}

/**
 * Local agent inference still streams through Cursor's hosted API. HTTP/2 (the
 * SDK default) often surfaces as an HTML 502 from a gateway/proxy; HTTP/1.1 SSE
 * is the documented workaround.
 */
function ensureCursorConfigured(): void {
    if (didConfigureCursor) return;
    Cursor.configure({
        local: {
            store: getCursorLocalStore(),
            useHttp1ForAgent: true,
        },
    });
    didConfigureCursor = true;
}

function buildTextOnlyPrompt(prompt: string): string {
    return [
        'You are a text-generation API. Reply with only the final answer text.',
        'Do not use tools, web search, edit files, run shell commands, or ask follow-up questions.',
        '',
        prompt,
    ].join('\n');
}

function cursorErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (/502|Bad Gateway/i.test(message)) {
        return 'Cursor API returned 502 Bad Gateway';
    }
    const stripped = message.replace(/<html[\s\S]*/i, '').replace(/^\[unknown]\s*/i, '').trim();
    return stripped || message;
}

function isRetryableCursorGatewayError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /502|503|429|Bad Gateway|UNAVAILABLE|rate limit|high demand/i.test(message);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

async function promptCursorOnce(model: CursorModel, prompt: string, apiKey: string): Promise<string> {
    ensureCursorConfigured();
    const result = await withTimeout(
        Agent.prompt(buildTextOnlyPrompt(prompt), {
            apiKey,
            model: CURSOR_MODEL_SELECTION[model],
            // Text only — skip the default tool loop (shell/search) on this empty cwd.
            tools: [],
            local: {
                cwd: getCursorWorkspaceCwd(),
                store: getCursorLocalStore(),
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

/**
 * One text generation through the Cursor SDK. Retries only fast gateway flakes
 * (502/503/429); the web apps still handle longer application-level retries.
 */
export async function generateWithCursor(model: CursorModel, prompt: string): Promise<string> {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) throw new Error('CURSOR_API_KEY environment variable is not set');

    let lastError: unknown;
    for (let attempt = 1; attempt <= CURSOR_GATEWAY_ATTEMPTS; attempt++) {
        try {
            return await promptCursorOnce(model, prompt, apiKey);
        } catch (error) {
            lastError = error;
            if (attempt < CURSOR_GATEWAY_ATTEMPTS && isRetryableCursorGatewayError(error)) {
                console.warn(
                    `Cursor ${model} gateway error (attempt ${attempt}/${CURSOR_GATEWAY_ATTEMPTS}): ${cursorErrorMessage(error)}`,
                );
                await sleep(CURSOR_GATEWAY_RETRY_DELAY_MS);
                continue;
            }
            throw new Error(cursorErrorMessage(error));
        }
    }

    throw new Error(cursorErrorMessage(lastError));
}
