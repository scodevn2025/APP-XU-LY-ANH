
import React, { useState, useMemo } from 'react';
import type { HistoryItem } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { HistoryIcon } from './icons/HistoryIcon';

type FilterType = 'all' | 'image' | 'video' | 'text';

const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);


const HistoryItemCard: React.FC<{ item: HistoryItem; onDelete: (id: string) => void }> = ({ item, onDelete }) => {
    
    const handleDownload = async () => {
        if (item.type === 'text') {
            const blob = new Blob([item.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `history_analysis_${item.id}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            return;
        }

        let url = '';
        const extension = item.type === 'image' ? 'jpeg' : 'mp4';
        
        if (item.type === 'image') {
            try {
                // Fetch the image from URL, create a blob URL for download to bypass CORS
                const response = await fetch(item.data);
                if (!response.ok) throw new Error('Network response was not ok.');
                const blob = await response.blob();
                url = window.URL.createObjectURL(blob);
            } catch (error) {
                console.error('Error fetching image for download:', error);
                // Fallback: open in new tab
                window.open(item.data, '_blank');
                return;
            }
        } else { // video
             url = item.data;
        }

        const link = document.createElement('a');
        link.href = url;
        link.download = `history_${item.mode}_${item.id}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (item.type === 'image') {
            window.URL.revokeObjectURL(url); // Clean up blob URL
        }
    };

    if (item.type === 'text') {
        return (
            <div className="relative group bg-gray-800 rounded-lg overflow-hidden shadow-lg aspect-square flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:shadow-indigo-500/20 hover:scale-105 animate-fade-scale-in">
                <div className="absolute top-0 right-0 p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={handleDownload}
                        className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white"
                        aria-label="Download Text"
                        title="Tải xuống văn bản"
                    >
                        <DownloadIcon />
                    </button>
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 bg-red-600/50 hover:bg-red-500 backdrop-blur-sm rounded-full text-white"
                        aria-label="Delete"
                        title="Xóa"
                    >
                        <TrashIcon />
                    </button>
                </div>
                <FileTextIcon />
                <p 
                    className="text-xs text-gray-300 overflow-hidden" 
                    style={{display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical'}}
                    title={item.data}
                >
                    {item.data}
                </p>
                <div className="absolute bottom-3 left-3 right-3 text-xs text-left text-white">
                    <p className="font-bold capitalize">{item.mode}</p>
                    <p className="text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group bg-gray-800 rounded-lg overflow-hidden shadow-lg aspect-square flex items-center justify-center transition-all duration-300 hover:shadow-indigo-500/20 hover:scale-105 animate-fade-scale-in">
            {item.type === 'image' ? (
                <img src={item.data} alt={item.prompt} className="w-full h-full object-cover" />
            ) : (
                <video src={item.data} loop muted playsInline className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 text-white">
                <div className="flex justify-end gap-2">
                     <button
                        onClick={handleDownload}
                        className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
                        aria-label="Download"
                        title="Tải xuống"
                    >
                        <DownloadIcon />
                    </button>
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 bg-red-600/50 hover:bg-red-500 backdrop-blur-sm rounded-full transition-colors"
                        aria-label="Delete"
                        title="Xóa"
                    >
                        <TrashIcon />
                    </button>
                </div>
                 <div className="text-xs">
                    <p className="font-bold capitalize">{item.mode}</p>
                    <p className="truncate" title={item.prompt}>{item.prompt || 'Không có prompt'}</p>
                    <p className="text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

// FIX: Define the props interface for the HistoryPanel component.
interface HistoryPanelProps {
  history: HistoryItem[];
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onDeleteItem, onClearHistory }) => {
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredHistory = useMemo(() => {
        if (filter === 'all') return history;
        return history.filter(item => item.type === filter);
    }, [history, filter]);
    
    const filters: {id: FilterType, name: string}[] = [
        {id: 'all', name: 'Tất cả'},
        {id: 'image', name: 'Ảnh'},
        {id: 'video', name: 'Video'},
        {id: 'text', name: 'Văn bản'},
    ];

    if (history.length === 0) {
        return (
            <div className="text-center text-gray-400 py-16">
                <div className="inline-block p-4 bg-gray-700/50 rounded-full mb-4">
                    <HistoryIcon />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Lịch sử trống</h3>
                <p>Những ảnh và video bạn tạo sẽ xuất hiện ở đây.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-scale-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {filters.map(f => (
                         <button 
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                         >
                            {f.name}
                         </button>
                    ))}
                </div>
                <button 
                    onClick={onClearHistory} 
                    className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
                    title="Xóa toàn bộ lịch sử"
                >
                    <TrashIcon /> Xóa tất cả
                </button>
            </div>

            {filteredHistory.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredHistory.map(item => (
                        <HistoryItemCard key={item.id} item={item} onDelete={onDeleteItem} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 py-16">
                     <h3 className="text-xl font-semibold text-white mb-2">Không có kết quả</h3>
                    <p>Không tìm thấy mục nào phù hợp với bộ lọc của bạn.</p>
                </div>
            )}
        </div>
    );
};