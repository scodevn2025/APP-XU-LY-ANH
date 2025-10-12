import { GoogleGenAI, GenerateContentResponse, Modality, Type } from '@google/genai';
import type {
  AppMode,
  LocalImageData,
  GenerateOptions,
  EditOptions,
  MagicOptions,
  AnalyzeOptions,
  VideoOptions,
  ImageGenerateOptions,
  VideoAnalysisOptions,
} from '../types';

/**
 * Initializes and returns a GoogleGenAI client instance.
 * @param apiKey The API key for authentication.
 * @returns An instance of the GoogleGenAI client.
 * @throws An error if the API key is not provided.
 */
const getAiClient = (apiKey: string): GoogleGenAI => {
  if (!apiKey) {
    throw new Error('API key is not configured. Please go to settings to set your API key.');
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Converts local image data to a format suitable for the Gemini API.
 * @param image The local image data (base64 and mimeType).
 * @returns A part object for the Gemini API.
 */
const imageToPart = (image: LocalImageData) => ({
  inlineData: {
    data: image.base64,
    mimeType: image.mimeType,
  },
});

/**
 * Translates a given text prompt to English using the Gemini API.
 * This is a workaround for potential header issues with non-ASCII characters in prompts.
 * @param apiKey User's API key.
 * @param prompt The text prompt to translate.
 * @returns A promise that resolves to the English translation of the prompt.
 */
const translateToEnglish = async (apiKey: string, prompt: string): Promise<string> => {
    // If the prompt is already ASCII, no need to translate
    if (/^[\x00-\x7F]*$/.test(prompt)) {
        return prompt;
    }
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to English. Return ONLY the translated text and nothing else: "${prompt}"`,
        });
        return response.text.trim();
    } catch (e) {
        console.error("Translation failed, using original prompt:", e);
        // Fallback to original prompt if translation fails
        return prompt;
    }
};


/**
 * Generates images based on a text prompt.
 * @param apiKey User's API key.
 * @param options Generation options including prompt, aspect ratio, and number of images.
 * @returns A promise that resolves to an array of base64 encoded image strings.
 */
export const generateImages = async (apiKey: string, options: GenerateOptions): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const translatedPrompt = await translateToEnglish(apiKey, options.prompt);
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: translatedPrompt,
    config: {
      numberOfImages: options.numberOfImages,
      outputMimeType: 'image/jpeg',
      aspectRatio: options.aspectRatio,
    },
  });

  const successfulImages = response.generatedImages.filter(img => img.image?.imageBytes).map(img => img.image!.imageBytes);

  if (successfulImages.length === 0 && response.generatedImages.length > 0) {
    // FIX: Cast to `any` to access properties that might be missing from the type definition
    // in the project's environment, but are expected at runtime for failed image generations.
    const firstFailure = response.generatedImages[0] as any;
    let finishReasonMessage = `Lý do: ${firstFailure.finishReason}.`;
    if (firstFailure.finishReason === 'SAFETY' && firstFailure.safetyRatings) {
      const blockedCategories = firstFailure.safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
      if (blockedCategories) {
        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt.`;
      }
    }
    throw new Error(`Tạo ảnh thất bại. Không có ảnh nào được tạo. ${finishReasonMessage}`);
  }

  return successfulImages;
};


/**
 * Analyzes an image and returns a descriptive text prompt.
 * @param apiKey User's API key.
 * @param options Options containing the image to analyze.
 * @returns A promise that resolves to a string description of the image.
 */
export const analyzeImage = async (apiKey: string, options: AnalyzeOptions): Promise<string> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: "Describe this image in detail for the purpose of recreating it with an image generation AI. Focus on the subject, style, lighting, composition, and colors. The description should be a single paragraph, written in an inspiring and artistic tone in VIETNAMESE." },
        imageToPart(options.image)
      ]
    },
  });
  return response.text;
};

/**
 * Generates prompt suggestions based on user input.
 * @param apiKey User's API key.
 * @param options Options containing the current prompt, images, and mode.
 * @returns A promise that resolves to an array of string suggestions.
 */
export const generatePromptSuggestions = async (
  apiKey: string,
  options: { prompt: string; images?: LocalImageData[]; mode: AppMode }
): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const { prompt, images, mode } = options;
  const translatedPrompt = await translateToEnglish(apiKey, prompt);

  let requestPrompt = `Based on the following user input for a "${mode}" generation task, generate 3 concise, creative, and diverse prompt suggestions in VIETNAMESE. The user input is: "${translatedPrompt}". Return ONLY a JSON array of strings, like ["suggestion 1", "suggestion 2", "suggestion 3"]. Do not include any other text or markdown.`;
  
  if (mode === 'video') {
    requestPrompt = `Based on the following user input for a video generation task, generate 3 creative and detailed prompts in VIETNAMESE. The user's idea is: "${translatedPrompt}". Each prompt should describe a short video scene, including camera movement, subject action, and atmosphere. Return ONLY a JSON array of strings, with each string being a complete prompt. Example: ["A slow-motion shot of a raindrop falling on a leaf...", "A drone shot flying through a futuristic city...", "A cozy fireplace with the sound of crackling fire..."].`;
  }
  
  const parts: any[] = [{ text: requestPrompt }];

  if (images && images.length > 0) {
    parts.push({ text: "The user also provided these images as context:" });
    images.forEach(img => parts.push(imageToPart(img)));
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    const jsonString = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(jsonString);
    if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
      return suggestions.slice(0, 3);
    }
    throw new Error("Parsed JSON is not an array of strings.");
  } catch (e) {
    console.error("Failed to parse prompt suggestions:", e, "Raw response:", response.text);
    return ["Một bức ảnh chân thực của...", "Một bức tranh minh họa theo phong cách anime...", "Một cảnh quay điện ảnh 4k của..."];
  }
};

/**
 * Generates a video from a prompt and optional image.
 * @param apiKey User's API key.
 * @param options Video generation options.
 * @returns A promise that resolves to an array containing the local URL of the generated video.
 */
export const generateVideo = async (apiKey: string, options: VideoOptions): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const translatedPrompt = await translateToEnglish(apiKey, options.prompt);
  
  const requestPayload: any = {
    model: 'veo-2.0-generate-001',
    prompt: translatedPrompt,
    config: {
      numberOfVideos: 1,
    }
  };

  if (options.image) {
    requestPayload.image = {
      imageBytes: options.image.base64,
      mimeType: options.image.mimeType,
    };
  }

  let operation = await ai.models.generateVideos(requestPayload);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation completed, but no download link was found.");
  }
  
  const response = await fetch(`${downloadLink}&key=${apiKey}`);
  if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
  }
  const videoBlob = await response.blob();
  const videoUrl = URL.createObjectURL(videoBlob);
  
  return [videoUrl];
};

/**
 * Performs various magic edit operations on an image.
 * @param apiKey User's API key.
 * @param options Magic edit options including action, image, prompt, and mask.
 * @returns A promise that resolves to an array of base64 encoded result images.
 */
export const magicEdit = async (apiKey: string, options: MagicOptions): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const { action, image, prompt, mask } = options;

  let textInstruction = "";
  const parts: any[] = [];
  
  if (action === 'remove-object' && prompt) {
     const translatedPrompt = await translateToEnglish(apiKey, prompt);
     if (mask) {
         textInstruction = `Remove the object described as "${translatedPrompt}", which is also indicated by the white area in the following mask. Inpaint the area to match the surroundings.`;
     } else {
         textInstruction = `From the image, remove the object described as: "${translatedPrompt}". Inpaint the area to match the surroundings seamlessly.`;
     }
  } else if (prompt) {
     const translatedPrompt = await translateToEnglish(apiKey, prompt);
     switch (action) {
       case 'change-background':
         textInstruction = `Change the background of this image to the following description: "${translatedPrompt}". Keep the foreground subject perfectly intact and blend it naturally with the new background.`;
         break;
       // other cases that use prompt...
     }
  }

  if (!textInstruction) {
    switch (action) {
        case 'upscale':
          textInstruction = "Please enhance and upscale this image to a higher resolution. Increase details and sharpness while preserving the original artistic style and composition.";
          break;
        case 'remove-bg':
          textInstruction = "Remove the background from this image, leaving only the main subject with a transparent background. Please provide the output as a PNG file.";
          break;
        case 'remove-object':
          if(mask){
             textInstruction = "Remove the object indicated by the white area in the following mask and inpaint the area to match the surroundings.";
          } else {
             throw new Error("For 'remove-object' action, a mask or a text prompt is required.");
          }
          break;
        case 'fix-colors':
          textInstruction = "Automatically adjust and correct the colors, brightness, and contrast of this image to make it look more professional, vibrant, and balanced.";
          break;
      }
  }

  parts.push({ text: textInstruction });
  parts.push(imageToPart(image));
  if (action === 'remove-object' && mask) {
    parts.push(imageToPart(mask));
  }


  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  const imageParts = response.candidates?.[0]?.content?.parts.filter(p => p.inlineData);
  if (!imageParts || imageParts.length === 0) {
    const textParts = response.candidates?.[0]?.content?.parts?.filter(p => p.text) || [];
    const textResponse = textParts.map(p => p.text).join(' ');

    let finishReasonMessage = '';
    const finishReason = response.candidates?.[0]?.finishReason;
    const safetyRatings = response.candidates?.[0]?.safetyRatings;

    if (finishReason && finishReason !== 'STOP') {
        finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
        if (finishReason === 'SAFETY' && safetyRatings) {
            const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
            if(blockedCategories){
               finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
            }
        }
    }

    throw new Error(`Magic edit thất bại. Model không trả về ảnh.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
  }

  return imageParts.map(p => p.inlineData!.data);
};

/**
 * Edits an image by combining multiple source images based on a prompt.
 * @param apiKey User's API key.
 * @param options Edit options including prompt and various source images.
 * @returns A promise that resolves to an array of base64 encoded result images.
 */
export const editImage = async (apiKey: string, options: EditOptions): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const { prompt, characterImages, productImage, backgroundImage, numberOfVariations } = options;
  const translatedPrompt = await translateToEnglish(apiKey, prompt);

  const singleImageEdit = async (): Promise<string> => {
      const parts: any[] = [];
      
      const systemPrompt = `You are a professional photo editor performing a technical image composition. Your most important task is to maintain the identity of the person from the reference image.

**CRITICAL RULE (NON-NEGOTIABLE):**
The face, head, hair, body shape (vóc dáng), and physical proportions of the person in the final image MUST be **IDENTICAL** to the person in the **CHARACTER REFERENCE** image provided. This is a 100% perfect, pixel-accurate identity transfer. **DO NOT** change, alter, or artistically reinterpret the character's appearance in any way.

**TASK:**
1.  **Identify the Character:** Use the provided **CHARACTER REFERENCE** image(s) to lock the person's identity.
2.  **Compose the Scene:** Create a new scene based on the following instruction: "${translatedPrompt}".
3.  **Incorporate Elements:** If **PRODUCT** or **BACKGROUND** images are provided, integrate them into the scene as requested.
4.  **Finalize:** Place the **IDENTICAL** character from Step 1 into the composed scene from Step 2 & 3. Ensure lighting and shadows are consistent.

**FINAL CHECK:** Before outputting, ask yourself: "Does the person in my final image look **EXACTLY** like the person in the CHARACTER REFERENCE image?" If the answer is no, you must start over.
`;
      parts.push({text: systemPrompt});
      
      parts.push({ text: "This is the CHARACTER REFERENCE image:" });
      characterImages.forEach(img => parts.push(imageToPart(img)));
      if (productImage) {
        parts.push({ text: "This is the PRODUCT image to incorporate:" });
        parts.push(imageToPart(productImage));
      }
      if (backgroundImage) {
        parts.push({ text: "This is the BACKGROUND image to use:" });
        parts.push(imageToPart(backgroundImage));
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (!imagePart) {
          const textParts = response.candidates?.[0]?.content?.parts?.filter(p => p.text) || [];
          const textResponse = textParts.map(p => p.text).join(' ');

          let finishReasonMessage = '';
          const finishReason = response.candidates?.[0]?.finishReason;
          const safetyRatings = response.candidates?.[0]?.safetyRatings;

          if (finishReason && finishReason !== 'STOP') {
              finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
              if (finishReason === 'SAFETY' && safetyRatings) {
                  const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                   if(blockedCategories){
                      finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                   }
              }
          }
          throw new Error(`Biến hoá ảnh thất bại. Model không trả về ảnh cho một trong các phiên bản.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
      }
      return imagePart.inlineData!.data;
  };
  
  const promises: Promise<string>[] = [];
  for (let i = 0; i < numberOfVariations; i++) {
    promises.push(singleImageEdit());
  }

  const results = await Promise.all(promises);

  if (results.length === 0) {
    throw new Error("Edit image failed. The model did not return any images.");
  }

  return results;
};

/**
 * Recomposes a new image from character, outfit, and background components.
 * @param apiKey User's API key.
 * @param options Image generation options with component images.
 * @returns A promise that resolves to an array of base64 encoded result images.
 */
export const recomposeImage = async (apiKey: string, options: ImageGenerateOptions): Promise<string[]> => {
    const ai = getAiClient(apiKey);
    const { prompt, characterImage, selectedOutfitImage, selectedBackgroundImage, numberOfImages } = options;
    const translatedPrompt = await translateToEnglish(apiKey, prompt);

    const singleRecompose = async (): Promise<string> => {
        const textPrompt = `
You are a master photo editor with a critical task: compositing a new image from three distinct sources. Absolute precision is required.

**Source Images:**
1.  **CHARACTER REFERENCE (Image 1):** This image contains the target person. Their face and identity are SACRED and MUST NOT be changed.
2.  **OUTFIT SOURCE (Image 2):** This image contains the target clothing.
3.  **BACKGROUND SOURCE (Image 3):** This image contains the target scene.

**CRITICAL INSTRUCTIONS (EXECUTE IN ORDER):**

**STEP 1: ISOLATE THE FACE.**
- From the CHARACTER REFERENCE (Image 1), mentally isolate the exact face, head, and hair of the person. This is your target identity.

**STEP 2: CREATE THE FIGURE.**
- Take the OUTFIT from the OUTFIT SOURCE (Image 2) and apply it to a figure.
- The figure should adopt the pose and emotion described here: "${translatedPrompt || 'standing naturally'}".

**STEP 3: PERFORM THE FACE SWAP (MOST IMPORTANT STEP).**
- **REPLACE** the face on the figure you created in Step 2 with the **EXACT face** you isolated in Step 1.
- This must be a **100% perfect, pixel-accurate transfer** of the identity from the CHARACTER REFERENCE. No blending, no reinterpretation.

**STEP 4: COMPOSE THE SCENE.**
- Place the final character (with the correct face and outfit) into the BACKGROUND SOURCE (Image 3).
- Match the lighting perfectly.

**FINAL CHECK:**
- Before outputting, ask yourself: "Does the face in my final image look **IDENTICAL** to the face in the CHARACTER REFERENCE image?" If the answer is no, you must start over.

Generate one photorealistic image that strictly follows these steps.
`;

        const parts = [
            { text: textPrompt },
            { text: "Source Image 1 (CHARACTER REFERENCE):" },
            imageToPart(characterImage),
            { text: "Source Image 2 (OUTFIT SOURCE):" },
            imageToPart(selectedOutfitImage),
            { text: "Source Image 3 (BACKGROUND SOURCE):" },
            imageToPart(selectedBackgroundImage)
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imagePart) {
            return imagePart.inlineData!.data;
        } else {
            const textParts = response.candidates?.[0]?.content?.parts?.filter(p => p.text) || [];
            const textResponse = textParts.map(p => p.text).join(' ');
            console.error("Recomposition failure text from model:", textResponse);

            let finishReasonMessage = '';
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.candidates?.[0]?.safetyRatings;
            
            if (finishReason && finishReason !== 'STOP') {
                finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
                if (finishReason === 'SAFETY' && safetyRatings) {
                    const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                    if(blockedCategories){
                        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                    }
                }
            }

            throw new Error(`Tạo ảnh từ ảnh thất bại. Model không trả về ảnh.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
        }
    };

    const promises: Promise<string>[] = Array(numberOfImages).fill(null).map(() => singleRecompose());
    const results = await Promise.all(promises);

    if (results.length === 0) {
        throw new Error("Image recomposition failed. The model did not return any images.");
    }
    return results;
};


/**
 * Analyzes an image to describe the person's pose and emotion.
 * @param apiKey User's API key.
 * @param image The image to analyze.
 * @returns A promise that resolves to a short text description.
 */
export const analyzePoseAndEmotion = async (apiKey: string, image: LocalImageData): Promise<string> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: "Describe in VIETNAMESE the pose, action, and emotion of the person in this image in a short, descriptive phrase suitable for an image generation prompt. For example: 'smiling and holding a bouquet of flowers', 'confidently walking towards the camera', 'pensively looking into the distance'." },
        imageToPart(image)
      ]
    },
  });
  return response.text;
};

/**
 * A helper function to perform a single image extraction task.
 * @param apiKey User's API key.
 * @param image The source image.
 * @param prompt The specific extraction instruction.
 * @returns A promise that resolves to the extracted LocalImageData.
 */
const extractComponent = async (apiKey: string, image: LocalImageData, prompt: string): Promise<LocalImageData> => {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: prompt },
                imageToPart(image),
            ]
        },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!imagePart || !imagePart.inlineData) {
        throw new Error(`A specific component extraction failed. The model did not return an image for the prompt: "${prompt}"`);
    }
    return {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png'
    };
};

/**
 * Extracts multiple components from two images by making parallel, atomic API calls.
 * @param apiKey User's API key.
 * @param image1 The first source image (character).
 * @param image2 The second source image (concept).
 * @returns A promise that resolves to an object containing multiple extracted image components.
 */
export const extractImageComponents = async (apiKey: string, image1: LocalImageData, image2: LocalImageData): Promise<{
  outfit1: LocalImageData;
  outfit2: LocalImageData;
  outfit3_transparent: LocalImageData;
  background2: LocalImageData;
}> => {
  
  const prompts = {
      outfit1: "From the provided image, extract the complete outfit worn by the person. Your single task is to create a 'flat lay' of this outfit on a neutral gray studio background. Preserve 100% of the outfit's shape, details, patterns, and color. The final output must be ONLY the flat-lay image.",
      outfit2: "From the provided image, extract the complete outfit (including any accessories like hats) worn by the person. Your single task is to create a 'flat lay' of this outfit on a neutral gray studio background. Preserve 100% of the outfit's shape, details, patterns, and color. The final output must be ONLY the flat-lay image.",
      outfit3_transparent: "From the provided image, perfectly isolate the complete outfit worn by the person. Your single task is to remove the person and the background entirely. The output must be just the outfit on a transparent background (PNG format), preserving its original 3D shape as if it were still being worn.",
      background2: "From the provided image, your single task is to completely remove the person. Realistically inpaint the area where the person was to seamlessly complete the background scene. The final image must be ONLY the background without the person."
  };

  try {
    const [
      outfit1,
      outfit2,
      outfit3_transparent,
      background2
    ] = await Promise.all([
      extractComponent(apiKey, image1, prompts.outfit1),
      extractComponent(apiKey, image2, prompts.outfit2),
      extractComponent(apiKey, image2, prompts.outfit3_transparent),
      extractComponent(apiKey, image2, prompts.background2)
    ]);

    return { outfit1, outfit2, outfit3_transparent, background2 };
    
  } catch (error: any) {
    console.error("Component extraction failed:", error);
    throw new Error(`Component extraction failed. One of the steps did not complete successfully. This is an experimental feature and may not always succeed. Please try with different images. Original error: ${error.message}`);
  }
};

const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export const processVideoFile = async (file: File, onProgress: (progress: number, message: string) => void): Promise<VideoAnalysisOptions> => {
    onProgress(5, 'Đang tải video vào bộ nhớ...');
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
    });

    onProgress(10, 'Đang trích xuất các khung hình...');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error("Could not create canvas context");

    const maxFrames = 60; // Limit number of frames to avoid excessive API usage
    const frameInterval = Math.max(1, video.duration / maxFrames);
    const frames: LocalImageData[] = [];
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    for (let i = 0; i < maxFrames; i++) {
        const time = i * frameInterval;
        if (time > video.duration) break;
        video.currentTime = time;
        await new Promise(resolve => { video.onseeked = resolve; });
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        frames.push({ base64, mimeType: 'image/jpeg' });
        onProgress(10 + (i / maxFrames) * 40, `Đã trích xuất ${i + 1}/${Math.min(maxFrames, Math.floor(video.duration / frameInterval))} khung hình...`);
    }

    onProgress(50, 'Đang trích xuất âm thanh...');
    let audio: VideoAnalysisOptions['audio'];
    try {
        // FIX: Cast window to `any` to allow access to the vendor-prefixed webkitAudioContext for broader browser support.
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Resample to 16kHz mono
        const offlineContext = new OfflineAudioContext(1, decodedBuffer.duration * 16000, 16000);
        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = decodedBuffer;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start();
        const resampledBuffer = await offlineContext.startRendering();

        // Convert to PCM Int16
        const pcmData = resampledBuffer.getChannelData(0);
        const int16 = new Int16Array(pcmData.length);
        for(let i=0; i<pcmData.length; i++){
            int16[i] = Math.max(-1, Math.min(1, pcmData[i])) * 32767;
        }
        const audioBase64 = encode(new Uint8Array(int16.buffer));
        audio = { base64: audioBase64, mimeType: 'audio/pcm;rate=16000' };
        onProgress(95, 'Trích xuất âm thanh thành công.');
    } catch(e) {
        console.error("Audio extraction failed:", e, "Proceeding with video-only analysis.");
        onProgress(95, 'Không thể trích xuất âm thanh, tiếp tục với phân tích hình ảnh.');
        // Create a silent audio track as a placeholder
         audio = { base64: "", mimeType: 'audio/pcm;rate=16000' };
    }
    
    URL.revokeObjectURL(videoUrl);
    onProgress(100, 'Hoàn tất xử lý!');
    return { frames, audio };
};


export const analyzeVideo = async (apiKey: string, options: VideoAnalysisOptions): Promise<string> => {
    const ai = getAiClient(apiKey);
    const { frames, audio } = options;

    const prompt = `
Analyze this video, provided as a sequence of frames and an audio track. Provide a comprehensive, detailed analysis in VIETNAMESE. Your response MUST be a JSON object matching the provided schema.

Analysis tasks:
1.  **summary**: Write a detailed paragraph summarizing the entire video's content, including actions, characters, and setting.
2.  **storyboard**: Create a storyboard by identifying key moments. For each moment, provide the timestamp in seconds and a concise description. Also provide the index of the most representative frame for that moment from the input frames.
3.  **scene_transitions**: Identify distinct scenes and list their start and end times in seconds, along with a brief description of each scene.
4.  **transcription**: Transcribe all spoken words from the audio. If the audio is silent or contains no speech, state "Không có lời thoại."
5.  **srt_subtitles**: Based on the transcription, generate subtitles in the standard SRT format. Detect the language automatically. Include accurate timestamps. If there is no speech, return an empty string.
`;
    
    const parts: any[] = [{ text: prompt }];
    frames.forEach(frame => parts.push(imageToPart(frame)));
    if (audio.base64) {
        parts.push({ inlineData: { data: audio.base64, mimeType: audio.mimeType } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'Detailed summary of the video.' },
                    storyboard: {
                        type: Type.ARRAY,
                        description: 'Key moments in the video.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                timestamp_seconds: { type: Type.NUMBER, description: 'Timestamp in seconds.' },
                                description: { type: Type.STRING, description: 'Description of the moment.' },
                                keyframe_index: { type: Type.INTEGER, description: 'Index of the representative frame from the input list.' }
                            }
                        }
                    },
                    scene_transitions: {
                        type: Type.ARRAY,
                        description: 'List of identified scenes.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                start_time_seconds: { type: Type.NUMBER },
                                end_time_seconds: { type: Type.NUMBER },
                                description: { type: Type.STRING, description: 'Description of the scene.' },
                            }
                        }
                    },
                    transcription: { type: Type.STRING, description: 'Full transcribed dialogue.' },
                    srt_subtitles: { type: Type.STRING, description: 'Subtitles in SRT format.' }
                }
            }
        }
    });

    return response.text;
};