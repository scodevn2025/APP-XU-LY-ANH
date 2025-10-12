import React from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking on the image itself
      >
        <img 
          src={imageUrl} 
          alt="Zoomed result" 
          className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 sm:top-2 sm:right-2 p-2 bg-gray-800/70 hover:bg-gray-700 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close image view"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};
