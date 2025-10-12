




import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
// Fix: Renamed ImageData to LocalImageData to avoid conflict with the built-in DOM type.
import type { AppMode, GenerateOptions, EditOptions, SwapOptions, MagicOptions, AnalyzeOptions, AspectRatio, MagicAction, LocalImageData, OutputQuality, VideoOptions, ImageGenerateOptions, VideoAnalysisOptions } from '../types';
import { ASPECT_RATIOS, MAGIC_ACTIONS, PROMPT_SUGGESTION_TAGS, EDIT_FORM_TAGS, OUTPUT_QUALITIES, MODES, CONCEPTS } from '../constants';
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
    // FIX: Correctly typed `suggestions` state as `string[]` to prevent type errors.
    // The previous `any` type was causing incorrect type inference.
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
            setSuggestions(result);
        } catch (error: any) {
            console.error(error);
            alert(`Không thể tạo gợi ý: ${error.message || 'Vui lòng thử lại.'}`);
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
                    {/* Add Array.isArray check to ensure suggestions is an array before mapping. */}
                    {Array.isArray(suggestions) && suggestions.map((s, i) => (
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
            {Object.entries(tags).map(([category, tagList]) => (
                <div key={category} className="mb-2">
                    <p className="text-xs font-semibold text-gray-300">{category}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {tagList.map(tag => (
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

const VideoForm: React.FC<Omit<ControlPanelProps, 'mode' | 'onZoomImage'>> = ({ onSubmit, isLoading, cooldown, initialVideoOptions, onClearInitialVideoOptions, quality, onQualityChange, apiKey, promptHistory, onClearPromptHistory }) => {
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
    
    const isDisabled = !apiKey || isLoading || cooldown > 0 || !prompt.trim();
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : "";

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
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [numberOfImages, setNumberOfImages] = useState(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
        alert("Vui lòng nhập mô tả.");
        return;
    }
    const options: GenerateOptions = { prompt, aspectRatio, numberOfImages };
    onSubmit(options);
  };

  const handleTagClick = (tag: string) => {
      setPrompt(p => p ? `${p}, ${tag}` : tag);
  }
  
  const isDisabled = !apiKey || isLoading || cooldown > 0 || !prompt.trim();
  const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="VD: một chú mèo phi hành gia đang lướt ván trong vũ trụ, phong cách nghệ thuật số"
        />
        <PromptAssistant onTagClick={handleTagClick} tags={PROMPT_SUGGESTION_TAGS} />
        <PromptSuggestions apiKey={apiKey} prompt={prompt} onSelect={setPrompt} mode="generate" />
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
        {isLoading ? 'Đang tạo...' : cooldown > 0 ? `Vui lòng đợi (${cooldown}s)` : 'Tạo ảnh'}
      </button>
    </form>
  );
};

const ImageGenerateForm: React.FC<Omit<ControlPanelProps, 'mode'>> = ({ onSubmit, isLoading, cooldown, quality, onQualityChange, apiKey, onZoomImage, promptHistory, onClearPromptHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<LocalImageData | null>(null); // Character
  const [conceptImage, setConceptImage] = useState<LocalImageData | null>(null); // Concept
  const [numberOfImages, setNumberOfImages] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzingPose, setIsAnalyzingPose] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const [extractedComponents, setExtractedComponents] = useState<{
    outfit1: LocalImageData;
    outfit2: LocalImageData;
    outfit3_transparent: LocalImageData;
    background2: LocalImageData;
  } | null>(null);
  
  // Component selection state
  const [outfitSource, setOutfitSource] = useState<'image1' | 'image2_flat' | 'image2_transparent' | null>(null);
  const [backgroundSource, setBackgroundSource] = useState<'image1' | 'image2' | null>(null);
  
  // Clear extracted components if source images change
  useEffect(() => {
    setExtractedComponents(null);
    setOutfitSource(null);
    setBackgroundSource(null);
    setExtractionError(null);
    setPrompt('');
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
  
  const handleDownload = (base64: string, mimeType: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !conceptImage || !extractedComponents || !outfitSource || !backgroundSource) {
        alert("Vui lòng tải ảnh, tách thành phần và chọn các yếu tố trước khi tạo ảnh.");
        return;
    }
    
    let selectedOutfitImage: LocalImageData;
    switch(outfitSource) {
        case 'image1':
            selectedOutfitImage = extractedComponents.outfit1;
            break;
        case 'image2_flat':
            selectedOutfitImage = extractedComponents.outfit2;
            break;
        case 'image2_transparent':
            selectedOutfitImage = extractedComponents.outfit3_transparent;
            break;
        default:
            console.error("Invalid outfit source selected");
            return;
    }
   
    const selectedBackgroundImage = backgroundSource === 'image1' ? image : extractedComponents.background2;

    const options: ImageGenerateOptions = { 
        prompt, 
        characterImage: image,
        selectedOutfitImage,
        selectedBackgroundImage,
        numberOfImages, 
        aspectRatio,
    };
    onSubmit(options);
  };
  
  const isSubmitDisabled = !apiKey || isLoading || cooldown > 0 || !image || !conceptImage || !extractedComponents || !outfitSource || !backgroundSource;
  
  const getButtonTitle = () => {
    if (!apiKey) return "Vui lòng nhập API Key.";
    if (!image || !conceptImage) return "Vui lòng tải lên cả hai ảnh.";
    if (!extractedComponents) return "Vui lòng tách thành phần trước.";
    if (!outfitSource || !backgroundSource) return "Vui lòng chọn trang phục và bối cảnh.";
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
                    onClick={() => onZoomImage(`data:${image.mimeType};base64,${image.base64}`)}
                >
                    <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-full object-cover rounded-md mb-1 border-2 border-gray-600 transition-transform duration-300 group-hover:scale-105" alt="Nhân vật gốc"/>
                    <figcaption className="text-xs text-gray-300">Nhân vật (Giữ lại)</figcaption>
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nhân vật (Giữ nguyên)</label>
                    <div className="flex gap-2 p-3 bg-gray-800 border-2 border-indigo-700 rounded-lg">
                         <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-16 h-16 object-cover rounded-md" alt="Nhân vật gốc" />
                         <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <PersonIcon />
                                <span className="text-sm font-medium text-gray-200">Từ Ảnh 1</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Khuôn mặt và vóc dáng của nhân vật này sẽ được giữ lại.</p>
                         </div>
                    </div>
                </div>

                {/* Outfit Source */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chọn Trang phục</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <RadioCard value="image1" label="Từ Ảnh 1 (Flat Lay)" group="outfit" current={outfitSource} onChange={(e:any) => setOutfitSource(e.target.value)} icon={<ShirtIcon />} imageSrc={extractedComponents.outfit1.base64} imageMime={extractedComponents.outfit1.mimeType} />
                        <RadioCard value="image2_flat" label="Từ Ảnh 2 (Flat Lay)" group="outfit" current={outfitSource} onChange={(e:any) => setOutfitSource(e.target.value)} icon={<ShirtIcon />} imageSrc={extractedComponents.outfit2.base64} imageMime={extractedComponents.outfit2.mimeType} />
                        <RadioCard value="image2_transparent" label="Từ Ảnh 2 (Giữ Dáng)" group="outfit" current={outfitSource} onChange={(e:any) => setOutfitSource(e.target.value)} icon={<ShirtIcon />} imageSrc={extractedComponents.outfit3_transparent.base64} imageMime={extractedComponents.outfit3_transparent.mimeType} />
                    </div>
                </div>

                {/* Background Source */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chọn Bối cảnh</label>
                     <div className="flex gap-4">
                        <RadioCard value="image1" label="Từ Ảnh 1 (Gốc)" group="background" current={backgroundSource} onChange={(e:any) => setBackgroundSource(e.target.value)} icon={<LandscapeIcon />} imageSrc={image.base64} imageMime={image.mimeType} />
                        <RadioCard value="image2" label="Từ Ảnh 2 (Đã tách)" group="background" current={backgroundSource} onChange={(e:any) => setBackgroundSource(e.target.value)} icon={<LandscapeIcon />} imageSrc={extractedComponents.background2.base64} imageMime={extractedComponents.background2.mimeType} />
                    </div>
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
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    
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
    const [action, setAction] = useState<MagicAction>('upscale');
    // Fix: Renamed ImageData to LocalImageData
    const [image, setImage] = useState<LocalImageData | null>(null);
    const [prompt, setPrompt] = useState('');
    const [mask, setMask] = useState<LocalImageData | null>(null);

    useEffect(() => {
        if (initialMagicImage && onClearInitialMagicImage) {
            setImage(initialMagicImage);
            // Reset other fields for a clean start with the new image
            setPrompt('');
            setMask(null);
            setAction('upscale'); // Default action
            onClearInitialMagicImage();
        }
    }, [initialMagicImage, onClearInitialMagicImage]);

    // Reset mask when image or action changes
    useEffect(() => {
        setMask(null);
        setPrompt('');
    }, [image, action]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) {
            alert("Vui lòng tải lên ảnh để chỉnh sửa.");
            return;
        }
        if (action === 'change-background' && !prompt.trim()) {
            alert("Vui lòng nhập mô tả cho nền mới.");
            return;
        }
        if (action === 'remove-object' && !mask && !prompt.trim()) {
            alert("Vui lòng tô chọn vật thể cần xóa hoặc mô tả nó bằng văn bản.");
            return;
        }

        const isPromptNeededForAction = action === 'change-background' || action === 'remove-object';

        const options: MagicOptions = { 
            action, 
            image, 
            prompt: isPromptNeededForAction ? prompt : undefined,
            mask: action === 'remove-object' ? mask : undefined,
        };
        onSubmit(options);
    };

    const isDisabled = !apiKey || isLoading || cooldown > 0 || !image ||
        (action === 'change-background' && !prompt.trim()) ||
        (action === 'remove-object' && !mask && !prompt.trim());
        
    const buttonTitle = !apiKey ? "Vui lòng nhập API Key để sử dụng tính năng này." : "";

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

            {image && action === 'remove-object' && (
                <div className="space-y-3 animate-fade-in-down">
                    <MaskingEditor image={image} onMaskChange={setMask} />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                          <label htmlFor="prompt-magic-remove" className="block text-sm font-medium text-gray-300">
                              Hoặc mô tả vật thể cần xóa
                          </label>
                          <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
                        </div>
                        <textarea
                          id="prompt-magic-remove"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={2}
                          className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                          placeholder={'VD: xóa chiếc xe hơi màu đỏ ở phía sau'}
                        />
                    </div>
                </div>
            )}

            {action === 'change-background' && (
                 <div className="animate-fade-in-down">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="prompt-magic-bg" className="block text-sm font-medium text-gray-300">
                            Mô tả nền mới
                        </label>
                        <PromptHistoryDropdown history={promptHistory} onSelect={setPrompt} onClear={onClearPromptHistory} />
                    </div>
                    <textarea
                      id="prompt-magic-bg"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white p-2"
                      placeholder={'VD: một khu rừng huyền ảo'}
                    />
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
            case 'edit': return EditForm;
            case 'magic': return MagicForm;
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