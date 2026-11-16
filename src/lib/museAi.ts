/** Models makeAICall routes to Meta's Muse Ember API instead of Gemini or Cursor. */
const MUSE_MODELS = new Set(['muse-ember', 'muse-ember-1.0']);

const MUSE_API_BASE_URL = 'https://api.meta.ai/v1';
const MUSE_EMBER_MODEL_ID = 'muse-ember-1.0';
const MUSE_REASONING_EFFORT = 'high';
/** Stay under the /makeAICall route timeout of 120s. */
const MUSE_TIMEOUT_MS = 110_000;
const MUSE_ATTEMPTS = 3;
const MUSE_RETRY_DELAY_MS = 1_500;

export function isMuseModel(value: unknown): boolean {
    return typeof value === 'string' && MUSE_MODELS.has(value);
}

export function hasMuseApiKey(): boolean {
    return !!process.env.MUSE_API_KEY?.trim();
}

function messageText(content: unknown): string {
    if (typeof content === 'string') return content.trim();
    if (!Array.isArray(content)) return '';
    return content.map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
            return String((part as { text?: unknown }).text || '');
        }
        return '';
    }).join('').trim();
}

function museErrorMessage(status: number, body: unknown): string {
    const apiMessage = (body as { error?: { message?: string } } | undefined)?.error?.message;
    const detail = apiMessage ? `: ${apiMessage}` : '';
    return `Muse API returned ${status}${detail}`;
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One text generation through Muse Ember at high reasoning effort.
 * Retries only fast gateway flakes (429/5xx); callers still handle longer retries.
 */
export async function generateWithMuse(prompt: string): Promise<string> {
    const apiKey = process.env.MUSE_API_KEY?.trim();
    if (!apiKey) throw new Error('MUSE_API_KEY environment variable is not set');

    let lastError: unknown;
    for (let attempt = 1; attempt <= MUSE_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(`${MUSE_API_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: MUSE_EMBER_MODEL_ID,
                    reasoning_effort: MUSE_REASONING_EFFORT,
                    messages: [{ role: 'user', content: prompt }],
                }),
                signal: AbortSignal.timeout(MUSE_TIMEOUT_MS),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error(museErrorMessage(response.status, body));
                if (attempt < MUSE_ATTEMPTS && isRetryableStatus(response.status)) {
                    lastError = error;
                    console.warn(`Muse Ember gateway error (attempt ${attempt}/${MUSE_ATTEMPTS}): ${error.message}`);
                    await sleep(MUSE_RETRY_DELAY_MS);
                    continue;
                }
                throw error;
            }
            const text = messageText((body as { choices?: { message?: { content?: unknown } }[] })
                .choices?.[0]?.message?.content);
            if (!text) throw new Error('Muse API returned an empty response');
            return text;
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            const retryable = /429|502|503|504|ECONNRESET|ETIMEDOUT|timed out/i.test(message);
            if (attempt < MUSE_ATTEMPTS && retryable) {
                console.warn(`Muse Ember request failed (attempt ${attempt}/${MUSE_ATTEMPTS}): ${message}`);
                await sleep(MUSE_RETRY_DELAY_MS);
                continue;
            }
            throw error instanceof Error ? error : new Error(message);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Muse API request failed');
}
