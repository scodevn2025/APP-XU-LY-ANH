
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
// Fix: Renamed ImageData to LocalImageData
import type { LocalImageData } from '../types';

interface ImageUploaderProps {
  label: string;
  // Fix: Renamed ImageData to LocalImageData
  onImageChange: (imageData: LocalImageData | null) => void;
  className?: string;
  // Fix: Renamed ImageData to LocalImageData
  image?: LocalImageData | null;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); // remove data:mime/type;base64, part
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = (error) => reject(error);
  });

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, onImageChange, className = '', image = null }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) return;
      try {
        const base64 = await fileToBase64(file);
        onImageChange({ base64, mimeType: file.type });
      } catch (error) {
        console.error('Error converting file to base64', error);
        onImageChange(null);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!image) {
        inputRef.current?.click();
    }
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      onImageChange(null);
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      className={`relative border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-indigo-500 hover:bg-gray-800/50 ${
        isDragActive ? 'border-indigo-500 bg-gray-800/50' : ''
      } ${className}`}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={(e) => handleFileChange(e.target.files)}
      />
      {image ? (
        <div 
            className="relative"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <img
                src={`data:${image.mimeType};base64,${image.base64}`}
                alt="Preview"
                className="mx-auto max-h-32 rounded-md object-contain"
            />
            {isHovering && (
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md">
                    <button
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white transition-colors"
                        aria-label="Remove image"
                    >
                        <TrashIcon />
                    </button>
                 </div>
            )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <UploadIcon />
          <p className="mt-2 text-sm">
            <span className="font-semibold text-indigo-400">Tải lên</span> hoặc kéo thả
          </p>
          <p className="text-xs">{label}</p>
        </div>
      )}
    </div>
  );
};

interface MultiImageUploaderProps {
  label: string;
  // Fix: Renamed ImageData to LocalImageData
  onImagesChange: (images: LocalImageData[]) => void;
  images: LocalImageData[];
  limit?: number;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({ label, onImagesChange, images, limit = 4 }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList) => {
        const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        const newImagesPromises = fileArray.map(async file => {
            try {
                const base64 = await fileToBase64(file);
                return { base64, mimeType: file.type };
            } catch(e) {
                console.error(e);
                return null;
            }
        });
        // Fix: Renamed ImageData to LocalImageData
        const newImages = (await Promise.all(newImagesPromises)).filter(img => img !== null) as LocalImageData[];

        const allImages = [...images, ...newImages];
        if (allImages.length > limit) {
            alert(`Bạn chỉ có thể tải lên tối đa ${limit} ảnh.`);
            onImagesChange(allImages.slice(0, limit));
        } else {
            onImagesChange(allImages);
        }
    };
  
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleRemoveImage = (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index));
    };
  
  return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            {images.map((img, index) => (
                <div key={index} className="relative group">
                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`upload-${index}`} className="w-full h-24 object-cover rounded-md"/>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                        <button onClick={() => handleRemoveImage(index)} className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white">
                            <TrashIcon />
                        </button>
                    </div>
                </div>
            ))}
        </div>
        {images.length < limit && (
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                className={`border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-indigo-500 hover:bg-gray-800/50 ${isDragActive ? 'border-indigo-500 bg-gray-800/50' : ''}`}
            >
                <input ref={inputRef} type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
                <div className="flex flex-col items-center justify-center text-gray-400">
                    <UploadIcon />
                    <p className="mt-2 text-sm"><span className="font-semibold text-indigo-400">Tải lên</span> hoặc kéo thả</p>
                    <p className="text-xs">{`Tối đa ${limit - images.length} ảnh`}</p>
                </div>
            </div>
        )}
      </div>
  )
}

interface VideoUploaderProps {
  label: string;
  onVideoChange: (file: File | null) => void;
  className?: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ label, onVideoChange, className = '' }) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('video/')) {
        alert('Vui lòng chọn một tệp video.');
        return;
      }
      const src = URL.createObjectURL(file);
      setVideoSrc(src);
      onVideoChange(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!videoSrc) inputRef.current?.click();
  };

  const handleRemoveVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null);
    onVideoChange(null);
    if(inputRef.current) inputRef.current.value = "";
  };

  useEffect(() => {
    // Cleanup object URL on unmount
    return () => {
        if(videoSrc) URL.revokeObjectURL(videoSrc);
    }
  }, [videoSrc]);

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      className={`relative border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-indigo-500 hover:bg-gray-800/50 ${isDragActive ? 'border-indigo-500 bg-gray-800/50' : ''} ${className}`}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept="video/*"
        onChange={(e) => handleFileChange(e.target.files)}
      />
      {videoSrc ? (
        <div className="relative group">
            <video
                src={videoSrc}
                controls
                className="mx-auto max-h-48 rounded-md"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md">
                <button
                    onClick={handleRemoveVideo}
                    className="p-2 bg-red-600/80 hover:bg-red-500 rounded-full text-white transition-colors"
                    aria-label="Remove video"
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <UploadIcon />
          <p className="mt-2 text-sm">
            <span className="font-semibold text-indigo-400">Tải lên</span> hoặc kéo thả video
          </p>
          <p className="text-xs">{label}</p>
        </div>
      )}
    </div>
  );
};
