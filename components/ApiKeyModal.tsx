import React from 'react';
import { ApiKeyManager } from './ApiKeyManager';
import { CloseIcon } from './icons/CloseIcon';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeySave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, onApiKeySave }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 animate-fade-in-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Quản lý API Key</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>
        </div>
        <ApiKeyManager apiKey={apiKey} onApiKeySave={onApiKeySave} />
      </div>
    </div>
  );
};
