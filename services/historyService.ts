import type { HistoryItem } from '../types';

const HISTORY_KEY = 'ai-studio-history';
const PROMPT_HISTORY_KEY = 'ai-studio-prompt-history';
const MAX_HISTORY_ITEMS = 100;
const MAX_PROMPT_HISTORY_ITEMS = 50;

// Helper function to safely parse JSON from localStorage
const safeJsonParse = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error parsing JSON from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

export const loadHistory = async (): Promise<HistoryItem[]> => {
    return Promise.resolve(safeJsonParse<HistoryItem[]>(HISTORY_KEY, []));
};

export const addItemsToHistory = async (items: HistoryItem[]): Promise<void> => {
    const currentHistory = await loadHistory();
    const newHistory = [...items, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    return Promise.resolve();
};

export const removeItemFromHistory = async (id: string): Promise<void> => {
    const currentHistory = await loadHistory();
    const newHistory = currentHistory.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    return Promise.resolve();
};

export const clearHistory = async (): Promise<void> => {
    localStorage.removeItem(HISTORY_KEY);
    return Promise.resolve();
};


export const loadPromptHistory = async (): Promise<string[]> => {
    return Promise.resolve(safeJsonParse<string[]>(PROMPT_HISTORY_KEY, []));
};

export const addPromptToHistory = async (prompt: string): Promise<void> => {
    const currentHistory = await loadPromptHistory();
    const newHistory = [prompt, ...currentHistory.filter(p => p !== prompt)].slice(0, MAX_PROMPT_HISTORY_ITEMS);
    localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(newHistory));
    return Promise.resolve();
};

export const clearPromptHistory = async (): Promise<void> => {
    localStorage.removeItem(PROMPT_HISTORY_KEY);
    return Promise.resolve();
};
