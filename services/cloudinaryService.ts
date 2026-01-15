const CLOUD_NAME = 'djsbie5y1';
const UPLOAD_PRESET = 'ai_character_studio';

/**
 * Uploads a base64 encoded image to Cloudinary.
 * @param base64Data The base64 string of the image (without the data URI prefix).
 * @returns The secure URL of the uploaded image.
 */
export const uploadImage = async (base64Data: string): Promise<string> => {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  
  const formData = new FormData();
  // Cloudinary's upload API expects the file in the data URI format for base64 uploads.
  formData.append('file', `data:image/jpeg;base64,${base64Data}`);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Cloudinary upload error:', errorData);
    // Provide a more specific error message if the preset is not found.
    if (errorData.error && errorData.error.message.includes('not found')) {
        throw new Error('Cloudinary upload preset not found. Please configure it in your Cloudinary settings.');
    }
    throw new Error(errorData.error.message || 'Cloudinary upload failed due to an unknown error.');
  }

  const data = await response.json();
  return data.secure_url;
};
