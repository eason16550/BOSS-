
// This new file contains all the core logic for the boss timer bot.
// It replaces the need for the Gemini API, making the bot faster, more reliable, and free to operate.

import { BOSS_DATA } from '../bot-constants.js';

// --- Timezone Helper Functions ---

/**
 * Returns a Date object representing the current time in Taipei (UTC+8).
 * Since we cannot change the system timezone of the cloud server, we create a Date
 * object shifted by the offset difference.
 * @returns {Date}
 */
function getTaipeiNow() {
    const now = new Date();
    // 1. Get current UTC time in ms
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    // 2. Add 8 hours for Taipei
    const taipeiOffset = 8 * 60 * 60 * 1000;
    return new Date(utc + taipeiOffset);
}

/**
 * Parses a HHMMSS time string into a Date object (treated as Taipei Time).
 * @param {string} timeStr - The time string in HHMMSS format.
 * @param {Date} now - The current Taipei time (shifted Date object).
 * @returns {Date} A Date object representing the death time (shifted to Taipei Time).
 */
function parseTime(timeStr, now) {
    const hours = parseInt(timeStr.substring(0, 2), 10);
    const minutes = parseInt(timeStr.substring(2, 4), 10);
    const seconds = parseInt(timeStr.substring(4, 6), 10);
    
    // Start with a copy of the current Taipei time
    const deathDate = new Date(now.getTime());
    // Set the time from the user input
    deathDate.setHours(hours, minutes, seconds, 0);

    // Tolerance Check:
    // If the input time is in the future relative to 'now':
    // 1. If it's barely in the future (e.g., < 15 mins), assume it's TODAY (user clock drift or pre-typing).
    // 2. If it's far in the future (e.g., > 15 mins), assume it meant YESTERDAY.
    const diff = deathDate.getTime() - now.getTime();
    const toleranceMillis = 15 * 60 * 1000; // 15 minutes

    if (diff > 0) {
        if (diff > toleranceMillis) {
             // Too far in future, must be yesterday
             deathDate.setDate(deathDate.getDate() - 1);
        }
        // Else: Within tolerance, keep as Today (do nothing)
    }
    
    return deathDate;
}


/**
 * Formats a Date object into a YYYY-MM-DD HH:MM:SS string.
 * Note: The input date is expected to be already shifted to Taipei Time.
 * @param {Date} date - The shifted date to format.
 * @returns {string} The formatted date string.
 */
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats time only (HH:MM:SS).
 */
function formatTimeOnly(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Calculates the next spawn time.
 * @param {Date} deathTime - The death time (shifted to Taipei Time).
 * @param {number} durationMinutes - The respawn duration in minutes.
 * @param {Date} now - The current time (shifted to Taipei Time).
 * @returns {{nextSpawnTime: Date, missedCount: number}}
 */
function calculateNextSpawn(deathTime, durationMinutes, now) {
    const durationMillis = durationMinutes * 60 * 1000;
    
    // Calculate the very first spawn time after the recorded death.
    let nextSpawnTime = new Date(deathTime.getTime() + durationMillis);
    let missedCount = 0;

    // Keep advancing the spawn time and counting missed spawns
    // as long as the calculated spawn time is in the past relative to 'now'.
    while (nextSpawnTime.getTime() < now.getTime()) {
        nextSpawnTime.setTime(nextSpawnTime.getTime() + durationMillis);
        missedCount++;
    }

    return { nextSpawnTime, missedCount };
}

/**
 * Gets the current Taipei time as a HHMMSS string.
 * @returns {string}
 */
export function getTaipeiTimeHHMMSS() {
    const now = getTaipeiNow();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
}

// --- Centralized Command Analysis ---

/**
 * Analyzes a user message and determines the intent and parameters.
 * This ensures both the Server (state update) and the Bot (reply generation)
 * use the EXACT same logic to parse commands.
 * 
 * @param {string} message - The user's message.
 * @returns {Object|null} The analyzed command object or null if not recognized.
 * Possible return structures:
 * - { type: 'LIST_ALL' }
 * - { type: 'LIST_UPCOMING' }
 * - { type: 'RESET' }
 * - { type: 'BACKUP' }
 * - { type: 'RESTORE', data: string }
 * - { type: 'KILL', name: string }  // "K <name>"
 * - { type: 'DEATH_TIME', name: string, time: string } // "<name> <time>"
 */
export function analyzeMessage(message) {
    const trimmed = message.trim();
    
    if (trimmed === '王') return { type: 'LIST_ALL' };
    if (trimmed === '出') return { type: 'LIST_UPCOMING' };
    if (trimmed === '重置') return { type: 'RESET' };
    if (trimmed === '備份') return { type: 'BACKUP' };
    if (trimmed.startsWith('還原')) {
        const data = trimmed.substring(2).trim();
        return { type: 'RESTORE', data };
    }

    // Prepare Name Map
    const aliasToNameMap = new Map();
    // Create a list of all possible names (names + aliases) for Regex
    // We sort by length descending to ensure "304" matches before "3" or "4" if they exist.
    const allTokens = [];
    
    BOSS_DATA.forEach(boss => {
        aliasToNameMap.set(boss.name, boss.name);
        allTokens.push(boss.name);
        boss.aliases.forEach(alias => {
            aliasToNameMap.set(alias, boss.name);
            allTokens.push(alias);
        });
    });
    
    // Sort tokens by length descending to prevent partial matches (e.g. matching "4" inside "304")
    allTokens.sort((a, b) => b.length - a.length);
    // Escape regex special characters in names
    const escapedTokens = allTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const namePattern = escapedTokens.join('|');

    // 1. Check for Kill Command: "K <Name>" or "k <Name>"
    const killRegex = new RegExp(`^[Kk]\\s+(${namePattern})$`, 'i');
    const killMatch = trimmed.match(killRegex);
    if (killMatch) {
        const matchedName = killMatch[1];
        const canonicalName = aliasToNameMap.get(matchedName);
        if (canonicalName) {
            return { type: 'KILL', name: canonicalName };
        }
    }

    // 2. Check for Death Time Command: "<Name> <Time>"
    // Allows optional spaces. Matches strictly start/end or surrounded by spaces to avoid false positives.
    // But for a bot, usually the whole message is the command.
    // Regex: Start + Name + Space(opt) + 6 digits + End
    const deathTimeRegex = new RegExp(`^(${namePattern})\\s*(\\d{6})$`, 'i');
    const deathMatch = trimmed.match(deathTimeRegex);
    
    if (deathMatch) {
        const matchedName = deathMatch[1];
        const timeStr = deathMatch[2];
        const canonicalName = aliasToNameMap.get(matchedName);
        if (canonicalName) {
            return { type: 'DEATH_TIME', name: canonicalName, time: timeStr };
        }
    }

    return null;
}


// --- Logic for each Intent ---

function handleListAllBosses() {
    const bossList = BOSS_DATA.map(boss => {
        const aliases = boss.aliases.length > 0 ? ` (${boss.aliases.join(', ')})` : '';
        return `${boss.name}${aliases}: 重生時間 ${boss.durationMinutes} 分鐘`;
    }).join('\n');
    return `全頭目列表：\n${bossList}`;
}

function handleListUpcomingSpawns(deathTimes) {
    if (Object.keys(deathTimes).length === 0) {
        return "尚無任何頭目死亡紀錄可供排序。";
    }

    const now = getTaipeiNow();
    const upcomingSpawns = [];

    for (const bossName in deathTimes) {
        const deathTimeStr = deathTimes[bossName];
        const bossInfo = BOSS_DATA.find(b => b.name === bossName);
        if (bossInfo) {
            const deathTime = parseTime(deathTimeStr, now); 
            const { nextSpawnTime, missedCount } = calculateNextSpawn(deathTime, bossInfo.durationMinutes, now);
            
            let statusText = "";
            // If missedCount > 0, it means the 'nextSpawnTime' is actually a future cycle.
            // We want to indicate the user has missed previous cycles.
            if (missedCount > 0) {
                statusText = ` (已出 - 錯過${missedCount}次)`;
            }

            upcomingSpawns.push({
                bossName: bossInfo.name,
                spawnTime: nextSpawnTime,
                deathTime: deathTime,
                statusText: statusText
            });
        }
    }

    // Sort by spawn time
    upcomingSpawns.sort((a, b) => a.spawnTime.getTime() - b.spawnTime.getTime());

    const spawnList = upcomingSpawns.map(spawn => 
        `${formatDateTime(spawn.spawnTime)} - ${spawn.bossName} (死: ${formatTimeOnly(spawn.deathTime)})${spawn.statusText}`
    ).join('\n');

    return `下次頭目重生排序 (台灣時間)：\n${spawnList}`;
}

function handleBossDeathTime(bossName, deathTimeStr) {
    const bossInfo = BOSS_DATA.find(b => b.name === bossName);
    if (!bossInfo) {
        return `錯誤：找不到頭目 ${bossName}。`;
    }

    const now = getTaipeiNow();
    const deathTime = parseTime(deathTimeStr, now);
    const { nextSpawnTime, missedCount } = calculateNextSpawn(deathTime, bossInfo.durationMinutes, now);
    
    const statusText = missedCount > 0 ? ` (已出 - 錯過${missedCount}次)` : '';

    return `${bossInfo.name} 記錄死亡時間 ${formatTimeOnly(deathTime)}，下次重生為: ${formatDateTime(nextSpawnTime)}${statusText}`;
}

/**
 * Main function to process user messages.
 * Now uses analyzeMessage to determine intent first.
 * @param {string} userMessage - The raw text from the user.
 * @param {Record<string, string>} deathTimes - The current state of death times.
 * @returns {string | null} The response text, or null if the command is not recognized.
 */
export function processUserCommand(userMessage, deathTimes) {
    const command = analyzeMessage(userMessage);
    
    if (!command) return null;

    switch (command.type) {
        case 'LIST_ALL':
            return handleListAllBosses();
        
        case 'LIST_UPCOMING':
            return handleListUpcomingSpawns(deathTimes);
        
        case 'RESET':
            return "所有頭目死亡紀錄已清除。";

        case 'KILL':
            // Logic: For 'K' command, the caller (Server/App) should have already updated
            // the deathTimes with the current time. We just need to look it up.
            const killRecordedTime = deathTimes[command.name];
            if (killRecordedTime) {
                return handleBossDeathTime(command.name, killRecordedTime);
            } else {
                // Fallback if state update lagged (shouldn't happen with new structure)
                return handleBossDeathTime(command.name, getTaipeiTimeHHMMSS());
            }

        case 'DEATH_TIME':
            // Logic: The caller should have updated deathTimes with command.time.
            // We confirm the calculation using the provided time.
            return handleBossDeathTime(command.name, command.time);
            
        case 'BACKUP':
             // This string is handled in server.js mostly, but we return a placeholder here
             // just in case logic flow passes through.
             return JSON.stringify(deathTimes);

        case 'RESTORE':
             return "資料已還原。"; // Actual restore happens in server.js/App.tsx

        default:
            return null;
    }
}
