

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ZoomIcon } from './icons/ZoomIcon';
import { LOADING_MESSAGES } from '../constants';
import type { AppMode, AspectRatio, VideoAnalysisResultData, LocalImageData } from '../types';
import { ImageModal } from './ImageModal';
import { CreateVideoIcon } from './icons/CreateVideoIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface ResultsDisplayProps {
  isLoading: boolean;
  results: any[];
  mode: AppMode;
  aspectRatio: AspectRatio;
  onCreateVideo: (base64: string, mimeType: string) => void;
  onEditImage: (base64: string, mimeType: string) => void;
  onZoomImage: (url: string) => void;
}

const WelcomeState: React.FC<{mode: AppMode}> = ({mode}) => {
  const getTitle = () => {
    switch (mode) {
      case 'generate': return 'Sẵn sàng tạo nên kiệt tác';
      case 'image-generate': return 'Tạo biến thể từ hình ảnh';
      case 'edit': return 'Sẵn sàng biến hoá nhân vật của bạn';
      // FIX: Removed 'swap' case as it is not a valid AppMode.
      case 'magic': return 'Bộ công cụ chỉnh sửa ảnh AI';
      case 'photo-restore': return 'Phục Chế Ảnh Cũ Nát by AI';
      case 'analyze': return 'Phân tích hình ảnh bằng AI';
      case 'video': return 'Tạo video chuyển động từ ý tưởng';
      case 'video-analysis': return 'Phân tích và nhận diện video';
      default: return '';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'generate':
        return (
          <>
            Mô tả càng chi tiết, kết quả càng ấn tượng. Hãy thử cấu trúc: <br />
            <em className="text-indigo-300">chủ thể + hành động + bối cảnh + phong cách</em>.
            <br />
            <span className="text-xs text-gray-400 mt-2 block bg-gray-900/50 p-2 rounded-md">
              VD: "một chiến binh mèo samurai đang thiền định trên đỉnh núi Phú Sĩ, phong cách tranh thủy mặc Nhật Bản, ánh sáng bình minh".
            </span>
          </>
        );
       case 'image-generate':
        return (
          <>
            Kết hợp nhân vật và concept một cách sáng tạo.
            <br />
            Giữ nguyên nhân vật từ một ảnh và áp dụng trang phục, bối cảnh, và tư thế từ một ảnh khác.
            <br />
            <ol className="text-left list-decimal list-inside mt-2 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-md space-y-1">
                <li>Tải lên <strong>Ảnh Nhân Vật Gốc</strong> và <strong>Ảnh Concept</strong>.</li>
                <li>AI sẽ tự động tách trang phục, bối cảnh và phân tích tư thế.</li>
                <li>Chọn và trộn các yếu tố bạn muốn, sau đó tinh chỉnh bằng mô tả để tạo ra kết quả hoàn hảo.</li>
            </ol>
          </>
        );
      case 'edit':
        return (
          <>
            Giữ nguyên nhân vật, thay đổi thế giới xung quanh họ! Tải lên ảnh nhân vật và mô tả bối cảnh mới.
            <br />
            <strong>Mẹo:</strong> Hãy rõ ràng về hành động và môi trường.
            <br />
            <span className="text-xs text-gray-400 mt-2 block bg-gray-900/50 p-2 rounded-md">
              VD: "đặt nhân vật đang đứng trong một khu rừng đêm đầy ma mị, tay cầm một chiếc đèn lồng phát sáng".
            </span>
          </>
        );
      // FIX: Removed 'swap' case as it is not a valid AppMode. Its functionality is covered by 'image-generate'.
      case 'magic':
        return (
          <>
            Công cụ chỉnh sửa nhanh bằng một cú nhấp chuột. <strong>Nâng cấp</strong>, <strong>Xóa nền</strong>, hoặc <strong>Xóa vật thể</strong> bằng cách mô tả nó.
            <br />
            <span className="text-xs text-gray-400 mt-2 block bg-gray-900/50 p-2 rounded-md">
              VD xóa vật thể: "xóa chiếc xe hơi màu đỏ ở phía sau".
            </span>
          </>
        );
       case 'photo-restore':
        return (
          <>
            Biến những bức ảnh cũ mờ, nát thành ảnh 4K - 8K sắc nét với AI.
            <br />
            Tải lên bức ảnh của bạn và chọn các tùy chọn để phục chế, tô màu, và làm rõ nét các chi tiết.
            <br />
            <span className="text-xs text-gray-400 mt-2 block bg-gray-900/50 p-2 rounded-md">
              Mẹo: Kết hợp các mẫu có sẵn và tùy chọn thêm để đạt được kết quả tốt nhất.
            </span>
          </>
        );
      case 'analyze':
        return (
          <>
            Bạn có một bức ảnh đẹp nhưng không biết mô tả thế nào? Tải nó lên và AI sẽ tạo ra một prompt chi tiết.
            <br />
            <strong>Mẹo:</strong> Sao chép prompt này và dán vào tab 'Tạo ảnh' để tạo ra các biến thể độc đáo với cùng phong cách.
          </>
        );
      case 'video':
        return (
          <>
            Biến ảnh tĩnh hoặc ý tưởng thành video sống động. Mô tả không chỉ cảnh mà còn cả <em className="text-indigo-300">chuyển động</em>.
            <br />
            <span className="text-xs text-gray-400 mt-2 block bg-gray-900/50 p-2 rounded-md">
              VD: "máy quay lia chậm từ dưới lên một tòa lâu đài cổ trên vách đá, mây trôi nhanh, phong cách điện ảnh".
            </span>
          </>
        );
       case 'video-analysis':
        return (
          <>
            Tải lên một video để AI phân tích sâu. AI sẽ nhận diện hành động, bối cảnh, và lời thoại.
            <br />
            <strong className="text-indigo-300">Kết quả bao gồm:</strong>
            <ul className="text-left list-disc list-inside mt-2 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-md space-y-1">
              <li>Tóm tắt chi tiết toàn bộ video.</li>
              <li>Storyboard với các khung hình chính và mô tả.</li>
              <li>Bóc tách lời thoại và tạo phụ đề SRT.</li>
              <li>Phân tích chuyển cảnh dưới dạng dữ liệu JSON.</li>
            </ul>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="text-center text-gray-400 max-w-lg mx-auto">
      <div className="text-5xl mb-4">✨</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {getTitle()}
      </h3>
      <div className="text-sm leading-relaxed">
        {getDescription()}
      </div>
    </div>
  );
};


const LoadingState: React.FC = () => {
    const [message, setMessage] = useState(LOADING_MESSAGES[0]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(prevMessage => {
                const currentIndex = LOADING_MESSAGES.indexOf(prevMessage);
                const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
                return LOADING_MESSAGES[nextIndex];
            });
        }, 2500);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="text-center">
            <div className="flex justify-center items-center mb-4">
                <SpinnerIcon />
            </div>
            <p className="text-lg font-semibold text-white animate-pulse">{message}</p>
        </div>
    );
}

const AnalyzedTextResult: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    if (!navigator.clipboard) {
        alert("Clipboard API not available");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSelectAndCopy = () => {
    textAreaRef.current?.select();
    handleCopy();
  }

  return (
    <div className="w-full max-w-2xl mx-auto text-left space-y-4">
        <h3 className="text-xl font-semibold text-white">Mô tả từ AI</h3>
        <div className="relative">
            <textarea
                ref={textAreaRef}
                readOnly
                value={text}
                className="w-full h-48 p-3 bg-gray-900 border border-gray-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                aria-label="Generated prompt"
            />
        </div>
        <div className="flex justify-end gap-3">
             <button
                onClick={handleSelectAndCopy}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900"
            >
                {copied ? 'Đã sao chép!' : 'Chọn & Sao chép'}
            </button>
        </div>
    </div>
  );
};

const VideoResult: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = `ai_studio_video_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full max-w-2xl mx-auto text-center space-y-4">
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-lg" aria-label="Generated video result" />
            <button
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900"
            >
                <DownloadIcon />
                Tải video
            </button>
        </div>
    );
};

interface VideoAnalysisResultProps {
  result: {
    analysis: VideoAnalysisResultData;
    frames: LocalImageData[];
  };
  onEditImage: (base64: string, mimeType: string) => void;
}


const VideoAnalysisResult: React.FC<VideoAnalysisResultProps> = ({ result, onEditImage }) => {
    const { analysis, frames } = result;
    const [activeTab, setActiveTab] = useState('summary');

    if (!analysis) {
        return (
            <div className="p-4 text-center text-red-400">
                <h3 className="text-lg font-semibold">Phân tích thất bại</h3>
                <p>AI không thể phân tích video này. Điều này có thể do video không có âm thanh hoặc nội dung không được hỗ trợ.</p>
            </div>
        );
    }

    const handleDownloadSrt = () => {
        if (!analysis.srt_subtitles) return;
        const blob = new Blob([analysis.srt_subtitles], { type: 'text/srt' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subtitles.srt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const tabs = [
        { id: 'summary', label: 'Tóm tắt' },
        { id: 'storyboard', label: 'Storyboard' },
        { id: 'transcription', label: 'Bóc băng' },
        { id: 'srt', label: 'Phụ đề SRT' },
        { id: 'json', label: 'JSON Chuyển cảnh' },
    ];

    return (
        <div className="w-full mx-auto text-left space-y-4">
            <h3 className="text-xl font-semibold text-white">Kết quả phân tích video</h3>
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-1 rounded-lg bg-gray-900/50 min-h-[40vh] max-h-[60vh] overflow-y-auto">
                {activeTab === 'summary' && <div className="p-4 whitespace-pre-wrap text-gray-300">{analysis.summary}</div>}
                
                {activeTab === 'storyboard' && (
                    <div className="p-4 space-y-4">
                        {analysis.storyboard?.map((item, index) => {
                            const frame = frames[item.keyframe_index];
                            if (!frame) return null; // Safety check if index is out of bounds

                            return (
                                <div key={index} className="flex flex-col sm:flex-row gap-4 p-3 bg-gray-800 rounded-md">
                                    <div className="relative group w-full sm:w-40 flex-shrink-0">
                                        <img 
                                            src={`data:image/jpeg;base64,${frame.base64}`} 
                                            alt={`Storyboard frame at ${item.timestamp_seconds}s`}
                                            className="w-full h-auto object-cover rounded"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditImage(frame.base64, frame.mimeType);
                                                }}
                                                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
                                                aria-label="Edit with Magic"
                                                title="Chỉnh sửa với Magic Edit"
                                            >
                                                <MagicWandIcon />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-gray-300">
                                        <p className="font-bold text-indigo-400">Time: {item.timestamp_seconds.toFixed(2)}s</p>
                                        <p>{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}


                {activeTab === 'transcription' && <div className="p-4 whitespace-pre-wrap text-gray-300">{analysis.transcription}</div>}

                {activeTab === 'srt' && (
                    <div className="p-4">
                        <pre className="whitespace-pre-wrap text-gray-300 text-sm bg-gray-900 p-3 rounded-md">{analysis.srt_subtitles}</pre>
                        <button
                            onClick={handleDownloadSrt}
                            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            <DownloadIcon /> Tải file .SRT
                        </button>
                    </div>
                )}
                
                {activeTab === 'json' && (
                    <div className="p-4">
                        <pre className="whitespace-pre-wrap text-gray-300 text-sm bg-gray-900 p-3 rounded-md">
                            {JSON.stringify(analysis.scene_transitions, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};


const getAspectRatioClass = (ratio: AspectRatio): string => {
    const [w, h] = ratio.split(':');
    return `aspect-[${w}/${h}]`;
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isLoading, results, mode, aspectRatio, onCreateVideo, onEditImage, onZoomImage }) => {

  const handleDownload = (base64Image: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64Image}`;
    link.download = `generated_image_${index + 1}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasResults = results.length > 0;
  // Responsive grid: 1 column on small screens, 2 on medium screens and up.
  const gridCols = results.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1';
  const itemSpan = results.length === 1 ? 'max-w-md mx-auto' : '';
  const showImageActions = mode === 'generate' || mode === 'edit' || mode === 'image-generate' || mode === 'magic' || mode === 'photo-restore';
  
  const aspectRatioClass = getAspectRatioClass(aspectRatio);

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (!hasResults) return <WelcomeState mode={mode} />;

    switch(mode) {
        case 'analyze':
            return <AnalyzedTextResult text={results[0]} />;
        case 'video':
            return <VideoResult videoUrl={results[0]} />;
        case 'video-analysis':
            return <VideoAnalysisResult result={results[0]} onEditImage={onEditImage} />;
        default:
             return (
                <div className={`grid ${gridCols} gap-4 w-full`}>
                    {results.map((base64, index) => (
                    <div key={index} className={`relative group overflow-hidden rounded-lg shadow-lg ${itemSpan} ${aspectRatioClass} cursor-pointer transition-shadow duration-300 hover:shadow-indigo-500/20 animate-fade-scale-in`} style={{'--animation-delay': `${index * 100}ms`} as React.CSSProperties} onClick={() => onZoomImage(`data:image/jpeg;base64,${base64}`)}>
                        <img
                        src={`data:image/jpeg;base64,${base64}`}
                        alt={`Generated result ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); onZoomImage(`data:image/jpeg;base64,${base64}`); }}
                            className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
                            aria-label="Zoom image"
                        >
                            <ZoomIcon />
                        </button>
                        {showImageActions && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditImage(base64, 'image/jpeg'); }}
                                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
                                aria-label="Edit with Magic"
                                title="Chỉnh sửa với Magic Edit"
                            >
                                <MagicWandIcon />
                            </button>
                        )}
                        {showImageActions && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCreateVideo(base64, 'image/jpeg'); }}
                                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
                                aria-label="Create video from image"
                                title="Tạo video từ ảnh này"
                            >
                                <CreateVideoIcon />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(base64, index); }}
                            className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
                            aria-label="Download image"
                        >
                            <DownloadIcon />
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
            )
    }
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 min-h-[60vh] flex items-center justify-center border-2 border-dashed border-gray-700">
        {renderContent()}
      </div>
    </>
  );
};