
// Note for the user: To use this service, you must configure an "unsigned" upload preset in your Cloudinary account.
// 1. Log in to your Cloudinary account (cloud name: dppkpulgn).
// 2. Go to Settings (cog icon) -> Upload.
// 3. Scroll down to "Upload presets", click "Add upload preset".
// 4. Set the "Signing Mode" to "Unsigned".
// 5. Note the "Upload preset name" and ensure it matches the one used below ('ai_character_studio').

const CLOUDINARY_CLOUD_NAME = 'djsbie5y1';
const CLOUDINARY_UPLOAD_PRESET = 'ai_character_studio';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Uploads a base64 encoded image to Cloudinary.
 * @param base64Data The base64 string of the image (without the data URI prefix).
 * @returns The secure URL of the uploaded image.
 */
export const uploadImage = async (base64Data: string): Promise<string> => {
    const formData = new FormData();
    // Cloudinary expects the file data to be a data URI.
    formData.append('file', `data:image/jpeg;base64,${base64Data}`);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Cloudinary upload error:', errorData);
            throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary. Check your cloud name and upload preset.');
        }

        const data = await response.json();
        return data.secure_url;

    } catch (error) {
        console.error('Network error during Cloudinary upload:', error);
        if (error instanceof Error) {
            throw new Error(`[Cloudinary Upload] ${error.message}`);
        }
        throw new Error('An unknown error occurred while uploading the image.');
    }
};
