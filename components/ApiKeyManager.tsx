import React, { useState, useEffect } from 'react';

interface ApiKeyManagerProps {
  apiKey: string;
  onApiKeySave: (key: string) => void;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKey, onApiKeySave }) => {
    const [localKey, setLocalKey] = useState(apiKey);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setLocalKey(apiKey);
    }, [apiKey]);

    const handleSave = () => {
        onApiKeySave(localKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-4 space-y-2">
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300">
                Gemini API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    id="api-key-input"
                    type="password"
                    value={localKey}
                    onChange={e => setLocalKey(e.target.value)}
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                    placeholder="Dán API Key của bạn vào đây"
                />
                <button
                    onClick={handleSave}
                    disabled={!localKey.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                    {saved ? 'Đã lưu!' : 'Lưu'}
                </button>
            </div>
            <p className="text-xs text-gray-500">
                API Key của bạn được lưu cục bộ.
                {' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    Lấy API Key ở đây.
                </a>
            </p>
        </div>
    );
};