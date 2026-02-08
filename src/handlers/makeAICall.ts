import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StatusCodes } from 'http-status-codes';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

        // Generate content using Gemini AI
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.status(StatusCodes.OK).json({
            response: text,
            success: true
        });

    } catch (error) {
        console.error('Error making AI call:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'An error occurred while processing the AI request.',
            success: false
        });
    }
}