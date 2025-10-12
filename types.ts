
import React from 'react';

export type AppMode = 'generate' | 'image-generate' | 'edit' | 'magic' | 'analyze' | 'video' | 'video-analysis';
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type MagicAction = 'upscale' | 'remove-bg' | 'remove-object' | 'change-background' | 'fix-colors';

// Fix: Renamed ImageData to LocalImageData to avoid conflict with the built-in DOM type.
export interface LocalImageData {
  base64: string;
  mimeType: string;
}

export interface OutputQuality {
    id: 'standard' | 'hd';
    name: string;
}

export interface HistoryItem {
    id: string;
    type: 'image' | 'video' | 'text';
    data: string; // URL for image, data URL for video, text content for analyze
    timestamp: number;
    mode: AppMode;
    prompt: string;
}

// Options for geminiService
export interface GenerateOptions {
    prompt: string;
    aspectRatio: AspectRatio;
    numberOfImages: number;
}

export interface ImageGenerateOptions {
    prompt: string;
    numberOfImages: number;
    aspectRatio: AspectRatio;
    characterImage: LocalImageData;
    selectedOutfitImage: LocalImageData;
    selectedBackgroundImage: LocalImageData;
}


export interface EditOptions {
    prompt: string;
    aspectRatio: AspectRatio;
    characterImages: LocalImageData[];
    productImage?: LocalImageData;
    backgroundImage?: LocalImageData;
    numberOfVariations: number;
}

export interface SwapOptions {
    prompt?: string;
    sourceFaceImage: LocalImageData;
    targetImage: LocalImageData;
    numberOfVariations: number;
}

export interface MagicOptions {
    action: MagicAction;
    image: LocalImageData;
    prompt?: string;
    mask?: LocalImageData;
}

export interface AnalyzeOptions {
    image: LocalImageData;
}

export interface VideoOptions {
    prompt: string;
    aspectRatio: AspectRatio; // Note: Aspect ratio for video is often inferred from the input image.
    image?: LocalImageData;
}

export interface DetailedPromptOptions {
  characterImage: LocalImageData;
  conceptImage: LocalImageData;
}

export interface VideoAnalysisOptions {
    frames: LocalImageData[];
    audio: {
        base64: string;
        mimeType: string;
    };
}

export interface VideoAnalysisResultData {
    summary: string;
    storyboard: {
        timestamp_seconds: number;
        description: string;
        keyframe_index: number;
    }[];
    scene_transitions: {
        start_time_seconds: number;
        end_time_seconds: number;
        description: string;
    }[];
    transcription: string;
    srt_subtitles: string;
}
