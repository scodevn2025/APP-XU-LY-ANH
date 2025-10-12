

import React, { useState, useEffect, useCallback } from 'react';
import { ControlPanel } from './ControlPanel';
import { ResultsDisplay } from './ResultsDisplay';
import { Toast } from './Toast';
import * as geminiService from '../services/geminiService';
import * as cloudinaryService from '../services/cloudinaryService';
// Fix: Renamed ImageData to LocalImageData to avoid conflict with the built-in DOM type.
import type { AppMode, OutputQuality, LocalImageData, GenerateOptions, EditOptions, SwapOptions, MagicOptions, AnalyzeOptions, VideoOptions, HistoryItem, ImageGenerateOptions, AspectRatio, VideoAnalysisOptions } from '../types';
import { MODES, CONCEPTS } from '../constants';
import { ApiKeyModal } from './ApiKeyModal';
import { KeyIcon } from './icons/KeyIcon';
import { LogoIcon } from './icons/LogoIcon';
import { HistoryPanel } from './HistoryPanel';
import * as historyService from '../services/historyService';
import { HistoryIcon } from './icons/HistoryIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CloudinarySetupModal } from './CloudinarySetupModal';
import { ImageModal } from './ImageModal';


type MainView = 'studio' | 'history';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<OutputQuality['id']>('standard');
  const [cooldown, setCooldown] = useState(0);
  // Fix: Renamed ImageData to LocalImageData
  const [initialVideoOptions, setInitialVideoOptions] = useState<{ image: LocalImageData; prompt: string; suggestions: string[] } | null>(null);
  const [initialMagicImage, setInitialMagicImage] = useState<LocalImageData | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isCloudinaryModalOpen, setIsCloudinaryModalOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [view, setView] = useState<MainView>('studio');
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [lastUsedAspectRatio, setLastUsedAspectRatio] = useState<AspectRatio>('9:16');


  useEffect(() => {
    const loadInitialData = async () => {
      const savedKey = localStorage.getItem('gemini-api-key');
      if (savedKey) {
        setApiKey(savedKey);
      } else {
        setIsApiKeyModalOpen(true);
      }
      try {
        const [loadedHistory, loadedPrompts] = await Promise.all([
          historyService.loadHistory(),
          historyService.loadPromptHistory()
        ]);
        setHistory(loadedHistory);
        setPromptHistory(loadedPrompts);
      } catch (e: any) {
        console.error("Failed to load history from DB:", e);
        setError(e.message || "Could not load history from the database.");
      }
    };
    loadInitialData();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setZoomedImageUrl(null);
    }
  }, []);

  useEffect(() => {
    if (zoomedImageUrl) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoomedImageUrl, handleKeyDown]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
    setIsApiKeyModalOpen(false);
  };

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
  };

  const handleCreateVideoFromImage = async (base64: string, mimeType: string) => {
    if (!apiKey) {
      setError("Vui lòng nhập API Key để sử dụng tính năng này.");
      setIsApiKeyModalOpen(true);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        // Fix: Explicitly type `image` as LocalImageData to resolve type ambiguity.
        const image: LocalImageData = { base64, mimeType };
        const analysisResult = await geminiService.analyzeImage(apiKey, { image });
        const suggestionsResult = await geminiService.generatePromptSuggestions(apiKey, { prompt: analysisResult, images: [image], mode: 'video' });
        
        setInitialVideoOptions({
            image,
            prompt: analysisResult,
            suggestions: suggestionsResult.slice(0, 3)
        });
        setMode('video');
        setView('studio');
        setResults([]);
    } catch (e: any) {
        console.error(e);
        setError(e.message || 'An unknown error occurred while preparing the video prompt.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleEditImage = (base64: string, mimeType: string) => {
    setMode('magic');
    setInitialMagicImage({ base64, mimeType });
    setResults([]); // Clear previous results
    setView('studio'); // Switch to studio view
  };

  const handleSubmit = async (options: any) => {
    if (!apiKey) {
      setError("Vui lòng nhập API Key để sử dụng tính năng này.");
      setIsApiKeyModalOpen(true);
      return;
    }
    if (options.aspectRatio) {
        setLastUsedAspectRatio(options.aspectRatio);
    }
    setIsLoading(true);
    setResults([]);
    setError(null);

    try {
      let response: any; // Can be string[], string, or object for video analysis
      let historyItemsToCreate: any[] = [];
      let promptToSave: string | undefined;

      switch (mode) {
        case 'generate':
          response = await geminiService.generateImages(apiKey, options as GenerateOptions);
          promptToSave = options.prompt;
          startCooldown(10);
          break;
        case 'image-generate':
          response = await geminiService.recomposeImage(apiKey, options as ImageGenerateOptions);
          promptToSave = options.prompt;
          startCooldown(10);
          break;
        case 'edit':
          response = await geminiService.editImage(apiKey, options as EditOptions);
          promptToSave = options.prompt;
          startCooldown(10);
          break;
        case 'magic':
            response = await geminiService.magicEdit(apiKey, options as MagicOptions);
            promptToSave = options.prompt;
            startCooldown(10);
            break;
        case 'analyze':
            response = await geminiService.analyzeImage(apiKey, { image: options.image as LocalImageData });
            promptToSave = 'Analyzed Image';
            startCooldown(10);
            break;
        case 'video':
            response = await geminiService.generateVideo(apiKey, options as VideoOptions);
            promptToSave = options.prompt;
            startCooldown(10);
            break;
        case 'video-analysis':
            const analysisResult = await geminiService.analyzeVideo(apiKey, options as VideoAnalysisOptions);
            const parsedResult = JSON.parse(analysisResult);
            // Don't save video analysis to history yet as it's complex
            setResults([{ analysis: parsedResult, frames: options.frames }]);
            startCooldown(20);
            setIsLoading(false);
            return; // Exit early as history handling is different for this mode
        default:
          throw new Error('Invalid mode selected');
      }
      
      const newResults = Array.isArray(response) ? response : [response];
      setResults(newResults);

      if (promptToSave && typeof promptToSave === 'string' && promptToSave.trim().length > 0) {
           await historyService.addPromptToHistory(promptToSave);
           setPromptHistory(prev => {
              const newHistory = [promptToSave, ...prev.filter(p => p !== promptToSave)];
              return newHistory.slice(0, 50); // Keep history to a reasonable size
           });
      }
      
      historyItemsToCreate = newResults.map(data => {
        const itemType: HistoryItem['type'] = mode === 'video' ? 'video' : (mode === 'analyze' ? 'text' : 'image');
        return {
          type: itemType,
          data: data,
          prompt: promptToSave || '',
        };
      });

      const finalHistoryItems: HistoryItem[] = [];

      for (const item of historyItemsToCreate) {
          let data = item.data;
          if (item.type === 'image') {
              try {
                  data = await cloudinaryService.uploadImage(item.data);
              } catch (e: any) {
                  console.error("Cloudinary upload failed:", e);
                  if (e.message && e.message.toLowerCase().includes('upload preset not found')) {
                      setIsCloudinaryModalOpen(true);
                  } else {
                      setError(e.message || "Could not save image to cloud storage. One or more history items may not be saved.");
                  }
                  continue;
              }
          }

          finalHistoryItems.push({
              id: `${Date.now()}-${Math.random()}`,
              type: item.type,
              data: data, // This is now a URL for images
              timestamp: Date.now(),
              mode: mode,
              prompt: item.prompt,
          });
      }

      if (finalHistoryItems.length > 0) {
        await historyService.addItemsToHistory(finalHistoryItems);
        const updatedHistory = [...finalHistoryItems, ...history].sort((a, b) => b.timestamp - a.timestamp);
        setHistory(updatedHistory);
      }

    } catch (e: any) {
      console.error(e);
      let errorMessage = e.message || `An unknown error occurred during ${mode} operation.`;
      if (typeof errorMessage === 'string' && (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED'))) {
          errorMessage = 'Bạn đã vượt quá hạn ngạch sử dụng Gemini API. Vui lòng kiểm tra tài khoản Google AI Studio của bạn hoặc thêm phương thức thanh toán để tiếp tục.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await historyService.removeItemFromHistory(id);
      // Update local state after successful deletion
      setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
    } catch (e: any) {
      console.error("Failed to delete history item:", e);
      setError(e.message || "Could not delete item from history.");
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử không? Hành động này không thể hoàn tác.")) {
        try {
          await historyService.clearHistory();
          setHistory([]);
        } catch (e: any) {
          console.error("Failed to clear history:", e);
          setError(e.message || "Could not clear history from the database.");
        }
    }
  };

  const handleClearPromptHistory = async () => {
    try {
      await historyService.clearPromptHistory();
      setPromptHistory([]);
    } catch (e: any) {
      console.error("Failed to clear prompt history:", e);
      setError(e.message || "Could not clear prompt history from the database.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {error && <Toast message={error} onClose={() => setError(null)} />}
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} apiKey={apiKey} onApiKeySave={handleApiKeySave} />
      <CloudinarySetupModal isOpen={isCloudinaryModalOpen} onClose={() => setIsCloudinaryModalOpen(false)} />
      {zoomedImageUrl && (
        <ImageModal
          imageUrl={zoomedImageUrl}
          onClose={() => setZoomedImageUrl(null)}
        />
      )}

      <header className="p-4 border-b border-gray-700/50 flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8" />
          <h1 className="text-xl font-bold">AI Character Image Studio</h1>
        </div>
        <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            title="Quản lý API Key"
        >
            <KeyIcon />
        </button>
      </header>
      
      <div className="flex flex-col md:flex-row">
          {/* Vertical Navigation Sidebar on desktop, horizontal scroll on mobile */}
          <nav className="flex flex-row md:flex-col md:w-56 flex-shrink-0 gap-2 self-start md:sticky md:top-20 overflow-x-auto md:overflow-x-visible p-4 md:py-4 md:pl-4 md:pr-0">
            {MODES.map(m => {
              const Icon = m.icon;
              return (
                <button 
                  key={m.id}
                  onClick={() => { setMode(m.id); setResults([]); }}
                  className={`flex items-center justify-start gap-3 flex-shrink-0 md:w-full p-3 rounded-lg text-sm font-medium transition-colors ${mode === m.id ? 'bg-gray-700/80 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                  aria-pressed={mode === m.id}
                >
                  <Icon />
                  <span className="whitespace-nowrap">{m.name}</span>
                </button>
              );
            })}
          </nav>
        <div className="flex-grow p-4">
            <div className="grid grid-cols-2 border-b border-gray-700/50 mb-4">
                <button 
                    onClick={() => setView('studio')}
                    className={`flex items-center justify-center gap-2 flex-1 text-center px-3 py-3 text-sm font-medium transition-colors border-b-2 ${view === 'studio' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    aria-pressed={view === 'studio'}
                >
                    <SparklesIcon /> Studio
                </button>
                <button 
                    onClick={() => setView('history')}
                    className={`flex items-center justify-center gap-2 flex-1 text-center px-3 py-3 text-sm font-medium transition-colors border-b-2 ${view === 'history' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    aria-pressed={view === 'history'}
                >
                    <HistoryIcon /> Lịch sử
                </button>
            </div>

            <div key={view} className="animate-fade-scale-in">
              {view === 'studio' ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <aside className="lg:col-span-2 bg-gray-800/50 rounded-lg border border-gray-700/50 self-start md:sticky md:top-20">
                      <ControlPanel
                        apiKey={apiKey}
                        mode={mode}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        quality={quality}
                        onQualityChange={setQuality}
                        cooldown={cooldown}
                        initialVideoOptions={initialVideoOptions}
                        onClearInitialVideoOptions={() => setInitialVideoOptions(null)}
                        initialMagicImage={initialMagicImage}
                        onClearInitialMagicImage={() => setInitialMagicImage(null)}
                        onZoomImage={setZoomedImageUrl}
                        promptHistory={promptHistory}
                        onClearPromptHistory={handleClearPromptHistory}
                      />
                    </aside>

                    <section className="lg:col-span-3">
                      <ResultsDisplay 
                        isLoading={isLoading} 
                        results={results}
                        mode={mode}
                        aspectRatio={lastUsedAspectRatio}
                        onCreateVideo={handleCreateVideoFromImage}
                        onEditImage={handleEditImage}
                      />
                    </section>
                </div>
              ) : (
                <HistoryPanel 
                  history={history}
                  onDeleteItem={handleDeleteHistoryItem}
                  onClearHistory={handleClearHistory}
                />
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;