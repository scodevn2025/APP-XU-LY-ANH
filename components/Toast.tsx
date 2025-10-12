import React, { useEffect } from 'react';
import { ErrorIcon } from './icons/ErrorIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm bg-red-800/90 backdrop-blur-sm border border-red-600 text-white px-4 py-3 rounded-lg shadow-2xl flex items-start animate-fade-in-down">
      <div className="mr-3 pt-1">
        <ErrorIcon />
      </div>
      <div className="flex-grow text-sm">
        <p className="font-bold">Đã xảy ra lỗi</p>
        <p className="mt-1">{message}</p>
      </div>
      <button 
        onClick={onClose} 
        className="ml-4 -mr-2 -mt-1 p-1 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close notification"
      >
        <CloseIcon />
      </button>
    </div>
  );
};
