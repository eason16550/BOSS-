// REMOVED: import { GoogleGenAI } from "@google/genai";
// REMOVED: import { BOSS_DATA } from '../constants';

// We need to tell TypeScript how to import the JS module.
// @ts-ignore
import { processUserCommand } from '../logic/bossLogic.js';

/**
 * This function now acts as a local wrapper around the shared business logic.
 * It no longer makes any network requests to the Gemini API.
 * @param userMessage The user's input text.
 * @param bossDeathTimes The current record of boss death times.
 * @returns A promise that resolves to the response string.
 */
export async function getChatResponse(userMessage: string, bossDeathTimes: Record<string, string>): Promise<string> {
    try {
        // Use the shared logic to get the response.
        const responseText = processUserCommand(userMessage, bossDeathTimes);

        // If the command is not recognized by the logic, it returns null.
        // We can provide a default message or just return an empty string.
        if (responseText === null) {
            // For the web UI, we might want to give feedback for invalid commands,
            // unlike the LINE bot which stays silent.
            // Let's keep it silent to match the bot's behavior.
            return ""; 
        }

        return responseText;

    } catch (error) {
        console.error("An error occurred in the local chat logic:", error);
        return "抱歉，處理您的請求時發生了本地錯誤。";
    }
}
