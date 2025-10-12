import type { HistoryItem } from '../types';

const DB_NAME = 'ai-character-studio-db';
const STORE_NAME = 'history';
const PROMPT_STORE_NAME = 'prompts';
const DB_VERSION = 2; // Incremented version for schema change

// Helper function to open and initialize the IndexedDB database
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // In case of a weird state, like incognito mode on some browsers
    if (!window.indexedDB) {
        reject('IndexedDB is not supported by this browser.');
        return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening IndexedDB.');
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create an index for sorting by timestamp
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(PROMPT_STORE_NAME)) {
        const promptStore = db.createObjectStore(PROMPT_STORE_NAME, { keyPath: 'id' });
        promptStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const loadHistory = async (): Promise<HistoryItem[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => {
            console.error('Error loading history:', getAllRequest.error);
            reject('Failed to load history from the database.');
        };

        getAllRequest.onsuccess = () => {
            // Sort by timestamp descending (newest first)
            const sortedHistory = getAllRequest.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sortedHistory);
        };
    });
};


export const addItemsToHistory = async (newItems: HistoryItem[]): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        transaction.onerror = () => {
            console.error('Transaction error:', transaction.error);
            reject('Failed to save items to the database.');
        };
        
        transaction.oncomplete = () => {
            resolve();
        };

        newItems.forEach(item => {
            store.put(item); // 'put' will add or update
        });
    });
};

export const removeItemFromHistory = async (id: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const deleteRequest = store.delete(id);

        deleteRequest.onerror = () => {
            console.error('Error deleting item:', deleteRequest.error);
            reject('Failed to remove item from the database.');
        };
        
        deleteRequest.onsuccess = () => {
            resolve();
        };
    });
};

export const clearHistory = async (): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const clearRequest = store.clear();

        clearRequest.onerror = () => {
            console.error('Error clearing history:', clearRequest.error);
            reject('Failed to clear the database.');
        };
        
        clearRequest.onsuccess = () => {
            resolve();
        };
    });
};

// New functions for prompt history
export const addPromptToHistory = async (prompt: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROMPT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(PROMPT_STORE_NAME);
        const request = store.put({ id: prompt, timestamp: Date.now() });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const loadPromptHistory = async (): Promise<string[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROMPT_STORE_NAME, 'readonly');
        const store = transaction.objectStore(PROMPT_STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => {
            const sorted = getAllRequest.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sorted.map(item => item.id));
        };
    });
};

export const clearPromptHistory = async (): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROMPT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(PROMPT_STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};
