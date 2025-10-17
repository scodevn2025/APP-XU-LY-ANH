

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
// Fix: Renamed ImageData to LocalImageData
import type { AppMode, GenerateOptions, EditOptions, SwapOptions, MagicOptions, AnalyzeOptions, AspectRatio, MagicAction, LocalImageData, OutputQuality, VideoOptions, ImageGenerateOptions, VideoAnalysisOptions, PhotoRestoreOptions, AutoFilterStyle, AITravelOptions } from '../types';
import { ASPECT_RATIOS, MAGIC_ACTIONS, PROMPT_SUGGESTION_TAGS, EDIT_FORM_TAGS, OUTPUT_QUALITIES, MODES, AI_TRAVEL_CONCEPTS, AUTO_FILTER_STYLES, TRAVEL_LOCATIONS, TRAVEL_OUTFITS } from '../constants';
import { ImageUploader, MultiImageUploader, VideoUploader } from './ImageUploader';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import * as geminiService from '../services/geminiService';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { MaskingEditor } from './MaskingEditor';
import { PersonIcon } from './icons/PersonIcon';
import { ShirtIcon } from './icons/ShirtIcon';
import { LandscapeIcon } from './icons/LandscapeIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ZoomIcon } from './icons/ZoomIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ConceptSelector } from './ConceptSelector';


interface InitialVideoOptions {
    // Fix: Renamed ImageData to LocalImageData
    image: LocalImageData;
    prompt: string;
    suggestions: string[];
}
interface ControlPanelProps {
  apiKey: string;
  mode: AppMode;
  onSubmit: (options: any) => void;
  isLoading: boolean;
  quality: OutputQuality['id'];
  onQualityChange: (quality: OutputQuality['id']) => void;
  cooldown: number;
  initialVideoOptions?: InitialVideoOptions | null;
  onClearInitialVideoOptions?: () => void;
  initialMagicImage?: LocalImageData | null;
  onClearInitialMagicImage?: () => void;
  onZoomImage: (url: string) => void;
  promptHistory: string[];
  onClearPromptHistory: () => void;
  isVeoKeySelected?: boolean;
  onVeoKeySelect?: () => void;
}

const QualitySelector: React.FC<{ quality: OutputQuality['id'], onQualityChange: (q: OutputQuality['id']) => void }> = ({ quality, onQualityChange }) => (
    <div>
        <label htmlFor="quality-selector" className="block text-sm font-medium text-gray-300 mb-2">Chất lượng đầu ra</label>
        <select 
            id="quality-selector" 
            value={quality} 
            onChange={e => onQualityChange(e.target.value as OutputQuality['id'])}
            className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
        >
            {OUTPUT_QUALITIES.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
        <div className="flex items-start text-xs text-gray-500 mt-2 p-2 bg-gray-900/50 rounded-md">
            <LightbulbIcon />
            <span className="ml-2">Chất lượng cao hơn có thể mất nhiều thời gian và chi phí hơn. Hiện tại, cài đặt này mang tính tham khảo.</span>
        </div>
    </div>
);

const PromptHistoryDropdown: React.FC<{
  history: string[];
  onSelect: (prompt: string) => void;
  onClear: () => void;
}> = ({ history, onSelect, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (prompt: string) => {
    onSelect(prompt);
    setIsOpen(false);
  };

  const handleClear = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử prompt không?")) {
      onClear();
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        title="Xem lịch sử prompt"
      >
        <HistoryIcon />
        <span>Xem lịch sử</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
          {history.length > 0 ? (
            <>
              <ul>
                {history.map((prompt, index) => (
                  <li
                    key={index}
                    onClick={() => handleSelect(prompt)}
                    className="p-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer truncate"
                    title={prompt}
                  >
                    {prompt}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-700 p-2">
                <button
                  onClick={handleClear}
                  className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:bg-red-900/50 rounded p-2 transition-colors"
                >
                  <TrashIcon /> Xóa lịch sử
                </button>
              </div>
            </>
          ) : (
            <p className="p-4 text-sm text-gray-400 text-center">Chưa có lịch sử prompt.</p>
          )}
        </div>
      )}
    </div>
  );
};


const PromptSuggestions: React.FC<{prompt: string, images?: LocalImageData[], onSelect: (suggestion: string) => void, initialSuggestions?: string[], mode: AppMode, apiKey: string}> = ({ prompt, images, onSelect, initialSuggestions, mode, apiKey }) => {
    // FIX: Explicitly typing the `suggestions` state as `string[]` to ensure type safety.
    const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions || []);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    useEffect(() => {
        if (initialSuggestions && initialSuggestions.length > 0) {
            setSuggestions(initialSuggestions);
        } else {
            setSuggestions([]); // Clear old suggestions when switching modes or clearing inputs
        }
    }, [initialSuggestions]);

    const handleSuggest = async () => {
        if (!prompt.trim() && (!images || images.length === 0)) {
            alert("Vui lòng nhập ý tưởng ban đầu hoặc tải ảnh lên để nhận gợi ý.");
            return;
        }
        setIsSuggesting(true);
        setSuggestions([]);
        try {
            const result = await geminiService.generatePromptSuggestions(apiKey, { prompt, images, mode });
            // FIX: Use a type predicate in the filter to ensure TypeScript correctly infers
            // the resulting array type as string[], preventing potential type errors.
            if (Array.isArray(result)) {
                const stringSuggestions = result.filter((item): item is string => typeof item === 'string');
                setSuggestions(stringSuggestions);
            } else {
                console.error("Expected suggestions to be an array of strings, but got:", result);
                setSuggestions([]);
            }
        } catch (error: any) {
            console.error(error);
            alert(`Không thể tạo gợi ý: ${error.message || 'Vui lòng thử lại.'}`);
            setSuggestions([]); // Also clear on error
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        // The user wants the entire JSON string to be loaded into the prompt box.
        // Therefore, we remove the special handling that extracts only the 'description'.
        // This will now pass the full string for all modes.
        onSelect(suggestion);
    };
    
    const isDisabled = !apiKey || isSuggesting;
    const title = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : isSuggesting ? "Đang lấy gợi ý..." : (suggestions.length > 0 ? "Tạo gợi ý khác" : "Gợi ý Prompt");

    return (
        <>
            {suggestions.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-400">Gợi ý từ AI (nhấn để sử dụng):</p>
                    {suggestions.map((s, i) => (
                        <div 
                            key={i} 
                            onClick={() => handleSuggestionClick(s)} 
                            className="p-2 bg-gray-700/50 rounded-md text-sm text-gray-300 cursor-pointer hover:bg-gray-700 transition-all duration-200"
                        >
                            {mode === 'video' ? (
                                <pre className="whitespace-pre-wrap text-xs font-mono">{s}</pre>
                            ) : (
                                s
                            )}
                        </div>
                    ))}
                </div>
            )}
            <button 
                type="button" 
                onClick={handleSuggest}
                disabled={isDisabled}
                title={title}
                className="mt-2 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
                {isSuggesting ? <SpinnerIcon /> : <SparklesIcon />}
                <span className="ml-2">{isSuggesting ? "Đang lấy gợi ý..." : (suggestions.length > 0 ? "Tạo gợi ý khác" : "Gợi ý Prompt")}</span>
            </button>
        </>
    );
};

const PromptAssistant: React.FC<{ onTagClick: (tag: string) => void, tags: Record<string, string[]>}> = ({ onTagClick, tags }) => {
    return (
        <div className="mt-2">
            <p className="text-xs text-gray-400 mb-1">Thêm chi tiết:</p>
            {/* FIX: Replaced Object.entries with Object.keys to avoid potential type inference issues with TypeScript, ensuring `tags[category]` is correctly typed as string[]. */}
            {Object.keys(tags).map(category => (
                <div key={category} className="mb-2">
                    <p className="text-xs font-semibold text-gray-300">{category}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {tags[category].map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => onTagClick(tag)}
                                className="px-2 py-0.5 bg-gray-700 text-xs text-gray-300 rounded-full hover:bg-gray-600 transition-colors"
                            >
                                + {tag}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const VideoForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, initialVideoOptions, onClearInitialVideoOptions, quality, onQualityChange, apiKey, promptHistory, onClearPromptHistory, isVeoKeySelected, onVeoKeySelect }) => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    // Fix: Renamed ImageData to LocalImageData
    const [image, setImage] = useState<LocalImageData | null>(null);
    const [initialSuggestions, setInitialSuggestions] = useState<string[] | undefined>();

    useEffect(() => {
        if (initialVideoOptions && onClearInitialVideoOptions) {
            setImage(initialVideoOptions.image);
            setPrompt(initialVideoOptions.prompt);
            setInitialSuggestions(initialVideoOptions.suggestions);
            onClearInitialVideoOptions(); // Consume the initial data
        }
    }, [initialVideoOptions, onClearInitialVideoOptions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            alert("Vui lòng nhập mô tả.");
            return;
        }
        const options: VideoOptions = { prompt, aspectRatio, image: image || undefined };
        onSubmit(options);
    };

    const handleTagClick = (tag: string) => {
        setPrompt(p => p ? `${p}, ${tag}` : tag);
    };
    
    const isDisabled = !apiKey || isLoading || cooldown > 0 || !prompt.trim() || !isVeoKeySelected;
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : !isVeoKeySelected ? "Vui lòng chọn một Dự án & API Key cho Veo trước." : "";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label htmlFor="prompt-video" className="block text-sm font-medium text-gray-300">Mô tả video (Prompt)</label>
                    <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
                </div>
                <textarea
                    id="prompt-video"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                    placeholder="VD: một con mèo đội mũ cao bồi đang cưỡi ngựa trên sao Hỏa, phong cách điện ảnh"
                />
                <PromptAssistant onTagClick={handleTagClick} tags={PROMPT_SUGGESTION_TAGS} />
                <PromptSuggestions 
                    apiKey={apiKey}
                    prompt={prompt} 
                    images={image ? [image] : undefined} 
                    onSelect={setPrompt} 
                    initialSuggestions={initialSuggestions}
                    mode="video" 
                />
            </div>

            <ImageUploader label="Ảnh đầu vào (tùy chọn)" image={image} onImageChange={setImage} />
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
                <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            type="button"
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`flex-1 p-2 border rounded-md text-xs transition-colors ${
                                aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                            }`}
                        >
                            {ratio}
                        </button>
                    ))}
                </div>
            </div>

            {!isVeoKeySelected && (
                <div className="p-3 my-2 bg-amber-900/50 border border-amber-700/80 rounded-lg text-center space-y-3 animate-fade-in-down">
                    <p className="text-sm text-amber-200">
                        Để tạo video với Veo, bạn cần chọn một dự án đã bật thanh toán.
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline font-semibold ml-1 hover:text-white">Tìm hiểu thêm</a>.
                    </p>
                    <button
                        type="button"
                        onClick={onVeoKeySelect}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-md text-sm shadow-md hover:shadow-lg transition-all"
                    >
                        Chọn Dự án & API Key
                    </button>
                </div>
            )}

            <p className="text-xs text-gray-500 mt-1 px-1">Lưu ý: Quá trình tạo video có thể mất vài phút.</p>

            <QualitySelector quality={quality} onQualityChange={onQualityChange} />

            <button
                type="submit"
                disabled={isDisabled}
                title={buttonTitle}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
                {isLoading && <SpinnerIcon />}
                {isLoading ? 'Đang tạo video...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Tạo video'}
            </button>
        </form>
    );
};


const GenerateForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, promptHistory, onClearPromptHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [referenceImages, setReferenceImages] = useState<LocalImageData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (referenceImages.length !== 1) {
        return;
    }
    const analyze = async () => {
        setIsAnalyzing(true);
        setPrompt(''); // Clear previous prompt
        try {
            const description = await geminiService.analyzeImage(apiKey, { image: referenceImages[0] });
            setPrompt(description);
        } catch (e: any) {
            console.error("Image analysis failed:", e);
            alert(`Không thể phân tích ảnh: ${e.message || 'Vui lòng thử lại.'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };
    analyze();
  }, [referenceImages, apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
        alert("Vui lòng nhập mô tả.");
        return;
    }
    const options: GenerateOptions = { 
        prompt, 
        aspectRatio, 
        numberOfImages,
        images: referenceImages,
    };
    onSubmit(options);
  };

  const handleTagClick = (tag: string) => {
      setPrompt(p => p ? `${p}, ${tag}` : tag);
  }
  
  const isDisabled = !apiKey || isLoading || cooldown > 0 || !prompt.trim() || isAnalyzing;
  const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : isAnalyzing ? "Đang phân tích ảnh..." : "";
  const buttonText = () => {
      if (isLoading) return 'Đang tạo...';
      if (cooldown > 0) return `Vui lòng đợi (${cooldown}s)`;
      return referenceImages.length > 0 ? 'Tạo biến thể' : 'Tạo ảnh';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <MultiImageUploader label="Ảnh tham chiếu (tối đa 3)" images={referenceImages} onImagesChange={setReferenceImages} limit={3} />
      <div>
        <div className="flex justify-between items-center mb-2">
            <label htmlFor="prompt-generate" className="block text-sm font-medium text-gray-300">Mô tả (Prompt)</label>
            <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
        </div>
        <textarea
          id="prompt-generate"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
          placeholder={isAnalyzing ? "Đang phân tích ảnh để tạo prompt..." : "VD: một chú mèo phi hành gia đang lướt ván trong vũ trụ, phong cách nghệ thuật số"}
          disabled={isAnalyzing}
        />
        <PromptAssistant onTagClick={handleTagClick} tags={PROMPT_SUGGESTION_TAGS} />
        <PromptSuggestions 
            apiKey={apiKey} 
            prompt={prompt} 
            images={referenceImages}
            onSelect={setPrompt} 
            mode="generate" 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              type="button"
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`flex-1 p-2 border rounded-md text-xs transition-colors ${
                aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

       <div>
          <label htmlFor="numberOfImages" className="block text-sm font-medium text-gray-300 mb-2">Số lượng ảnh: {numberOfImages}</label>
          <input
            type="range"
            id="numberOfImages"
            min="1"
            max="4"
            value={numberOfImages}
            onChange={e => setNumberOfImages(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
       </div>
      
      <QualitySelector quality={quality} onQualityChange={onQualityChange} />

      <button
        type="submit"
        disabled={isDisabled}
        title={buttonTitle}
        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {isLoading && <SpinnerIcon />}
        {buttonText()}
      </button>
    </form>
  );
};

const ProductShotForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, promptHistory, onClearPromptHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [image, setImage] = useState<LocalImageData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
        alert("Vui lòng tải lên ảnh sản phẩm.");
        return;
    }
    if (!prompt.trim()) {
        alert("Vui lòng nhập mô tả ý tưởng.");
        return;
    }
    const options: GenerateOptions = {
        prompt,
        aspectRatio,
        numberOfImages,
        images: image ? [image] : [],
    };
    onSubmit(options);
  };

  const handleTagClick = (tag: string) => {
      setPrompt(p => p ? `${p}, ${tag}` : tag);
  }

  const isDisabled = !apiKey || isLoading || cooldown > 0 || !prompt.trim() || !image;
  const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : !image ? "Vui lòng tải lên ảnh sản phẩm" : "";
  const buttonText = () => {
      if (isLoading) return 'Đang tạo...';
      if (cooldown > 0) return `Vui lòng đợi (${cooldown}s)`;
      return 'Tạo ảnh sản phẩm';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploader label="Ảnh sản phẩm" image={image} onImageChange={setImage} />
      <div>
        <div className="flex justify-between items-center mb-2">
            <label htmlFor="prompt-product" className="block text-sm font-medium text-gray-300">Mô tả ý tưởng</label>
            <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
        </div>
        <textarea
          id="prompt-product"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
          placeholder={"VD: một chai nước hoa đặt trên phiến đá ướt, xung quanh là rêu xanh, ánh sáng mềm mại chiếu từ bên cạnh"}
        />
        <PromptAssistant onTagClick={handleTagClick} tags={PROMPT_SUGGESTION_TAGS} />
        <PromptSuggestions
            apiKey={apiKey}
            prompt={prompt}
            images={image ? [image] : undefined}
            onSelect={setPrompt}
            mode="generate"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              type="button"
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`flex-1 p-2 border rounded-md text-xs transition-colors ${
                aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

       <div>
          <label htmlFor="numberOfImages-product" className="block text-sm font-medium text-gray-300 mb-2">Số lượng ảnh: {numberOfImages}</label>
          <input
            type="range"
            id="numberOfImages-product"
            min="1"
            max="4"
            value={numberOfImages}
            onChange={e => setNumberOfImages(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
       </div>

      <QualitySelector quality={quality} onQualityChange={onQualityChange} />

      <button
        type="submit"
        disabled={isDisabled}
        title={buttonTitle}
        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {isLoading && <SpinnerIcon />}
        {buttonText()}
      </button>
    </form>
  );
};

const ImageGenerateForm: React.FC<Omit<ControlPanelProps, 'mode'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, onZoomImage, promptHistory, onClearPromptHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<LocalImageData | null>(null); // Character
  const [conceptImage, setConceptImage] = useState<LocalImageData | null>(null); // Concept
  const [numberOfImages, setNumberOfImages] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzingPose, setIsAnalyzingPose] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const [extractedComponents, setExtractedComponents] = useState<{
    character1_transparent: LocalImageData;
    outfit1: LocalImageData;
    outfit2: LocalImageData;
    outfit3_transparent: LocalImageData;
    background1: LocalImageData;
    background2: LocalImageData;
  } | null>(null);
  
  // Component selection state
  const [backgroundSource, setBackgroundSource] = useState<'image1' | 'image2' | 'generated' | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<LocalImageData | null>(null);
  const [outfitSource, setOutfitSource] = useState<'outfit1' | 'outfit2' | 'outfit3_transparent' | null>(null);
  
  // Background generation state
  const [generatedBackground, setGeneratedBackground] = useState<LocalImageData | null>(null);
  const [backgroundPrompt, setBackgroundPrompt] = useState<string>('');
  const [isGeneratingBackground, setIsGeneratingBackground] = useState<boolean>(false);

  // Clear extracted components if source images change
  useEffect(() => {
    setExtractedComponents(null);
    setBackgroundSource(null);
    setExtractionError(null);
    setPrompt('');
    setSelectedOutfit(null);
    setOutfitSource(null);
    setGeneratedBackground(null);
    setBackgroundPrompt('');
  }, [image, conceptImage]);

  const handleExtract = async () => {
    if (!apiKey || !image || !conceptImage) return;
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const components = await geminiService.extractImageComponents(apiKey, image, conceptImage);
      setExtractedComponents(components);

      // Now, analyze the pose from the concept image
      setIsAnalyzingPose(true);
      try {
        const poseDescription = await geminiService.analyzePoseAndEmotion(apiKey, conceptImage);
        setPrompt(poseDescription);
      } catch (poseError: any) {
        console.error("Pose analysis failed:", poseError);
        // Don't block the user, just leave the prompt empty
        setPrompt(''); 
      } finally {
        setIsAnalyzingPose(false);
      }

    } catch(e: any) {
      console.error(e);
      setExtractionError(e.message || "Không thể tách thành phần. Vui lòng thử lại.");
    } finally {
      setIsExtracting(false);
    }
  };
  
  const handleGenerateBackground = async () => {
    if (!apiKey || !backgroundPrompt.trim()) return;
    setIsGeneratingBackground(true);
    try {
        const result = await geminiService.generateBackgroundImage(apiKey, backgroundPrompt, aspectRatio);
        setGeneratedBackground(result);
        setBackgroundSource('generated'); // Auto-select the newly generated background
    } catch (e: any) {
        console.error(e);
        alert(`Không thể tạo bối cảnh: ${e.message}`);
    } finally {
        setIsGeneratingBackground(false);
    }
  };

  const handleDownload = (base64: string, mimeType: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOutfitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!extractedComponents) return;
      const value = e.target.value;
      setOutfitSource(value as any);
      switch (value) {
          case 'outfit1': setSelectedOutfit(extractedComponents.outfit1); break;
          case 'outfit2': setSelectedOutfit(extractedComponents.outfit2); break;
          case 'outfit3_transparent': setSelectedOutfit(extractedComponents.outfit3_transparent); break;
          default: setSelectedOutfit(null);
      }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !conceptImage || !extractedComponents || !backgroundSource || !selectedOutfit) {
        alert("Vui lòng tải ảnh, tách thành phần, chọn bối cảnh và trang phục trước khi tạo ảnh.");
        return;
    }
    
    let selectedBackgroundImage: LocalImageData | null = null;
    if (backgroundSource === 'image1') {
        selectedBackgroundImage = extractedComponents.background1;
    } else if (backgroundSource === 'image2') {
        selectedBackgroundImage = extractedComponents.background2;
    } else if (backgroundSource === 'generated') {
        selectedBackgroundImage = generatedBackground;
    }

    if (!selectedBackgroundImage) {
        alert("Vui lòng chọn hoặc tạo một bối cảnh hợp lệ.");
        return;
    }

    const options: ImageGenerateOptions = { 
        prompt, 
        characterImage: extractedComponents.character1_transparent,
        selectedOutfitImage: selectedOutfit,
        selectedBackgroundImage,
        numberOfImages, 
        aspectRatio,
    };
    onSubmit(options);
  };
  
  const isSubmitDisabled = !apiKey || isLoading || cooldown > 0 || !image || !extractedComponents || !backgroundSource || !selectedOutfit;
  
  const getButtonTitle = () => {
    if (!apiKey) return "Vui lòng nhập API Key.";
    if (!image || !conceptImage) return "Vui lòng tải lên cả hai ảnh.";
    if (!extractedComponents) return "Vui lòng tách thành phần trước.";
    if (!backgroundSource) return "Vui lòng chọn bối cảnh.";
    if (!selectedOutfit) return "Vui lòng chọn trang phục.";
    return "Tạo biến thể";
  };
  
  const buttonTitle = getButtonTitle();

  const RadioCard = ({ value, label, group, current, onChange, icon, imageSrc, imageMime }: any) => (
    <label className={`relative flex-1 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${current === value ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
        <input type="radio" name={group} value={value} checked={current === value} onChange={onChange} className="sr-only" />
        <div className="flex flex-col items-center justify-center text-center">
             {imageSrc && <img src={`data:${imageMime};base64,${imageSrc}`} className="w-16 h-16 object-cover rounded-md mb-2" alt={label} />}
             <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-medium text-gray-200">{label}</span>
             </div>
        </div>
    </label>
  );


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 1: Tải ảnh lên</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <ImageUploader 
                label={'Ảnh Nhân Vật Gốc (Ảnh 1)'} 
                image={image} 
                onImageChange={setImage} 
            />
            <ImageUploader 
                label={'Ảnh Concept (Ảnh 2)'} 
                image={conceptImage} 
                onImageChange={setConceptImage} 
            />
        </div>
      </div>
      
      {image && conceptImage && !extractedComponents && (
        <div className="animate-fade-in-down">
          <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 2: Tách thành phần</h3>
          <p className="text-sm text-gray-400 mt-2">Nhấn nút bên dưới để AI tự động tách trang phục, bối cảnh và phân tích tư thế từ ảnh concept của bạn.</p>
           <button 
                type="button" 
                onClick={handleExtract}
                disabled={isExtracting || !apiKey}
                className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 disabled:bg-purple-400 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-105 active:scale-95"
            >
                {isExtracting ? <SpinnerIcon /> : <SparklesIcon />}
                <span className="ml-2">{isExtracting ? "Đang tách..." : "Tách thành phần & Phân tích"}</span>
            </button>
            {extractionError && <p className="text-sm text-red-400 mt-2">{extractionError}</p>}
        </div>
      )}

      {extractedComponents && image && conceptImage && (
        <div className="animate-fade-in-down space-y-6">
          <div>
              <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Kết quả đã tách</h3>
              <p className="text-xs text-gray-400 mt-2">Nhấn vào ảnh để xem kích thước đầy đủ. Di chuột để tải xuống.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center mt-4">
                <figure 
                    className="relative group cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => onZoomImage(`data:${extractedComponents.character1_transparent.mimeType};base64,${extractedComponents.character1_transparent.base64}`)}
                >
                    <img src={`data:${extractedComponents.character1_transparent.mimeType};base64,${extractedComponents.character1_transparent.base64}`} className="w-full h-full object-contain rounded-md mb-1 border-2 border-gray-600 transition-transform duration-300 group-hover:scale-105" alt="Nhân vật đã tách nền"/>
                    <figcaption className="text-xs text-gray-300">Nhân vật (Đã tách)</figcaption>
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onZoomImage(`data:${extractedComponents.character1_transparent.mimeType};base64,${extractedComponents.character1_transparent.base64}`); }} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Phóng to">
                            <ZoomIcon />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(extractedComponents.character1_transparent.base64, extractedComponents.character1_transparent.mimeType, 'nhan-vat-tach-nen.png'); }} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Tải xuống Nhân vật">
                            <DownloadIcon />
                        </button>
                    </div>
                </figure>
                <figure 
                    className="relative group cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => onZoomImage(`data:${extractedComponents.outfit1.mimeType};base64,${extractedComponents.outfit1.base64}`)}
                >
                    <img src={`data:${extractedComponents.outfit1.mimeType};base64,${extractedComponents.outfit1.base64}`} className="w-full object-cover rounded-md mb-1 border-2 border-gray-600 transition-transform duration-300 group-hover:scale-105" alt="Trang phục 1"/>
                    <figcaption className="text-xs text-gray-300">Trang phục Ảnh 1</figcaption>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onZoomImage(`data:${extractedComponents.outfit1.mimeType};base64,${extractedComponents.outfit1.base64}`)}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Phóng to">
                            <ZoomIcon />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(extractedComponents.outfit1.base64, extractedComponents.outfit1.mimeType, 'trang-phuc-1.jpeg')}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Tải xuống Trang phục 1">
                            <DownloadIcon />
                        </button>
                    </div>
                </figure>
                <figure 
                    className="relative group cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => onZoomImage(`data:${extractedComponents.outfit2.mimeType};base64,${extractedComponents.outfit2.base64}`)}
                >
                    <img src={`data:${extractedComponents.outfit2.mimeType};base64,${extractedComponents.outfit2.base64}`} className="w-full object-cover rounded-md mb-1 border-2 border-gray-600 transition-transform duration-300 group-hover:scale-105" alt="Trang phục 2"/>
                    <figcaption className="text-xs text-gray-300">Trang phục Ảnh 2</figcaption>
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onZoomImage(`data:${extractedComponents.outfit2.mimeType};base64,${extractedComponents.outfit2.base64}`)}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Phóng to">
                            <ZoomIcon />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(extractedComponents.outfit2.base64, extractedComponents.outfit2.mimeType, 'trang-phuc-2.jpeg')}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Tải xuống Trang phục 2">
                            <DownloadIcon />
                        </button>
                    </div>
                </figure>
                 <figure 
                    className="relative group cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => onZoomImage(`data:${extractedComponents.outfit3_transparent.mimeType};base64,${extractedComponents.outfit3_transparent.base64}`)}
                >
                    <img src={`data:${extractedComponents.outfit3_transparent.mimeType};base64,${extractedComponents.outfit3_transparent.base64}`} className="w-full object-contain h-full rounded-md mb-1 border-2 border-gray-600 transition-transform duration-300 group-hover:scale-105" alt="Trang phục 2 (Trong suốt)"/>
                    <figcaption className="text-xs text-gray-300">Trang phục Ảnh 2 (Trong suốt)</figcaption>
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onZoomImage(`data:${extractedComponents.outfit3_transparent.mimeType};base64,${extractedComponents.outfit3_transparent.base64}`)}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Phóng to">
                            <ZoomIcon />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(extractedComponents.outfit3_transparent.base64, extractedComponents.outfit3_transparent.mimeType, 'trang-phuc-2-trong-suot.png')}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Tải xuống Trang phục 2 (Trong suốt)">
                            <DownloadIcon />
                        </button>
                    </div>
                </figure>
                 <figure 
                    className="relative group cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => onZoomImage(`data:${extractedComponents.background2.mimeType};base64,${extractedComponents.background2.base64}`)}
                >
                    <img src={`data:${extractedComponents.background2.mimeType};base64,${extractedComponents.background2.base64}`} className="w-full object-cover rounded-md mb-1 border-2 border-gray-600 transition-transform duration-300 group-hover:scale-105" alt="Bối cảnh 2"/>
                    <figcaption className="text-xs text-gray-300">Bối cảnh Ảnh 2</figcaption>
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onZoomImage(`data:${extractedComponents.background2.mimeType};base64,${extractedComponents.background2.base64}`)}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Phóng to">
                            <ZoomIcon />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDownload(extractedComponents.background2.base64, extractedComponents.background2.mimeType, 'boi-canh-2.jpeg')}} className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white" title="Tải xuống Bối cảnh 2">
                            <DownloadIcon />
                        </button>
                    </div>
                </figure>
              </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 3: Trộn các thành phần</h3>
            <div className="space-y-4 mt-4 p-4 bg-gray-900/50 rounded-lg">
                {/* Character Source (Locked) */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nhân vật</label>
                    <div className="flex gap-2 p-3 bg-gray-800 border-2 border-indigo-700 rounded-lg">
                         <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-16 h-16 object-cover rounded-md" alt="Nhân vật gốc" />
                         <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <PersonIcon />
                                <span className="text-sm font-medium text-gray-200">Từ Ảnh 1 (Luôn giữ)</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Khuôn mặt và vóc dáng của nhân vật này sẽ được giữ lại.</p>
                         </div>
                    </div>
                </div>

                {/* Outfit Source */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chọn Trang phục & Tư thế</label>
                     <div className="flex flex-col sm:flex-row gap-4">
                        <RadioCard value="outfit1" label="Trang phục Ảnh 1" group="outfit" current={outfitSource} onChange={handleOutfitChange} icon={<ShirtIcon />} imageSrc={extractedComponents.outfit1.base64} imageMime={extractedComponents.outfit1.mimeType} />
                        <RadioCard value="outfit2" label="Trang phục Ảnh 2" group="outfit" current={outfitSource} onChange={handleOutfitChange} icon={<ShirtIcon />} imageSrc={extractedComponents.outfit2.base64} imageMime={extractedComponents.outfit2.mimeType} />
                        <RadioCard value="outfit3_transparent" label="Ảnh 2 (Trong suốt)" group="outfit" current={outfitSource} onChange={handleOutfitChange} icon={<ShirtIcon />} imageSrc={extractedComponents.outfit3_transparent.base64} imageMime={extractedComponents.outfit3_transparent.mimeType} />
                    </div>
                </div>


                {/* Background Source */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chọn Bối cảnh</label>
                     <div className="flex flex-col sm:flex-row gap-4">
                        <RadioCard value="image1" label="Từ Ảnh 1 (Đã tách)" group="background" current={backgroundSource} onChange={(e:any) => setBackgroundSource(e.target.value)} icon={<LandscapeIcon />} imageSrc={extractedComponents.background1.base64} imageMime={extractedComponents.background1.mimeType} />
                        <RadioCard value="image2" label="Từ Ảnh 2 (Đã tách)" group="background" current={backgroundSource} onChange={(e:any) => setBackgroundSource(e.target.value)} icon={<LandscapeIcon />} imageSrc={extractedComponents.background2.base64} imageMime={extractedComponents.background2.mimeType} />
                        <RadioCard value="generated" label={generatedBackground ? "Bối cảnh đã tạo" : "Tạo từ mô tả"} group="background" current={backgroundSource} onChange={(e:any) => setBackgroundSource(e.target.value)} icon={<SparklesIcon />} imageSrc={generatedBackground?.base64} imageMime={generatedBackground?.mimeType} />
                    </div>
                    {backgroundSource === 'generated' && (
                        <div className="mt-4 p-3 border border-gray-700 rounded-lg bg-gray-900/30 animate-fade-in-down">
                            <label htmlFor="background-prompt" className="block text-sm font-medium text-gray-300 mb-2">Mô tả bối cảnh bạn muốn tạo</label>
                            <textarea
                                id="background-prompt"
                                value={backgroundPrompt}
                                onChange={(e) => setBackgroundPrompt(e.target.value)}
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                                placeholder="VD: một bãi biển nhiệt đới lúc hoàng hôn, có những cây cọ"
                            />
                            <button
                                type="button"
                                onClick={handleGenerateBackground}
                                disabled={!backgroundPrompt.trim() || isGeneratingBackground || !apiKey}
                                className="mt-2 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                            >
                                {isGeneratingBackground ? <SpinnerIcon /> : <SparklesIcon />}
                                <span className="ml-2">{isGeneratingBackground ? 'Đang tạo...' : 'Tạo bối cảnh'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 4: Tinh chỉnh & Tạo ảnh</h3>
        <div className="space-y-4 mt-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
                <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                    <button
                    type="button"
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 p-2 border rounded-md text-xs transition-colors ${
                        aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                    >
                    {ratio}
                    </button>
                ))}
                </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="prompt-image-generate" className="block text-sm font-medium text-gray-300">Thêm chi tiết (tùy chỉnh)</label>
                <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
              </div>
              <textarea
                id="prompt-image-generate"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                placeholder={isAnalyzingPose ? 'Đang phân tích tư thế từ ảnh concept...' : 'VD: đang mỉm cười, cầm một bông hoa hồng'}
                disabled={isAnalyzingPose}
              />
            </div>

            <div>
              <label htmlFor="numberOfImages-img-gen" className="block text-sm font-medium text-gray-300 mb-2">Số lượng ảnh: {numberOfImages}</label>
              <input
                type="range"
                id="numberOfImages-img-gen"
                min="1"
                max="4"
                value={numberOfImages}
                onChange={e => setNumberOfImages(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1 px-1">Lưu ý: Mỗi ảnh mất khoảng 30 giây để tạo.</p>
           </div>
          
            <QualitySelector quality={quality} onQualityChange={onQualityChange} />
        </div>
      </div>


      <button
        type="submit"
        disabled={isSubmitDisabled}
        title={buttonTitle}
        className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {isLoading && <SpinnerIcon />}
        {isLoading ? 'Đang tạo...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Tạo biến thể'}
      </button>
    </form>
  );
};


const EditForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, promptHistory, onClearPromptHistory }) => {
    const [prompt, setPrompt] = useState('');
    // Fix: Renamed ImageData to LocalImageData
    const [characterImages, setCharacterImages] = useState<LocalImageData[]>([]);
    const [productImage, setProductImage] = useState<LocalImageData | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<LocalImageData | null>(null);
    const [numberOfVariations, setNumberOfVariations] = useState(2);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
    
    const allImages = useMemo(() => {
        const images = [...characterImages];
        if (productImage) images.push(productImage);
        if (backgroundImage) images.push(backgroundImage);
        return images;
    }, [characterImages, productImage, backgroundImage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            alert("Vui lòng nhập mô tả.");
            return;
        }
        if (characterImages.length === 0) {
            alert("Vui lòng tải lên ít nhất một ảnh nhân vật.");
            return;
        }
        
        const options: EditOptions = { 
            prompt: prompt.trim(), 
            characterImages, 
            productImage: productImage || undefined, 
            backgroundImage: backgroundImage || undefined, 
            numberOfVariations,
            aspectRatio: aspectRatio,
        };
        onSubmit(options);
    };
    
    const handleTagClick = (tag: string) => {
        setPrompt(p => p ? `${p}, ${tag}` : tag);
    }

    const isDisabled = !apiKey || isLoading || cooldown > 0 || !prompt.trim() || characterImages.length === 0;
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : "";


    return (
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="prompt-edit" className="block text-sm font-medium text-gray-300">Mô tả yêu cầu</label>
              <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
            </div>
            <textarea
              id="prompt-edit"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
              placeholder="VD: đặt nhân vật đứng cạnh sản phẩm trên một bãi biển lúc hoàng hôn"
            />
            <PromptAssistant onTagClick={handleTagClick} tags={EDIT_FORM_TAGS} />
            <PromptSuggestions apiKey={apiKey} prompt={prompt} images={allImages} onSelect={setPrompt} mode="edit" />
          </div>
          
          <MultiImageUploader label="Ảnh nhân vật (tối đa 4)" images={characterImages} onImagesChange={setCharacterImages} limit={4} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploader label="Ảnh sản phẩm" image={productImage} onImageChange={setProductImage} />
            <ImageUploader label="Ảnh nền" image={backgroundImage} onImageChange={setBackgroundImage} />
          </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
                <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                    <button
                    type="button"
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 p-2 border rounded-md text-xs transition-colors ${
                        aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                    >
                    {ratio}
                    </button>
                ))}
                </div>
            </div>
          
           <div>
              <label htmlFor="numberOfVariations" className="block text-sm font-medium text-gray-300 mb-2">Số phiên bản: {numberOfVariations}</label>
              <input type="range" id="numberOfVariations" min="1" max="4" value={numberOfVariations} onChange={e => setNumberOfVariations(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
              {numberOfVariations > 1 && <p className="text-xs text-gray-500 mt-1 px-1">Lưu ý: Mỗi phiên bản mất khoảng 30 giây để tạo do giới hạn API.</p>}
           </div>

          <QualitySelector quality={quality} onQualityChange={onQualityChange} />

          <button type="submit" disabled={isDisabled} title={buttonTitle} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95">
            {isLoading && <SpinnerIcon />}
            {isLoading ? 'Đang xử lý...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Thực hiện'}
          </button>
      </form>
    );
};

const MagicForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, initialMagicImage, onClearInitialMagicImage, promptHistory, onClearPromptHistory }) => {
    const [action, setAction] = useState<MagicAction>('creative');
    const [image, setImage] = useState<LocalImageData | null>(null);
    const [prompt, setPrompt] = useState('');
    const [mask, setMask] = useState<LocalImageData | null>(null);
    const [numberOfImages, setNumberOfImages] = useState(2);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
    const [filterStyle, setFilterStyle] = useState<AutoFilterStyle>('cinematic-teal-orange');

    useEffect(() => {
        if (initialMagicImage && onClearInitialMagicImage) {
            setImage(initialMagicImage);
            setPrompt('');
            setMask(null);
            setAction('creative');
            onClearInitialMagicImage();
        }
    }, [initialMagicImage, onClearInitialMagicImage]);

    useEffect(() => {
        setMask(null);
        if (action !== 'creative' && action !== 'change-background' && action !== 'remove-object') {
            setPrompt('');
        }
    }, [image, action]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) {
            alert("Vui lòng tải lên ảnh để chỉnh sửa.");
            return;
        }

        let options: MagicOptions;

        if (action === 'creative') {
            if (!prompt.trim()) {
                alert("Vui lòng nhập mô tả cho chỉnh sửa sáng tạo.");
                return;
            }
            options = { action, image, prompt, numberOfImages, aspectRatio };
        } else if (action === 'change-background') {
            if (!prompt.trim()) {
                alert("Vui lòng nhập mô tả cho nền mới.");
                return;
            }
            options = { action, image, prompt };
        } else if (action === 'remove-object') {
             if (!mask && !prompt.trim()) {
                alert("Vui lòng tô chọn vật thể cần xóa hoặc mô tả nó bằng văn bản.");
                return;
            }
            options = { action, image, prompt: prompt || undefined, mask: mask || undefined };
        } else if (action === 'auto-filter') {
            options = { action, image, filterStyle };
        }
        else {
            options = { action, image };
        }
        onSubmit(options);
    };

    const isPromptVisible = action === 'creative' || action === 'change-background' || action === 'remove-object';
    const isCreativeOptionsVisible = action === 'creative';
    const isMaskingVisible = action === 'remove-object';
    const isAutoFilterVisible = action === 'auto-filter';

    let isDisabled = !apiKey || isLoading || cooldown > 0 || !image;
    if (action === 'creative' && !prompt.trim()) isDisabled = true;
    if (action === 'change-background' && !prompt.trim()) isDisabled = true;
    if (action === 'remove-object' && !mask && !prompt.trim()) isDisabled = true;
        
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : "";
    
    const getPromptPlaceholder = () => {
        switch(action) {
            case 'creative': return 'VD: biến thành một chiến binh cyberpunk, bối cảnh thành phố neon';
            case 'change-background': return 'VD: một khu rừng huyền ảo';
            case 'remove-object': return 'VD: xóa chiếc xe hơi màu đỏ ở phía sau';
            default: return '';
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <ImageUploader label="Tải ảnh cần chỉnh sửa" image={image} onImageChange={setImage} />
            
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hành động</label>
                <div className="flex flex-wrap gap-2">
                  {MAGIC_ACTIONS.map((act) => (
                    <button type="button" key={act.id} onClick={() => setAction(act.id)} className={`flex-1 p-2 border rounded-md text-xs transition-colors text-center ${action === act.id ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                      {act.name}
                    </button>
                  ))}
                </div>
            </div>

            {isAutoFilterVisible && (
                <div className="space-y-3 animate-fade-in-down">
                    <label className="block text-sm font-medium text-gray-300">Chọn style filter</label>
                    <div className="grid grid-cols-2 gap-2">
                        {AUTO_FILTER_STYLES.map(style => (
                            <button
                                type="button"
                                key={style.id}
                                onClick={() => setFilterStyle(style.id)}
                                className={`p-2 border rounded-md text-xs transition-colors h-full ${filterStyle === style.id ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                            >
                                {style.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isMaskingVisible && image && (
                <div className="space-y-3 animate-fade-in-down">
                    <MaskingEditor image={image} onMaskChange={setMask} />
                </div>
            )}
            
            {isPromptVisible && (
                 <div className="animate-fade-in-down">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="prompt-magic" className="block text-sm font-medium text-gray-300">
                            Mô tả yêu cầu
                        </label>
                        <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
                    </div>
                    <textarea
                      id="prompt-magic"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                      placeholder={getPromptPlaceholder()}
                    />
                  </div>
            )}
            
            {isCreativeOptionsVisible && (
                <div className="space-y-4 animate-fade-in-down">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
                        <div className="flex flex-wrap gap-2">
                        {ASPECT_RATIOS.map((ratio) => (
                            <button
                            type="button"
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`flex-1 p-2 border rounded-md text-xs transition-colors ${
                                aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                            }`}
                            >
                            {ratio}
                            </button>
                        ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="numberOfImages-magic" className="block text-sm font-medium text-gray-300 mb-2">Số lượng ảnh: {numberOfImages}</label>
                        <input
                            type="range"
                            id="numberOfImages-magic"
                            min="1"
                            max="4"
                            value={numberOfImages}
                            onChange={e => setNumberOfImages(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            )}


            <QualitySelector quality={quality} onQualityChange={onQualityChange} />

            <button type="submit" disabled={isDisabled} title={buttonTitle} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95">
              {isLoading && <SpinnerIcon />}
              {isLoading ? 'Đang xử lý...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Áp dụng Magic'}
            </button>
        </form>
    );
};


const AnalyzeForm: React.FC<Omit<ControlPanelProps, 'mode' | 'quality' | 'onQualityChange' | 'onZoomImage' | 'promptHistory' | 'onClearPromptHistory'>> = ({ onSubmit, isLoading, cooldown, apiKey }) => {
    // Fix: Renamed ImageData to LocalImageData
    const [image, setImage] = useState<LocalImageData | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) {
            alert("Vui lòng tải lên ảnh để phân tích.");
            return;
        }
        const options: AnalyzeOptions = { image };
        onSubmit(options);
    };

    const isDisabled = !apiKey || isLoading || cooldown > 0 || !image;
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : "";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <ImageUploader label="Tải ảnh cần phân tích" image={image} onImageChange={setImage} />
            <button type="submit" disabled={isDisabled} title={buttonTitle} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-105 active:scale-95">
              {isLoading && <SpinnerIcon />}
              {isLoading ? 'Đang phân tích...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Phân tích ảnh'}
            </button>
        </form>
    );
};

const VideoAnalysisForm: React.FC<Omit<ControlPanelProps, 'mode' | 'quality' | 'onQualityChange' | 'onZoomImage' | 'promptHistory' | 'onClearPromptHistory'>> = ({ onSubmit, isLoading, cooldown, apiKey }) => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoFile) {
            alert("Vui lòng tải lên video để phân tích.");
            return;
        }
        setProcessing(true);
        try {
            setProgressMessage('Bắt đầu xử lý video...');
            const { frames, audio } = await geminiService.processVideoFile(videoFile, (p, msg) => {
                setProgress(p);
                setProgressMessage(msg);
            });
            setProgressMessage('Đang gửi dữ liệu đến AI...');
            const options: VideoAnalysisOptions = { frames, audio };
            onSubmit(options);
        } catch (error: any) {
            console.error("Video processing failed:", error);
            alert(`Lỗi xử lý video: ${error.message}`);
        } finally {
            setProcessing(false);
            setProgress(0);
            setProgressMessage('');
        }
    };

    const isDisabled = !apiKey || isLoading || cooldown > 0 || !videoFile || processing;
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key." : !videoFile ? "Vui lòng tải video lên." : "";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <VideoUploader label="Tải video cần phân tích" onVideoChange={setVideoFile} />
             {processing && (
                <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-center text-sm text-gray-400">{progressMessage} ({Math.round(progress)}%)</p>
                </div>
            )}
            <p className="text-xs text-gray-500 mt-1 px-1">Lưu ý: Quá trình xử lý và phân tích video có thể mất nhiều thời gian tùy thuộc vào độ dài và độ phân giải của video.</p>
            <button type="submit" disabled={isDisabled} title={buttonTitle} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-105 active:scale-95">
              {(isLoading || processing) && <SpinnerIcon />}
              {isLoading ? 'AI đang phân tích...' : processing ? 'Đang xử lý video...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Phân tích video'}
            </button>
        </form>
    );
};

const PhotoRestoreForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage' | 'quality' | 'onQualityChange'>> = ({ onSubmit, isLoading, cooldown, apiKey, promptHistory, onClearPromptHistory }) => {
    const [image, setImage] = useState<LocalImageData | null>(null);
    const [exclusionPrompt, setExclusionPrompt] = useState('Tuyệt đối không tự động thay nền');
    const [template, setTemplate] = useState('Phục chế chất lượng cao');
    const [gender, setGender] = useState<'Nam' | 'Nữ' | null>('Nam');
    const [age, setAge] = useState('25');
    const [enhancements, setEnhancements] = useState<string[]>([
        'Vẽ lại tóc chi tiết',
        'Người Châu Á (Tóc đen)',
        'Vẽ lại trang phục',
        'Làm rõ nét hậu cảnh',
        'Bám theo chi tiết khuôn mặt ảnh gốc',
    ]);
    
    const TEMPLATES = [
        'Phục chế chất lượng cao',
        'Phục chế & Tô màu',
        'Tái tạo ảnh hỏng nặng',
        'Khử ố vàng & Phai màu',
        'Phục chế chân dung nâng cao',
        'Phục hồi bức tranh và vẽ lại thật chi tiết'
    ];
    
    const ENHANCEMENT_OPTIONS = [
        'Vẽ lại tóc chi tiết',
        'Người Châu Á (Tóc đen)',
        'Vẽ lại trang phục',
        'Làm rõ nét hậu cảnh',
        'Bám theo chi tiết khuôn mặt ảnh gốc',
        'Chữ kí'
    ];

    const handleEnhancementChange = (option: string) => {
        setEnhancements(prev => 
            prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) {
            alert("Vui lòng tải lên ảnh để phục chế.");
            return;
        }
        const options: PhotoRestoreOptions = {
            image,
            exclusionPrompt,
            template,
            gender,
            age,
            enhancements,
        };
        onSubmit(options);
    };

    const isDisabled = !apiKey || isLoading || cooldown > 0 || !image;
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : !image ? "Vui lòng tải lên một ảnh." : "";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <ImageUploader label="Tải ảnh gốc cần phục chế" image={image} onImageChange={setImage} />
            
            <div>
                <label htmlFor="exclusion-prompt" className="block text-sm font-medium text-gray-300">Yêu cầu loại trừ (tùy chọn)</label>
                <input
                    id="exclusion-prompt"
                    type="text"
                    value={exclusionPrompt}
                    onChange={e => setExclusionPrompt(e.target.value)}
                    className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                    placeholder="VD: không thay đổi trang phục"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hoặc chọn một mẫu có sẵn</label>
                <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map(t => (
                        <button
                            type="button"
                            key={t}
                            onClick={() => setTemplate(t)}
                            className={`p-2 border rounded-md text-xs transition-colors h-full ${template === t ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Giới tính & Độ tuổi (tùy chọn)</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setGender('Nam')}
                        className={`flex-1 p-2 border rounded-md text-sm transition-colors ${gender === 'Nam' ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                    >
                        Nam
                    </button>
                    <button
                        type="button"
                        onClick={() => setGender('Nữ')}
                        className={`flex-1 p-2 border rounded-md text-sm transition-colors ${gender === 'Nữ' ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                    >
                        Nữ
                    </button>
                    <input
                        type="number"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        className="w-20 bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2 text-center"
                        placeholder="Tuổi"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tùy chọn thêm</label>
                <div className="space-y-2">
                    {ENHANCEMENT_OPTIONS.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={enhancements.includes(opt)}
                                onChange={() => handleEnhancementChange(opt)}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            </div>

            <button
                type="submit"
                disabled={isDisabled}
                title={buttonTitle}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
                {isLoading && <SpinnerIcon />}
                {isLoading ? 'Đang phục chế...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Phục Chế Ảnh'}
            </button>
        </form>
    );
};

const AITravelForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, promptHistory, onClearPromptHistory }) => {
    const [characterImages, setCharacterImages] = useState<LocalImageData[]>([]);
    const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
    const [customOutfitPrompt, setCustomOutfitPrompt] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [customLocationPrompt, setCustomLocationPrompt] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');
    const [numberOfImages, setNumberOfImages] = useState(2);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const outfitPrompt = selectedOutfitId === 'custom'
            ? customOutfitPrompt
            : TRAVEL_OUTFITS.find(o => o.id === selectedOutfitId)?.prompt || '';

        const locationPrompt = selectedLocationId === 'custom'
            ? customLocationPrompt
            : TRAVEL_LOCATIONS.find(l => l.id === selectedLocationId)?.prompt || '';
        
        if (characterImages.length === 0) {
            alert("Vui lòng tải ảnh của bạn.");
            return;
        }

        const options: AITravelOptions = {
            characterImages,
            outfitPrompt,
            locationPrompt,
            customPrompt,
            aspectRatio,
            numberOfImages,
        };
        onSubmit(options);
    };
    
    const handleTagClick = (tag: string) => {
      setCustomPrompt(p => p ? `${p}, ${tag}` : tag);
    };

    const isDisabled = !apiKey || isLoading || cooldown > 0 || characterImages.length === 0;
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key." : characterImages.length === 0 ? "Vui lòng tải ảnh của bạn." : "";
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 1: Tải ảnh của bạn</h3>
                <MultiImageUploader label="Ảnh chân dung rõ mặt (tối đa 3)" images={characterImages} onImagesChange={setCharacterImages} limit={3} />
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 2: Chọn trang phục &amp; địa điểm (tùy chọn)</h3>
                <div className="mb-4 mt-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Trang phục</p>
                    <div className="flex flex-wrap gap-2">
                        {TRAVEL_OUTFITS.map(outfit => (
                            <button
                                key={outfit.id}
                                type="button"
                                onClick={() => setSelectedOutfitId(outfit.id)}
                                className={`px-3 py-1 bg-gray-700 text-xs text-gray-300 rounded-full hover:bg-gray-600 transition-colors ${
                                    selectedOutfitId === outfit.id ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : ''
                                }`}
                            >
                                {selectedOutfitId === outfit.id ? '✓' : '+'} {outfit.name}
                            </button>
                        ))}
                         <button
                            key="custom"
                            type="button"
                            onClick={() => setSelectedOutfitId('custom')}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                selectedOutfitId === 'custom' 
                                ? 'bg-red-600 text-white ring-2 ring-red-400' 
                                : 'bg-amber-800/60 text-amber-200 hover:bg-amber-700/60'
                            }`}
                        >
                            {selectedOutfitId === 'custom' ? '✓' : '+'} Khác...
                        </button>
                    </div>
                    {selectedOutfitId === 'custom' && (
                        <textarea
                            value={customOutfitPrompt}
                            onChange={(e) => setCustomOutfitPrompt(e.target.value)}
                            rows={2}
                            className="mt-3 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                            placeholder="Nhập mô tả trang phục của bạn, VD: mặc một bộ váy dạ hội lấp lánh màu đen"
                        />
                    )}
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-300 mb-2">Địa điểm</p>
                     <div className="flex flex-wrap gap-2">
                        {TRAVEL_LOCATIONS.map(location => (
                            <button
                                key={location.id}
                                type="button"
                                onClick={() => setSelectedLocationId(location.id)}
                                className={`px-3 py-1 bg-gray-700 text-xs text-gray-300 rounded-full hover:bg-gray-600 transition-colors ${
                                    selectedLocationId === location.id ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : ''
                                }`}
                            >
                                {selectedLocationId === location.id ? '✓' : '+'} {location.name}
                            </button>
                        ))}
                         <button
                            key="custom"
                            type="button"
                            onClick={() => setSelectedLocationId('custom')}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                selectedLocationId === 'custom' 
                                ? 'bg-red-600 text-white ring-2 ring-red-400' 
                                : 'bg-amber-800/60 text-amber-200 hover:bg-amber-700/60'
                            }`}
                        >
                            {selectedLocationId === 'custom' ? '✓' : '+'} Khác...
                        </button>
                    </div>
                     {selectedLocationId === 'custom' && (
                        <textarea
                            value={customLocationPrompt}
                            onChange={(e) => setCustomLocationPrompt(e.target.value)}
                            rows={2}
                            className="mt-3 w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                            placeholder="Nhập mô tả địa điểm của bạn, VD: đứng trên một con đường lát sỏi ở một ngôi làng Ý cổ kính"
                        />
                    )}
                </div>
            </div>


             <div>
                <h3 className="text-lg font-semibold text-white mb-2 border-b border-gray-700 pb-2">Bước 3: Tinh chỉnh (tùy chọn)</h3>
                <div className="space-y-4 mt-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-300 mb-2">Gợi ý Concept Chụp ảnh</p>
                      <div className="flex flex-wrap gap-2">
                        {AI_TRAVEL_CONCEPTS.map(concept => (
                          <button
                            key={concept.id}
                            type="button"
                            onClick={() => setCustomPrompt(concept.prompt)}
                            className={`px-3 py-1 bg-gray-700 text-xs text-gray-300 rounded-full hover:bg-gray-600 transition-colors ${
                              customPrompt === concept.prompt ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : ''
                            }`}
                          >
                            + {concept.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="prompt-travel" className="block text-sm font-medium text-gray-300">Thêm chi tiết</label>
                            <PromptHistoryDropdown history={promptHistory} onSelect={setCustomPrompt} onClear={onClearPromptHistory} />
                        </div>
                        <textarea
                            id="prompt-travel"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                            placeholder="VD: mỉm cười rạng rỡ, nhìn vào máy ảnh, ánh sáng hoàng hôn"
                        />
                        <PromptAssistant onTagClick={handleTagClick} tags={PROMPT_SUGGESTION_TAGS} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ khung hình</label>
                        <div className="flex flex-wrap gap-2">
                            {ASPECT_RATIOS.map((ratio) => (
                                <button type="button" key={ratio} onClick={() => setAspectRatio(ratio)} className={`flex-1 p-2 border rounded-md text-xs transition-colors ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="numberOfImages-travel" className="block text-sm font-medium text-gray-300 mb-2">Số lượng ảnh: {numberOfImages}</label>
                        <input type="range" id="numberOfImages-travel" min="1" max="4" value={numberOfImages} onChange={e => setNumberOfImages(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <QualitySelector quality={quality} onQualityChange={onQualityChange} />
                </div>
            </div>

            <button type="submit" disabled={isDisabled} title={buttonTitle} className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed mt-4 transition-transform duration-200 hover:scale-105 active:scale-95">
                {isLoading && <SpinnerIcon />}
                {isLoading ? 'Đang tạo ảnh...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Bắt đầu chuyến du lịch!'}
            </button>
        </form>
    );
};


export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const { mode } = props;
    
    const FormComponent = useMemo(() => {
        const currentMode = MODES.find(m => m.id === mode);
        if (currentMode?.formComponent) {
            return currentMode.formComponent;
        }
        
        switch (mode) {
            case 'generate': return GenerateForm;
            case 'image-generate': return ImageGenerateForm;
            case 'product-shot': return ProductShotForm;
            case 'ai-travel': return AITravelForm;
            case 'edit': return EditForm;
            case 'magic': return MagicForm;
            case 'photo-restore': return PhotoRestoreForm;
            case 'analyze': return AnalyzeForm;
            case 'video': return VideoForm;
            case 'video-analysis': return VideoAnalysisForm;
            default: return () => null;
        }
    }, [mode]);

    return (
        <div className="p-4 sm:p-6">
            <FormComponent key={mode} {...props} />
        </div>
    );
};