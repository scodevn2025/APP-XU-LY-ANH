import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateOptions, EditOptions, MagicOptions, AnalyzeOptions, VideoOptions, LocalImageData, ImageGenerateOptions, VideoAnalysisOptions, PhotoRestoreOptions, AITravelOptions, AspectRatio } from '../types';

const getAIClient = (apiKey: string) => new GoogleGenAI({ apiKey });

const imageToPart = (imageData: LocalImageData) => ({
    inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
    },
});

export const generateImages = async (apiKey: string, options: GenerateOptions): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: options.prompt,
        config: {
            numberOfImages: options.numberOfImages,
            aspectRatio: options.aspectRatio,
            outputMimeType: 'image/jpeg',
        }
    });
    return response.generatedImages.map(img => img.image.imageBytes);
};

export const generateProductShot = async (apiKey: string, options: GenerateOptions): Promise<string[]> => {
     if (!options.images || options.images.length === 0) {
        throw new Error("Product image is required for a product shot.");
    }
    const ai = getAIClient(apiKey);
    const results: string[] = [];

    const productShotPrompt = `A professional, clean product shot of the following item. The background should be ${options.prompt}. High quality, studio lighting, photorealistic.`;

    for (let i = 0; i < options.numberOfImages; i++) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    imageToPart(options.images[0]),
                    { text: productShotPrompt }
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            results.push(part.inlineData.data);
        }
    }
    return results;
}

export const generateAITravelImage = async (apiKey: string, options: AITravelOptions): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const results: string[] = [];
    
    if (options.characterImages.length === 0) {
        throw new Error("At least one character image is required.");
    }

    const mainCharacter = options.characterImages[0];
    
    let promptParts: string[] = [];
    if (options.locationPrompt) promptParts.push(`at ${options.locationPrompt}`);
    if (options.outfitPrompt) promptParts.push(`wearing ${options.outfitPrompt}`);
    if (options.customPrompt) promptParts.push(options.customPrompt);

    const sceneDescription = promptParts.join(', ');

    const finalPrompt = `Take the person from the user-provided image and place them in the following scene. Maintain their facial features, body type, and identity. The scene is: "${sceneDescription}". The final image should be a photorealistic, high-quality photograph.`;

    for (let i = 0; i < options.numberOfImages; i++) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imageToPart(mainCharacter), { text: finalPrompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            results.push(part.inlineData.data);
        }
    }
    return results;
}

export const editImage = async (apiKey: string, options: EditOptions): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const results: string[] = [];
    
    // FIX: Explicitly type the `parts` array to allow both image and text parts, preventing a TypeScript inference error.
    const parts: ({ inlineData: { mimeType: string; data: string; } } | { text: string })[] = [
        ...options.characterImages.map(imageToPart),
    ];
    if (options.productImage) parts.push(imageToPart(options.productImage));
    if (options.backgroundImage) parts.push(imageToPart(options.backgroundImage));
    parts.push({ text: options.prompt });
    
    // The model can generate multiple images in one go with this endpoint
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    response.candidates?.forEach(candidate => {
        candidate.content.parts.forEach(part => {
            if (part.inlineData) {
                results.push(part.inlineData.data);
            }
        });
    });

    // If the model returns fewer than requested, we just return what we have.
    // A more robust solution might loop, but this is safer for quotas.
    return results.slice(0, options.numberOfVariations);
};

export const recomposeImage = async (apiKey: string, options: ImageGenerateOptions): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    const results: string[] = [];
    const prompt = `Create a photorealistic image by combining these elements: 
    1.  The person from the 'character' image, maintaining their exact face and identity.
    2.  Place them in the 'background' image.
    3.  Have them wear the clothes from the 'outfit' image.
    4.  Additional instructions: ${options.prompt}.
    The final image should be seamless and high quality.`;

    const parts = [
        { text: "USER CHARACTER IMAGE:" },
        imageToPart(options.characterImage),
        { text: "BACKGROUND IMAGE:" },
        imageToPart(options.selectedBackgroundImage),
        { text: "OUTFIT IMAGE:" },
        imageToPart(options.selectedOutfitImage),
        { text: prompt },
    ];

     for (let i = 0; i < options.numberOfImages; i++) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            results.push(part.inlineData.data);
        }
    }
    return results;
}

export const magicEdit = async (apiKey: string, options: MagicOptions): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    
    let prompt = '';
    // FIX: Replaced `any[]` with a specific type for `parts` to improve type safety and consistency.
    const parts: ({ inlineData: { mimeType: string; data: string; } } | { text: string })[] = [imageToPart(options.image)];

    switch(options.action) {
        case 'upscale':
            prompt = 'Upscale this image to 2x its resolution. Enhance details, sharpness, and clarity without altering the content. Make it high-definition.';
            break;
        case 'remove-bg':
            prompt = 'Remove the background from this image, leaving only the main subject with a transparent background.';
            break;
        case 'fix-colors':
            prompt = 'Automatically correct the colors, contrast, and brightness of this image to make it look more natural and vibrant.';
            break;
        case 'change-background':
             prompt = `Change the background of this image to: ${options.prompt}. Keep the foreground subject unchanged.`;
            break;
        case 'creative':
            prompt = options.prompt || '';
            break;
        case 'remove-object':
            if (options.mask) {
                parts.push(imageToPart(options.mask));
                prompt = 'Remove the object indicated by the white area in the mask from the original image. Fill in the space intelligently.';
            } else if (options.prompt) {
                prompt = `Remove the following object from the image: ${options.prompt}. Fill in the space intelligently.`
            }
            break;
        case 'auto-filter':
             prompt = `Apply a ${options.filterStyle} color grading filter to this image.`;
            break;
        default:
            throw new Error('Unsupported magic action');
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const results: string[] = [];
    response.candidates?.forEach(candidate => {
        candidate.content.parts.forEach(part => {
            if (part.inlineData) {
                results.push(part.inlineData.data);
            }
        });
    });

    return results;
}

export const restorePhoto = async (apiKey: string, options: PhotoRestoreOptions): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    
    const prompt = `Restore this old photo. Template: "${options.template}". 
    The person is ${options.gender}, around ${options.age} years old.
    Enhancements to apply: ${options.enhancements.join(', ')}.
    Exclusions: ${options.exclusionPrompt}.
    The final result should be a high-resolution, clear, and beautifully restored photograph.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                imageToPart(options.image),
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
        return [part.inlineData.data];
    }
    return [];
}


export const analyzeImage = async (apiKey: string, options: AnalyzeOptions): Promise<string> => {
    const ai = getAIClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imageToPart(options.image),
                { text: "Describe this image in detail for a text-to-image prompt. Include subject, style, lighting, composition, and colors." }
            ]
        },
    });
    return response.text;
};

export const generatePromptSuggestions = async (apiKey: string, { prompt, images, mode }: { prompt: string, images?: LocalImageData[], mode: string }): Promise<string[]> => {
    const ai = getAIClient(apiKey);
    
    let systemInstruction = `You are a creative assistant for an AI image/video studio. Generate 3 diverse and detailed prompt suggestions based on the user's initial idea. The suggestions should be in Vietnamese.`;
    if (mode === 'video') {
        systemInstruction += ` Focus on suggesting actions and camera movements.`;
    }
    
    const parts: any[] = [
        { text: `User's idea: "${prompt}". Mode: ${mode}.` }
    ];
    if (images && images.length > 0) {
        parts.unshift(...images.map(imageToPart));
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts },
        config: { systemInstruction }
    });
    
    return response.text.split('\n').map(s => s.replace(/^- /, '')).filter(s => s.trim().length > 0);
};

export const generateVideo = async (apiKey: string, options: VideoOptions): Promise<string> => {
    const ai = getAIClient(apiKey);
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: options.prompt,
      image: options.image ? { imageBytes: options.image.base64, mimeType: options.image.mimeType } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: options.aspectRatio,
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was provided.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!videoResponse.ok) {
        throw new Error("Failed to download the generated video file.");
    }

    const videoBlob = await videoResponse.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
    });
};


export const processVideoFile = async (videoFile: File, onProgress: (progress: number, message: string) => void): Promise<{frames: LocalImageData[], audio: { base64: string, mimeType: string }}> => {
     // Frame extraction
    onProgress(10, "Extracting frames from video...");
    const frames: LocalImageData[] = await new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const extracted: LocalImageData[] = [];

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;
            const interval = duration > 60 ? 2 : 1; // 1 frame per second, or every 2s for longer videos
            let currentTime = 0;

            const captureFrame = () => {
                if (currentTime > duration) {
                    resolve(extracted);
                    return;
                }
                video.currentTime = currentTime;
            };

            video.onseeked = () => {
                context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                extracted.push({ base64, mimeType: 'image/jpeg' });
                onProgress(10 + (currentTime / duration) * 60, `Extracted frame at ${currentTime.toFixed(1)}s`);
                currentTime += interval;
                captureFrame();
            };

            captureFrame();
        };
        video.load();
    });

     // Audio extraction
    onProgress(70, "Extracting audio data...");
    const audio: { base64: string, mimeType: string } = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const base64 = (event.target.result as string).split(',')[1];
                resolve({ base64, mimeType: videoFile.type });
            } else {
                reject(new Error("Failed to read audio file."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
    });

    onProgress(100, "Processing complete.");
    return { frames, audio };
}


export const analyzeVideo = async (apiKey: string, options: VideoAnalysisOptions): Promise<string> => {
    const ai = getAIClient(apiKey);
    
    const parts: any[] = [
        { text: "Analyze this video based on the provided frames and audio. Provide a detailed summary, a storyboard with timestamps and descriptions, a full transcription, SRT subtitles, and a JSON object of scene transitions." },
        ...options.frames.map(imageToPart)
        // Audio support for generateContent is not standard via this method.
        // A more advanced implementation might use the Live API or a different model.
        // For now, we'll rely on visual analysis.
    ];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts },
        config: {
            responseMimeType: 'application/json'
        }
    });
    
    return response.text;
}

// Complex image-generate functions
export const extractImageComponents = async (apiKey: string, image1: LocalImageData, image2: LocalImageData) => {
    // This is a complex operation and would require multiple precise calls to a vision model.
    // For now, we'll mock a response. A real implementation would be a multi-step pipeline.
    
    // In a real scenario:
    // 1. Call to get character from image 1 with background removal
    // 2. Call to get outfit from image 1
    // 3. Call to get outfit from image 2
    // 4. Call to get background from image 1
    // 5. Call to get background from image 2
    
    // Mock response for demonstration:
    return {
        character1_transparent: image1,
        outfit1: image1,
        outfit2: image2,
        outfit3_transparent: image2,
        background1: image1,
        background2: image2,
    };
}

export const analyzePoseAndEmotion = async (apiKey: string, image: LocalImageData) => {
    const ai = getAIClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imageToPart(image),
                { text: "Describe the person's pose, action, and emotion in this image in a way that can be used as part of a text-to-image prompt. Be concise. (Vietnamese)" }
            ]
        },
    });
    return response.text;
}

// FIX: Changed the type of `aspectRatio` from `string` to the more specific `AspectRatio` type to match the `generateImages` function signature.
export const generateBackgroundImage = async (apiKey: string, prompt: string, aspectRatio: AspectRatio): Promise<LocalImageData> => {
    const images = await generateImages(apiKey, { prompt, aspectRatio, numberOfImages: 1 });
    if (images.length === 0) {
        throw new Error("Background image generation failed.");
    }
    return { base64: images[0], mimeType: 'image/jpeg' };
}