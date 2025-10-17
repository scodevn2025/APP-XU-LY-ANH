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
  AspectRatio,
  PhotoRestoreOptions,
  ConceptOptions,
  AutoFilterStyle,
  AITravelOptions,
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
 * A unified, strict set of instructions for the AI to preserve character identity.
 * @returns A string containing the directive.
 */
const getIdentityPreservationDirective = () => `
**IDENTITY PRESERVATION DIRECTIVE (NON-NEGOTIABLE):**
- **SUBJECT:** The person present in the primary reference image.
- **RULE:** The identity of the SUBJECT must be preserved with 100% accuracy. This is the absolute highest priority.
- **DEFINITION:** "Identity" includes all facial features, head shape, skin tone, hair style/color, and body shape/build. This is the person's unique "identity vector".
- **EXECUTION:** You must perform a technical replication of the SUBJECT's identity. Do not reinterpret, stylize, or alter the person in any way, even to match a new style. The person must look exactly as if they were cut from the original photo and seamlessly integrated into the new scene. All subsequent edits (lighting, etc.) must not compromise this perfect likeness.
- **FAILURE CONDITION:** Any deviation from the SUBJECT's original appearance is a critical failure.
`;

/**
 * A unified, strict set of instructions for the AI to preserve product identity.
 * @returns A string containing the directive.
 */
const getProductIdentityDirective = () => `
**PRODUCT INTEGRITY DIRECTIVE (NON-NEGOTIABLE):**
- **SUBJECT:** The product present in the reference image.
- **RULE:** The identity and appearance of the SUBJECT (shape, color, branding, text, etc.) must be preserved with 100% accuracy. The product itself must not be altered in any way.
- **EXECUTION:** You must perform a technical replication of the SUBJECT. Place this exact product into a new scene based on the user's description. The original background must be completely replaced. Create a high-quality, professional photograph with realistic lighting, shadows, and perspective that make the product look natural in the new environment.
- **FOCUS:** The product is the hero of the image.
- **FAILURE CONDITION:** Any deviation from the SUBJECT's original appearance is a critical failure.`;


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
            contents: {
                parts: [
                    { text: "You are a translation assistant. Your task is to translate the user-provided text into English. You must return ONLY the translated English text, with no additional explanations, formatting, or conversational text." },
                    { text: prompt }
                ]
            }
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
    const firstFailure = response.generatedImages[0] as any;
    let finishReasonMessage = `Lý do: ${firstFailure.finishReason}.`;
    if (firstFailure.finishReason?.includes('SAFETY') && firstFailure.safetyRatings) {
      const blockedCategories = firstFailure.safetyRatings.filter((r: any) => r.blocked).map((r: any) => r.category).join(', ');
      if (blockedCategories) {
        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt.`;
      }
    }
    throw new Error(`Tạo ảnh thất bại. Không có ảnh nào được tạo. ${finishReasonMessage}`);
  }

  return successfulImages;
};

/**
 * Generates a professional product shot by placing a product into a new scene.
 * @param apiKey User's API key.
 * @param options Options including the product image and scene prompt.
 * @returns A promise that resolves to an array of base64 encoded image strings.
 */
export const generateProductShot = async (apiKey: string, options: GenerateOptions): Promise<string[]> => {
    const ai = getAiClient(apiKey);
    // Fix: Destructure `images` from options and get the first image, as `GenerateOptions` does not have an `image` property.
    const { images, prompt, numberOfImages } = options;
    const image = images?.[0];
    if (!image) {
        throw new Error("Product image is required for this function.");
    }
    const translatedPrompt = await translateToEnglish(apiKey, prompt);

    const singleImageGeneration = async (): Promise<string> => {
        const userPrompt = `Take the product from the provided image and place it into a new scene described as: "${translatedPrompt}".
${getProductIdentityDirective()}`;

        const parts = [imageToPart(image), { text: userPrompt }];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
            const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
            const textResponse = textParts.map(p => p.text).join(' ');
            let finishReasonMessage = '';
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            if (finishReason && finishReason !== 'STOP') {
                finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
                if (finishReason?.includes('SAFETY') && safetyRatings) {
                    const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                    if (blockedCategories) {
                        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                    }
                }
            }
            throw new Error(`Tạo ảnh sản phẩm thất bại. Model không trả về ảnh.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
        }
        return candidate.content.parts.find(p => p.inlineData)!.inlineData!.data;
    };

    const promises = Array(numberOfImages).fill(null).map(() => singleImageGeneration());
    return Promise.all(promises);
};

/**
 * Generates an AI travel postcard by placing a person in a new location with a specific outfit.
 * @param apiKey User's API key.
 * @param options Options including the character image, outfit, location, and custom prompt.
 * @returns A promise that resolves to an array of base64 encoded image strings.
 */
export const generateAITravelImage = async (apiKey: string, options: AITravelOptions): Promise<string[]> => {
    const ai = getAiClient(apiKey);
    const { characterImages, outfitPrompt, locationPrompt, customPrompt, numberOfImages } = options;

    const translatedOutfit = outfitPrompt?.trim() ? await translateToEnglish(apiKey, outfitPrompt) : '';
    const translatedLocation = locationPrompt?.trim() ? await translateToEnglish(apiKey, locationPrompt) : '';
    const translatedCustom = customPrompt?.trim() ? await translateToEnglish(apiKey, customPrompt) : '';

    const singleImageGeneration = async (): Promise<string> => {
        let textPrompt = `**TASK:** Create a photorealistic photograph.\n\n**ASSETS & INSTRUCTIONS:**\n`;
        textPrompt += `- **CHARACTER:** The first ${characterImages.length} image(s) contain the person whose identity must be preserved.\n`;

        if (translatedLocation) {
            textPrompt += `- **SCENE:** Place this person in the following scene: "${translatedLocation}".\n`;
        }
        if (translatedOutfit) {
            textPrompt += `- **OUTFIT:** The person should be wearing: "${translatedOutfit}".\n`;
        }
        if (translatedCustom) {
            textPrompt += `- **DETAILS:** Additional instructions: "${translatedCustom}".\n\n`;
        } else {
             textPrompt += `\n`;
        }

        textPrompt += `${getIdentityPreservationDirective()}`;
        textPrompt += `\n**EXECUTION:** Combine these elements seamlessly. The highest priority is the perfect, 100% accurate preservation of the person's identity from the reference images.`;
        
        const parts = [...characterImages.map(imageToPart), { text: textPrompt }];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
            const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
            const textResponse = textParts.map(p => p.text).join(' ');
            let finishReasonMessage = '';
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            if (finishReason && finishReason !== 'STOP') {
                finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
                if (finishReason?.includes('SAFETY') && safetyRatings) {
                    const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                    if (blockedCategories) {
                        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                    }
                }
            }
            throw new Error(`Tạo ảnh du lịch thất bại. Model không trả về ảnh.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
        }
        return candidate.content.parts.find(p => p.inlineData)!.inlineData!.data;
    };

    const promises = Array(numberOfImages).fill(null).map(() => singleImageGeneration());
    return Promise.all(promises);
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
    model: 'veo-3.1-fast-generate-preview',
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
 * Generates an image by applying a concept to a character image.
 * @param apiKey User's API key.
 * @param options Options including the character image and concept prompt.
 * @returns A promise that resolves to an array of base64 encoded image strings.
 */
export const generateConceptImage = async (apiKey: string, options: ConceptOptions): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const { characterImage, conceptPrompt, numberOfImages } = options;
  const translatedPrompt = await translateToEnglish(apiKey, conceptPrompt);

  const singleImageGeneration = async (): Promise<string> => {
    const userPrompt = `Take the person from the provided reference image and place them into a new scene based on this concept: "${translatedPrompt}".
${getIdentityPreservationDirective()}
The final image must be photorealistic with seamless integration, correct lighting, and shadows. The absolute highest priority is the perfect, 100% accurate preservation of the person's identity from the reference image.`;
    
    const parts = [imageToPart(characterImage), { text: userPrompt }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
      const finishReason = candidate?.finishReason || 'UNKNOWN';
      const safetyRatings = candidate?.safetyRatings;
      let reasonMessage = `Model returned no content. Finish reason: ${finishReason}.`;
      if (finishReason?.includes('SAFETY') && safetyRatings) {
          const blocked = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
          if (blocked) reasonMessage += ` Blocked categories: ${blocked}.`;
      }
      console.error("generateConceptImage failed:", reasonMessage, response);
      throw new Error(`Tạo ảnh concept thất bại. ${reasonMessage}`);
    }

    const imagePart = candidate.content.parts.find(p => p.inlineData);
    if (!imagePart) {
      const textResponse = candidate.content.parts.map(p => p.text).join(' ') || 'No text response';
      throw new Error(`Tạo ảnh concept thất bại. Model không trả về ảnh. Phản hồi từ model: "${textResponse}"`);
    }
    return imagePart.inlineData!.data;
  };

  const promises = Array(numberOfImages).fill(null).map(() => singleImageGeneration());
  return Promise.all(promises);
};

/**
 * Performs various magic edit operations on an image.
 * @param apiKey User's API key.
 * @param options Magic edit options including action, image, prompt, and mask.
 * @returns A promise that resolves to an array of base64 encoded result images.
 */
export const magicEdit = async (apiKey: string, options: MagicOptions): Promise<string[]> => {
  const ai = getAiClient(apiKey);
  const { action, image, prompt, mask, numberOfImages, aspectRatio, filterStyle } = options;

  if (action === 'creative') {
    if (!prompt || !numberOfImages || !aspectRatio) {
      throw new Error("Prompt, number of images, and aspect ratio are required for creative editing.");
    }
    const translatedPrompt = await translateToEnglish(apiKey, prompt);

    const singleCreativeEdit = async (): Promise<string> => {
      const userPrompt = `Take the person from the provided reference image and place them into a completely new scene or style as described here: "${translatedPrompt}".
${getIdentityPreservationDirective()}
Execute this creative transformation, ensuring the person remains identical.`;
      
      const parts = [imageToPart(image), { text: userPrompt }];
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] },
      });
      const candidate = response.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
          const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
          const textResponse = textParts.map(p => p.text).join(' ');
          let finishReasonMessage = '';
          const finishReason = candidate?.finishReason;
          const safetyRatings = candidate?.safetyRatings;
          if (finishReason && finishReason !== 'STOP') {
              finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
              if (finishReason?.includes('SAFETY') && safetyRatings) {
                  const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                   if(blockedCategories){
                      finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                   }
              }
          }
          throw new Error(`Magic edit (sáng tạo) thất bại. Model không trả về ảnh. Điều này có thể xảy ra với một số ảnh đầu vào.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
      }
      return candidate.content.parts.find(p => p.inlineData)!.inlineData!.data;
    };
    const promises = Array(numberOfImages).fill(null).map(() => singleCreativeEdit());
    return Promise.all(promises);
  }

  // Fallback to original logic for other actions
  let textInstruction = "";
  const parts: any[] = [];

  if (action === 'auto-filter') {
    switch (filterStyle) {
        case 'cinematic-teal-orange':
            textInstruction = "Apply a cinematic color grade to this image. Shift the shadows and midtones towards teal and the highlights and skin tones towards orange. Increase the contrast for a dramatic, movie-like feel. Do not alter the subject or composition.";
            break;
        case 'vintage':
            textInstruction = "Apply a vintage film look to this photo. Emulate the color palette of Kodak Portra film with warm tones, slightly faded blacks, and fine grain. Keep the original composition and subject identity.";
            break;
        case 'dramatic-bw':
            textInstruction = "Convert this image to a high-contrast, dramatic black and white. Deepen the blacks and brighten the whites to create a powerful, moody image. Emphasize textures and shapes. Preserve all original details.";
            break;
        case 'vibrant-pop':
            textInstruction = "Enhance this image with a vibrant, high-saturation color pop style. Make the colors rich and lively, increase the overall brightness and contrast, but ensure skin tones remain natural. The result should feel energetic and modern.";
            break;
        case 'soft-dreamy':
            textInstruction = "Give this image a soft, dreamy, ethereal look. Apply a gentle glow effect (bloom), slightly reduce clarity, and shift the colors towards light pastel tones. The mood should be romantic and gentle, like a pleasant memory.";
            break;
        case 'matte-moody':
            textInstruction = "Apply a moody, matte film look. Lift the black point to create a faded effect in the shadows. Desaturate the colors slightly and reduce clarity for a soft, atmospheric feel. The overall mood should be pensive and cinematic. Do not alter the subject or composition.";
            break;
        case 'high-contrast-bw':
            textInstruction = "Convert this image to a high-contrast black and white with a powerful, graphic style. Intentionally brighten reds and oranges to create luminous, flattering skin tones, while deepening blues and cyans to increase sky/background drama. Push the overall contrast and clarity to emphasize textures. Preserve all original details.";
            break;
        case 'cyberpunk-neon':
            textInstruction = "Apply a cyberpunk neon color grade, perfect for night cityscapes. Shift the color palette towards vibrant magentas, blues, and cyans. Increase the saturation of these cool tones while slightly desaturating oranges and yellows. Add a touch of dehaze to make lights pop and create a futuristic, rainy night atmosphere. Do not alter the subject or composition.";
            break;
        case 'portra-film':
            textInstruction = "Emulate the look of Kodak Portra film. Apply a warm, gentle color grade with slightly reduced contrast and boosted vibrance. Carefully adjust skin tones to be soft, warm, and flattering. Add a fine layer of film grain for an authentic analog feel. The result should be timeless and perfect for portraits.";
            break;
        case 'creamy-skin':
            textInstruction = "Apply a professional portrait retouch to create a 'creamy skin' effect. Make the skin look smooth and clean with a porcelain-like quality. Slightly decrease overall contrast and clarity to soften the look. Adjust orange and red tones for a milky complexion, and slightly lift the black point for a gentle matte finish. The final image should be bright, clean, and high-end.";
            break;
        case 'golden-hour-pop':
            textInstruction = "Enhance the image to create a vibrant 'golden hour' glow. Significantly warm up the temperature and boost vibrance. Deepen shadows while protecting highlights to add depth. Shift blue tones slightly towards teal for a pleasing cinematic contrast. The overall mood should be warm, radiant, and reminiscent of late afternoon sunlight.";
            break;
        case 'creamy-bw':
            textInstruction = "Convert this image to a soft, creamy black and white portrait. When converting, ensure red and orange tones are brightened to create smooth, luminous skin. Slightly decrease clarity and add a fine layer of film grain (around 10-15 strength) for a classic, analog texture. The result should be a timeless and flattering black and white portrait.";
            break;
        case 'punchy-landscape':
            textInstruction = "Enhance this landscape photo to make it punchy and vibrant. Increase clarity, dehaze, and vibrance (not saturation) to bring out details and rich colors. Boost the saturation of blues and greens specifically. Shift yellow tones slightly away from pure yellow to avoid an unnatural look in foliage. The result should be a vivid, eye-catching landscape.";
            break;
        case 'cinematic-landscape':
            textInstruction = "Apply a 'teal and orange' cinematic color grade suitable for landscapes. Shift the sky and water tones (blues and cyans) towards a rich teal. Warm up the land, soil, and foliage tones (oranges, yellows, and reds). Add a gentle S-curve for pleasing contrast. The final image should have a distinct and popular cinematic travel photography look.";
            break;
        case 'moody-forest':
            textInstruction = "Transform this forest scene with a deep, moody, and atmospheric feel. Cool the overall temperature slightly while increasing contrast. Deepen the shadows significantly and reduce highlights. Shift the greens towards a desaturated, darker olive tone. The final image should feel mysterious and cinematic, evoking a sense of calm and depth.";
            break;
        default:
             throw new Error("Invalid filter style selected.");
    }
  } else if (action === 'remove-object' && prompt) {
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
      responseModalities: [Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imageParts = candidate?.content?.parts.filter(p => p.inlineData);

  if (!imageParts || imageParts.length === 0) {
    const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
    const textResponse = textParts.map(p => p.text).join(' ');
    let finishReasonMessage = '';
    const finishReason = candidate?.finishReason;
    const safetyRatings = candidate?.safetyRatings;
    if (finishReason && finishReason !== 'STOP') {
        finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
        if (finishReason?.includes('SAFETY') && safetyRatings) {
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
      characterImages.forEach(img => parts.push(imageToPart(img)));
      if (productImage) {
          parts.push(imageToPart(productImage));
      }
      if (backgroundImage) {
          parts.push(imageToPart(backgroundImage));
      }

      let textPrompt = `**TASK:** Photocomposition. Create a new, photorealistic image based on the user's text prompt: "${translatedPrompt}".\n\n**ASSETS & INSTRUCTIONS:**\n`;

      let assetIndex = 1;
      if (characterImages.length > 0) {
          const imageIndices = characterImages.length === 1 ? "The first image contains" : `The first ${characterImages.length} images contain`;
          textPrompt += `- **CHARACTER(S):** ${imageIndices} the person(s) to be used.\n`;
          assetIndex += characterImages.length;
      }
      if (productImage) {
          textPrompt += `- **PRODUCT:** Image ${assetIndex} contains a product to be included.\n`;
          assetIndex++;
      }
      if (backgroundImage) {
          textPrompt += `- **BACKGROUND:** Image ${assetIndex} contains the background scene.\n`;
      }

      textPrompt += `\n${getIdentityPreservationDirective()}`;
      textPrompt += `\n**EXECUTION:** Combine these assets according to the user's prompt. The final composed image must have consistent lighting, shadows, and perspective. The person's identity MUST be perfectly maintained.`;
      
      parts.push({ text: textPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
          const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
          const textResponse = textParts.map(p => p.text).join(' ');
          console.error("Edit image failure:", textResponse, response);

          let finishReasonMessage = '';
          const finishReason = candidate?.finishReason;
          const safetyRatings = candidate?.safetyRatings;

          if (finishReason && finishReason !== 'STOP') {
              finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
              if (finishReason?.includes('SAFETY') && safetyRatings) {
                  const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                   if(blockedCategories){
                      finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                   }
              }
          }
          throw new Error(`Biến hoá ảnh thất bại. Model không trả về ảnh cho một trong các phiên bản.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
      }
      return candidate.content.parts.find(p => p.inlineData)!.inlineData!.data;
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
 * This function no longer uses the concept image directly, relying on the text prompt for pose information.
 * @param apiKey User's API key.
 * @param options Image generation options with clean, pre-extracted component images.
 * @returns A promise that resolves to an array of base64 encoded result images.
 */
export const recomposeImage = async (apiKey: string, options: ImageGenerateOptions): Promise<string[]> => {
    const ai = getAiClient(apiKey);
    const { prompt, characterImage, selectedOutfitImage, selectedBackgroundImage, numberOfImages } = options;
    const translatedPrompt = await translateToEnglish(apiKey, prompt);

    const singleRecompose = async (): Promise<string> => {
        const userPrompt = `**TASK: Photorealistic Character Compositing**
You are a Digital Compositor AI.

**ASSETS:**
- **Image 1 (CHARACTER):** This is the person. Their identity (face, hair, body shape) is the **IDENTITY VECTOR LOCK** and MUST be preserved with 100% fidelity. Any result that does not look exactly like this person is a failure.
- **Image 2 (OUTFIT):** The CHARACTER must be wearing this outfit.
- **Image 3 (BACKGROUND):** The CHARACTER must be placed in this scene.

**INSTRUCTION:**
- The desired pose and action for the CHARACTER are: "${translatedPrompt}".

Combine these elements into a single, seamless, photorealistic image. Ensure lighting, shadows, and perspective are consistent. The absolute highest priority is the perfect replication of the CHARACTER's identity.`;

        const parts = [
            imageToPart(characterImage),
            imageToPart(selectedOutfitImage),
            imageToPart(selectedBackgroundImage),
            { text: userPrompt },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
            const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
            const textResponse = textParts.map(p => p.text).join(' ');
            console.error("Recomposition failure text from model:", textResponse, response);

            let finishReasonMessage = '';
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            
            if (finishReason && finishReason !== 'STOP') {
                finishReasonMessage = ` Quá trình tạo ảnh bị dừng với lý do: ${finishReason}.`;
                if (finishReason?.includes('SAFETY') && safetyRatings) {
                    const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
                    if(blockedCategories){
                        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}. Vui lòng sửa lại prompt hoặc ảnh đầu vào.`;
                    }
                }
            }

            throw new Error(`Tạo ảnh từ ảnh thất bại. Model không trả về ảnh.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
        }
        return candidate.content.parts.find(p => p.inlineData)!.inlineData!.data;
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

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
        const finishReason = candidate?.finishReason || 'UNKNOWN';
        const safetyRatings = candidate?.safetyRatings;
        let reasonMessage = `Model returned no content. Finish reason: ${finishReason}.`;
        if (finishReason?.includes('SAFETY') && safetyRatings) {
            const blocked = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
            if (blocked) reasonMessage += ` Blocked categories: ${blocked}.`;
        }
        console.error("extractComponent failed:", reasonMessage, response);
        throw new Error(`Model failed to extract an image component. ${reasonMessage}`);
    }

    const imagePart = candidate.content.parts.find(p => p.inlineData);
    if (!imagePart || !imagePart.inlineData) {
        const textResponse = candidate.content.parts.filter(p => p.text).map(p => p.text).join(' ') || 'No text response';
        throw new Error(`Model failed to return an image for component extraction. Response: ${textResponse}`);
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
export const extractImageComponents = async (
  apiKey: string,
  image1: LocalImageData,
  image2: LocalImageData
): Promise<{
  character1_transparent: LocalImageData;
  outfit1: LocalImageData;
  outfit2: LocalImageData;
  outfit3_transparent: LocalImageData;
  background1: LocalImageData;
  background2: LocalImageData;
}> => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const isRateLimit = (e: any) =>
    e?.status === 429 || /429|RESOURCE_EXHAUSTED/i.test(String(e?.message || ''));

  /** Get the first image (inlineData) from a response; throw if not present */
  const getFirstImageFromResponse = (response: any, ctx: string) => {
    const cand = response?.candidates?.[0];
    const finishReason = cand?.finishReason;
    const parts = cand?.content?.parts;

    if (!cand || !parts) {
      const safetyRatings = cand?.safetyRatings;
      let reasonMessage = `Model returned no candidates/content${
        finishReason ? ` (finishReason: ${finishReason})` : ''
      }.`;
      if (finishReason?.includes?.('SAFETY') && Array.isArray(safetyRatings)) {
        const blocked = safetyRatings.filter((r: any) => r?.blocked).map((r: any) => r?.category).join(', ');
        if (blocked) reasonMessage += ` Blocked categories: ${blocked}.`;
      }
      throw new Error(`[${ctx}] ${reasonMessage}`);
    }

    const imgPart = parts.find((p: any) => p?.inlineData?.mimeType?.startsWith?.('image/'));
    if (!imgPart?.inlineData?.data) {
      const textResp = parts.map((p: any) => p?.text).filter(Boolean).join(' ') || 'No text response';
      throw new Error(
        `[${ctx}] Model did not return an image part${
          finishReason ? ` (finishReason: ${finishReason})` : ''
        }. Response: ${textResp}`
      );
    }
    return imgPart.inlineData; // { mimeType, data (base64) }
  };

  /** A "softer" prompt to evade safety filters when cutting out the subject */
  const softenForegroundPrompt = () =>
    'Foreground subject cutout for catalog compositing. Keep only the main subject silhouette if present (no background). Output: a single PNG with transparent background (alpha). Return image only.';

  const withRetry = async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    let delay = 800;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn();
      } catch (e: any) {
        if (isRateLimit(e) && attempt < 2) {
          console.warn(`Rate limit hit for ${label} on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
          await sleep(delay);
          delay *= 2; // backoff
          continue;
        }
        console.error(`Error during ${label} after ${attempt + 1} attempts:`, e);
        throw new Error(e?.message || String(e));
      }
    }
    throw new Error(`Retry failed for ${label} after 3 attempts.`);
  };

  const extractForegroundTransparent = async (img: LocalImageData): Promise<LocalImageData> => {
    const ai = getAiClient(apiKey);

    // Attempt 1: Standard prompt
    const tryMain = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text:
                'Foreground subject cutout. Keep only the primary subject (no background). ' +
                'Output must be a single PNG with an alpha channel. Return image only.'
            },
            imageToPart(img),
          ],
        },
        config: { responseModalities: [Modality.IMAGE] },
      });

      const inlineData = getFirstImageFromResponse(response, 'extractForegroundTransparent');
      return {
        base64: inlineData.data,
        mimeType: inlineData.mimeType || 'image/png',
      };
    };

    // Attempt 2: If safety/other error, use a "softer" prompt
    const trySoft = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: softenForegroundPrompt() },
            imageToPart(img),
          ],
        },
        config: { responseModalities: [Modality.IMAGE] },
      });

      const inlineData = getFirstImageFromResponse(response, 'extractForegroundTransparent(soft)');
      return {
        base64: inlineData.data,
        mimeType: inlineData.mimeType || 'image/png',
      };
    };

    try {
      return await tryMain();
    } catch (e: any) {
      if (/finishReason:\s*IMAGE_(SAFETY|OTHER)/i.test(String(e?.message || ''))) {
        console.warn('Foreground cutout failed due to safety or other image issue. Retrying with softened prompt...');
        return await trySoft();
      }
      // If it's not a known image issue, re-throw for withRetry to handle
      throw e;
    }
  };

  // Safer prompts to avoid safety filters
  const prompts = {
    outfit_from_person:
      'Garment-only isolation for a product image. Extract only the clothing as a standalone item (no human figure, no skin, no hair, no limbs). Present as a mannequin-style product photo on a transparent background (PNG). Plausibly complete minor occluded fabric areas (e.g., inside collar) for a clean, complete outfit. Output must contain only the garments.',

    outfit_from_person_fallback:
      'Garment-only isolation for a product image. Extract only the visible clothing pieces (no human figure). Do not reconstruct or infer any hidden or backside areas. Output a single transparent-background PNG that contains garments only.',

    outfit_as_product_shot:
      'Pose-Preserving Garment Extraction. From the provided image, perfectly isolate the complete outfit including all clothing and accessories. Your task is to make the person wearing the clothes completely transparent by removing them. **Crucially, you must not alter the shape, folds, wrinkles, or pose of the garments.** The final output must be a single PNG image containing only the posed outfit on a transparent alpha background. Do not flatten or rearrange the clothes into a flat-lay presentation.',

    background_person_removal:
      'Scene restoration: remove the primary human figure and any associated shadows/reflections. Seamlessly reconstruct the background using surrounding visual context so it appears as if the subject was never present. Deliver only the clean background scene at original resolution.',

    background_person_removal_fallback:
      'Simple subject removal. Erase the primary figure with minimal, context-aware filling to close the gap using nearby textures and colors. A perfect reconstruction is not required; prioritize a clean, unobtrusive result.',
  };

  try {
    const [
      character1_transparent,
      outfit1,
      outfit2_result,
      outfit3_transparent,
      background1_result,
      background2_result,
    ] = await Promise.all([
      withRetry(() => extractForegroundTransparent(image1), 'character1_transparent'),

      // outfit1 from image1
      withRetry(() => extractComponent(apiKey, image1, prompts.outfit_from_person), 'outfit1'),

      // outfit2 from image2 + soft fallback on safety/empty image
      withRetry(() => extractComponent(apiKey, image2, prompts.outfit_from_person), 'outfit2').catch((e) => {
        console.warn('outfit2 primary prompt failed, trying fallback...', e?.message || e);
        return withRetry(
          () => extractComponent(apiKey, image2, prompts.outfit_from_person_fallback),
          'outfit2_fallback'
        );
      }),

      // outfit3 as product shot (now pose-preserving)
      withRetry(() => extractComponent(apiKey, image2, prompts.outfit_as_product_shot), 'outfit3_transparent'),

      // background1 from image1 + fallback
      withRetry(() => extractComponent(apiKey, image1, prompts.background_person_removal), 'background1').catch(
        (e) => {
          console.warn('background1 primary prompt failed, trying fallback...', e?.message || e);
          return withRetry(
            () => extractComponent(apiKey, image1, prompts.background_person_removal_fallback),
            'background1_fallback'
          );
        }
      ),

      // background2 from image2 + fallback
      withRetry(() => extractComponent(apiKey, image2, prompts.background_person_removal), 'background2').catch(
        (e) => {
          console.warn('background2 primary prompt failed, trying fallback...', e?.message || e);
          return withRetry(
            () => extractComponent(apiKey, image2, prompts.background_person_removal_fallback),
            'background2_fallback'
          );
        }
      ),
    ]);

    return {
      character1_transparent,
      outfit1,
      outfit2: outfit2_result,
      outfit3_transparent,
      background1: background1_result,
      background2: background2_result,
    };
  } catch (error: any) {
    console.error('Component extraction failed:', error);
    if (isRateLimit(error)) {
      throw new Error('Bạn đã đạt đến giới hạn yêu cầu API (rate limit). Vui lòng đợi khoảng 1 phút rồi thử lại.');
    }
    throw new Error(
      `Tách thành phần thất bại. Một trong các bước không thành công. Đây là tính năng thử nghiệm và có thể không luôn hoạt động. Vui lòng thử lại với ảnh khác. Chi tiết: ${
        error?.message || String(error)
      }`
    );
  }
};


/**
 * Generates a single background image from a text prompt.
 * @param apiKey User's API key.
 * @param prompt The text prompt for the background.
 * @param aspectRatio The desired aspect ratio.
 * @returns A promise that resolves to the generated LocalImageData.
 */
export const generateBackgroundImage = async (apiKey: string, prompt: string, aspectRatio: AspectRatio): Promise<LocalImageData> => {
  const ai = getAiClient(apiKey);
  const translatedPrompt = await translateToEnglish(apiKey, prompt);
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: translatedPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio,
    },
  });

  const firstImage = response.generatedImages.find(img => img.image?.imageBytes)?.image;

  if (!firstImage || !firstImage.imageBytes) {
    const firstFailure = response.generatedImages[0] as any;
    let finishReasonMessage = `Lý do: ${firstFailure.finishReason}.`;
    if (firstFailure.finishReason?.includes('SAFETY') && firstFailure.safetyRatings) {
      const blockedCategories = firstFailure.safetyRatings.filter((r: any) => r.blocked).map((r: any) => r.category).join(', ');
      if (blockedCategories) {
        finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}.`;
      }
    }
    throw new Error(`Tạo bối cảnh thất bại. ${finishReasonMessage}`);
  }

  return {
    base64: firstImage.imageBytes,
    mimeType: firstImage.mimeType || 'image/jpeg',
  };
};

/**
 * Restores an old or damaged photo using AI.
 * @param apiKey User's API key.
 * @param options The photo restoration options.
 * @returns A promise that resolves to an array of base64 encoded result images.
 */
export const restorePhoto = async (apiKey: string, options: PhotoRestoreOptions): Promise<string[]> => {
    const ai = getAiClient(apiKey);
    const { image, exclusionPrompt, template, gender, age, enhancements } = options;

    const systemPrompt = `
**TASK:** Professional Photo Restoration
**MODEL ROLE:** AI Photo Restoration Specialist
**PRIMARY OBJECTIVE:** Restore the provided old, damaged, or low-quality photo to a high-quality, realistic, and detailed result. Adhere strictly to the user's template and enhancement requests.

**USER TEMPLATE:** "${template}"
**USER ENHANCEMENTS:**
- ${enhancements.join('\n- ')}

**SUBJECT DETAILS (if provided):**
- Gender: ${gender || 'Not specified'}
- Age: ${age || 'Not specified'}

**EXCLUSION DIRECTIVE (NON-NEGOTIABLE):**
- You must follow this rule: "${exclusionPrompt}"

**EXECUTION:**
1.  Analyze the source image for damage (scratches, dust, fading, low resolution).
2.  Apply the restoration based on the **USER TEMPLATE**.
3.  Incorporate all **USER ENHANCEMENTS** precisely.
4.  If subject details are provided, use them to guide facial and feature reconstruction, ensuring a natural and age-appropriate appearance.
5.  Strictly adhere to the **EXCLUSION DIRECTIVE**.
6.  The final output must be a single, restored image. Do not add text or other artifacts.

Now, restore the following image.
`;

    const parts = [{ text: systemPrompt }, imageToPart(image)];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
      const textParts = candidate?.content?.parts?.filter(p => p.text) || [];
      const textResponse = textParts.map(p => p.text).join(' ');
      let finishReasonMessage = '';
      const finishReason = candidate?.finishReason;
      const safetyRatings = candidate?.safetyRatings;
      if (finishReason && finishReason !== 'STOP') {
        finishReasonMessage = ` Quá trình phục chế bị dừng với lý do: ${finishReason}.`;
        if (finishReason?.includes('SAFETY') && safetyRatings) {
          const blockedCategories = safetyRatings.filter(r => r.blocked).map(r => r.category).join(', ');
          if (blockedCategories) {
            finishReasonMessage += ` Các danh mục bị chặn: ${blockedCategories}.`;
          }
        }
      }
      throw new Error(`Phục chế ảnh thất bại. Model không trả về ảnh.${finishReasonMessage} Phản hồi từ model: "${textResponse || 'Không có phản hồi văn bản'}"`);
    }
    return [candidate.content.parts.find(p => p.inlineData)!.inlineData!.data];
};

/**
 * Processes a video file on the client-side to extract frames and audio.
 * @param videoFile The video file to process.
 * @param onProgress A callback function to report progress.
 * @returns A promise that resolves to an object containing frames and audio data.
 */
export const processVideoFile = async (
    videoFile: File,
    onProgress: (progress: number, message: string) => void
): Promise<{ frames: LocalImageData[]; audio: { base64: string; mimeType: string; } }> => {
    onProgress(0, 'Creating video element...');
    const videoUrl = URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.muted = true;

    await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = (e) => reject(`Error loading video metadata: ${e}`);
        video.src = videoUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const frames: LocalImageData[] = [];
    const frameInterval = 1; // capture a frame every second
    let currentTime = 0;

    onProgress(10, `Extracting frames every ${frameInterval}s...`);

    while (currentTime < video.duration) {
        video.currentTime = currentTime;
        await new Promise<void>(resolve => { video.onseeked = () => resolve(); });
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        frames.push({ base64, mimeType: 'image/jpeg' });

        currentTime += frameInterval;
        const progress = 10 + (currentTime / video.duration) * 60; // 10% to 70% for frame extraction
        onProgress(progress, `Extracted frame at ${currentTime.toFixed(1)}s`);
    }
    
    onProgress(70, 'Extracting audio...');

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    const resampledBuffer = await offlineContext.startRendering();
    
    const pcmData = resampledBuffer.getChannelData(0);
    const pcmInt16 = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
        pcmInt16[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32767));
    }
    
    let binary = '';
    const bytes = new Uint8Array(pcmInt16.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const audioBase64 = window.btoa(binary);

    URL.revokeObjectURL(videoUrl);
    onProgress(100, 'Processing complete.');

    return {
        frames,
        audio: {
            base64: audioBase64,
            mimeType: 'audio/pcm;rate=16000',
        }
    };
};

/**
 * Analyzes video frames and audio using a multimodal AI model.
 * @param apiKey User's API key.
 * @param options The video analysis options containing frames and audio.
 * @returns A promise that resolves to a JSON string with the analysis results.
 */
export const analyzeVideo = async (apiKey: string, options: VideoAnalysisOptions): Promise<string> => {
    const ai = getAiClient(apiKey);
    const { frames, audio } = options;

    const systemPrompt = `
You are a video analysis expert specializing in audio transcription and scene description. Your task is to analyze a sequence of video frames and an audio track to provide a comprehensive analysis in VIETNAMESE, formatted as a specific JSON object.

**PRIMARY TASK: AUDIO TRANSCRIPTION**
1.  Listen to the audio track carefully.
2.  Provide a full, word-for-word transcription in the 'transcription' field.
3.  Format this transcription into an SRT file content for the 'srt_subtitles' field.
4.  **CRITICAL:** If there is any discernible speech, these fields MUST NOT be empty. If there is absolutely no speech (only music or silence), you MUST return the string "[Không có lời thoại]" in both the 'transcription' and 'srt_subtitles' fields. Do not return an empty string.

**SECONDARY TASKS:**
- 'summary' (tóm tắt): A concise, one-paragraph summary of the entire video's content and context.
- 'storyboard' (kịch bản phân cảnh): Describe keyframes in detail.
- 'scene_transitions' (chuyển cảnh): Describe scenes occurring between specific times.

Analyze the provided frames and audio. The first frame is at 0 seconds. Assume each subsequent frame is 1 second after the previous one. The entire JSON response and all its string values must be in VIETNAMESE.
`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            summary: {
                type: Type.STRING,
                description: "Tóm tắt ngắn gọn trong một đoạn văn về nội dung và bối cảnh của toàn bộ video."
            },
            storyboard: {
                type: Type.ARRAY,
                description: "Danh sách các khung hình chính kèm mô tả.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        timestamp_seconds: {
                            type: Type.NUMBER,
                            description: "Dấu thời gian của khung hình chính tính bằng giây."
                        },
                        description: {
                            type: Type.STRING,
                            description: "Mô tả chi tiết những gì đang xảy ra trong khung hình chính này."
                        },
                        keyframe_index: {
                            type: Type.INTEGER,
                            description: "Chỉ mục của khung hình chính trong mảng khung hình được cung cấp."
                        }
                    },
                    required: ["timestamp_seconds", "description", "keyframe_index"]
                }
            },
            scene_transitions: {
                 type: Type.ARRAY,
                description: "Danh sách các cảnh với thời gian bắt đầu, kết thúc và mô tả.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        start_time_seconds: {
                            type: Type.NUMBER,
                            description: "Dấu thời gian bắt đầu của cảnh tính bằng giây."
                        },
                        end_time_seconds: {
                            type: Type.NUMBER,
                            description: "Dấu thời gian kết thúc của cảnh tính bằng giây."
                        },
                        description: {
                            type: Type.STRING,
                            description: "Mô tả chi tiết những gì đang xảy ra trong cảnh này."
                        }
                    },
                    required: ["start_time_seconds", "end_time_seconds", "description"]
                }
            },
            transcription: {
                type: Type.STRING,
                description: "Bản ghi đầy đủ các từ được nói từ bản âm thanh. Nếu không có lời nói, đây phải là một chuỗi rỗng."
            },
            srt_subtitles: {
                type: Type.STRING,
                description: "Bản ghi được định dạng dưới dạng tệp SRT (SubRip Text), bao gồm dấu thời gian và số thứ tự. Nếu không có lời nói, đây phải là một chuỗi rỗng."
            }
        },
        required: ["summary", "storyboard", "scene_transitions", "transcription", "srt_subtitles"]
    };
    
    const parts: any[] = [
        { text: systemPrompt },
        { inlineData: { data: audio.base64, mimeType: audio.mimeType } }
    ];
    frames.forEach(frame => {
        parts.push(imageToPart(frame));
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        },
    });

    return response.text;
};