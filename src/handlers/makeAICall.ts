import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StatusCodes } from 'http-status-codes';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const GEMINI_FLASH_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
] as const;

const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

function shuffledGeminiFlashModels(): string[] {
    const models = [...GEMINI_FLASH_MODELS];
    for (let i = models.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [models[i], models[j]] = [models[j], models[i]];
    }
    return models;
}

async function generateWithModel(modelId: string, prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Handler for making AI calls using Gemini.
 * Accepts a prompt in the request body and returns the AI response.
 * Based on the generateResultsAsync function from gemini.ts
 */
export async function makeAICall(req: Request, res: Response) {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Prompt is required and must be a string.'
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: 'Gemini API key not configured.'
            });
        }

        const modelsToTry = [...shuffledGeminiFlashModels(), GEMINI_FALLBACK_MODEL];
        let lastError: unknown;

        for (const modelId of modelsToTry) {
            try {
                const text = await generateWithModel(modelId, prompt);
                return res.status(StatusCodes.OK).json({
                    response: text,
                    success: true
                });
            } catch (error) {
                lastError = error;
                console.error(`Error making AI call with ${modelId}:`, error);
            }
        }

        console.error('All Gemini models failed. Last error:', lastError);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'An error occurred while processing the AI request.',
            success: false
        });

    } catch (error) {
        console.error('Error making AI call:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'An error occurred while processing the AI request.',
            success: false
        });
    }
}