
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

    // If the resulting time is in the future compared to 'now',
    // it means the death happened on the previous day.
    if (deathDate.getTime() > now.getTime()) {
        deathDate.setDate(deathDate.getDate() - 1);
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


// --- Logic for each Intent ---

/**
 * Intent 1: List all bosses ("王")
 */
function handleListAllBosses() {
    const bossList = BOSS_DATA.map(boss => {
        const aliases = boss.aliases.length > 0 ? ` (${boss.aliases.join(', ')})` : '';
        return `${boss.name}${aliases}: 重生時間 ${boss.durationMinutes} 分鐘`;
    }).join('\n');
    return `全頭目列表：\n${bossList}`;
}

/**
 * Intent 2: List upcoming spawns ("出")
 * @param {Record<string, string>} deathTimes - The recorded death times.
 */
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
            
            const missedText = missedCount > 0 ? ` (已錯過 ${missedCount} 次)` : '';

            upcomingSpawns.push({
                bossName: bossInfo.name,
                spawnTime: nextSpawnTime,
                missedText: missedText
            });
        }
    }

    // Sort by spawn time, earliest first
    upcomingSpawns.sort((a, b) => a.spawnTime.getTime() - b.spawnTime.getTime());

    const spawnList = upcomingSpawns.map(spawn => 
        `${formatDateTime(spawn.spawnTime)} - ${spawn.bossName}${spawn.missedText}`
    ).join('\n');

    return `下次頭目重生排序 (台灣時間)：\n${spawnList}`;
}

/**
 * Intent 3: Handle a specific boss death time
 * @param {string} bossName - The canonical name of the boss.
 * @param {string} deathTimeStr - The HHMMSS death time.
 */
function handleBossDeathTime(bossName, deathTimeStr) {
    const bossInfo = BOSS_DATA.find(b => b.name === bossName);
    if (!bossInfo) {
        return `錯誤：找不到頭目 ${bossName}。`;
    }

    const now = getTaipeiNow();
    const deathTime = parseTime(deathTimeStr, now);
    const { nextSpawnTime, missedCount } = calculateNextSpawn(deathTime, bossInfo.durationMinutes, now);
    
    const missedText = missedCount > 0 ? ` (已錯過 ${missedCount} 次)` : '';

    return `${bossInfo.name} 下次重生時間為: ${formatDateTime(nextSpawnTime)}${missedText}`;
}

/**
 * Main function to process user messages without AI.
 * @param {string} userMessage - The raw text from the user.
 * @param {Record<string, string>} deathTimes - The current state of death times.
 * @returns {string | null} The response text, or null if the command is not recognized.
 */
export function processUserCommand(userMessage, deathTimes) {
    const trimmedMessage = userMessage.trim();

    if (trimmedMessage === '王') {
        return handleListAllBosses();
    }

    if (trimmedMessage === '出') {
        return handleListUpcomingSpawns(deathTimes);
    }
    
    if (trimmedMessage === '重置') {
        return "所有頭目死亡紀錄已清除。";
    }

    // Intent 5: Current time death record ("K <boss>")
    // The logic is handled in two parts:
    // 1. The caller (server/UI) identifies the command and updates the state with the CURRENT time.
    // 2. This function here just needs to display the confirmation.
    const killRegex = /^[Kk]\s+(.+)/;
    const killMatch = trimmedMessage.match(killRegex);

    if (killMatch) {
        const aliasToNameMap = new Map();
        BOSS_DATA.forEach(boss => {
            aliasToNameMap.set(boss.name, boss.name);
            boss.aliases.forEach(alias => {
                aliasToNameMap.set(alias, boss.name);
            });
        });

        const inputName = killMatch[1].trim();
        const canonicalName = aliasToNameMap.get(inputName);
        
        if (canonicalName) {
            const recordedTime = deathTimes[canonicalName];
            
            if (recordedTime) {
                // If state was updated correctly, show the calculation
                return handleBossDeathTime(canonicalName, recordedTime);
            } else {
                 // Fallback: If for some reason state wasn't updated, use current Taipei time
                 const nowStr = getTaipeiTimeHHMMSS();
                 return handleBossDeathTime(canonicalName, nowStr);
            }
        }
    }

    // --- Intent 3: Boss Death Time Matching ("BossName HHMMSS") ---
    const allNamesAndAliases = BOSS_DATA.flatMap(b => [b.name, ...b.aliases]);
    const deathTimeRegex = new RegExp(`(^|\\s)(${allNamesAndAliases.join('|')})\\s*(\\d{6})($|\\s)`);
    const match = trimmedMessage.match(deathTimeRegex);

    if (match) {
        const aliasToNameMap = new Map();
        BOSS_DATA.forEach(boss => {
            aliasToNameMap.set(boss.name, boss.name);
            boss.aliases.forEach(alias => {
                aliasToNameMap.set(alias, boss.name);
            });
        });

        const inputName = match[2];
        const timeStr = match[3];
        const canonicalName = aliasToNameMap.get(inputName);

        if (canonicalName) {
            return handleBossDeathTime(canonicalName, timeStr);
        }
    }

    return null;
}
