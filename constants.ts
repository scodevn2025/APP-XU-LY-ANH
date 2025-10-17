

import React from 'react';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { CreateVideoIcon } from './components/icons/CreateVideoIcon';
import { ZoomIcon } from './components/icons/ZoomIcon';
import type { AppMode, AspectRatio, MagicAction, OutputQuality, AutoFilterStyle } from './types';
import { GenerateFromImageIcon } from './components/icons/GenerateFromImageIcon';
import { EditIcon } from './components/icons/EditIcon';
import { SwapIcon } from './components/icons/SwapIcon';
import { MagicWandIcon } from './components/icons/MagicWandIcon';
import { PhotoRestoreIcon } from './components/icons/PhotoRestoreIcon';
import { ProductIcon } from './components/icons/ProductIcon';
import { TravelIcon } from './components/icons/TravelIcon';

// FIX: Rewrote component using React.createElement to avoid JSX syntax in a .ts file.
const VideoAnalysisIcon = () => (
    React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        className: "h-6 w-6",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 1.5
    },
        React.createElement('path', {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.357-.466.557-.327l5.603 3.112zM15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        })
    )
);


export const MODES: { id: AppMode; name: string; icon: React.FC, formComponent?: React.FC<any> }[] = [
  { id: 'generate', name: 'Tạo ảnh', icon: SparklesIcon },
  { id: 'image-generate', name: 'Thay trang phục', icon: GenerateFromImageIcon },
  { id: 'ai-travel', name: 'Du lịch AI', icon: TravelIcon },
  { id: 'product-shot', name: 'Chụp ảnh sản phẩm', icon: ProductIcon },
  { id: 'edit', name: 'Ghép sản phẩm', icon: EditIcon },
  { id: 'magic', name: 'Magic Edit', icon: MagicWandIcon },
  { id: 'photo-restore', name: 'Phục chế ảnh', icon: PhotoRestoreIcon },
  { id: 'analyze', name: 'Phân tích', icon: ZoomIcon },
  { id: 'video', name: 'Tạo video', icon: CreateVideoIcon },
  { id: 'video-analysis', name: 'Nhận diện Video', icon: VideoAnalysisIcon },
];

export const AI_TRAVEL_CONCEPTS: {id: string, name: string, prompt: string}[] = [
    {
        id: 'natural_light_window',
        name: 'Cửa sổ + rèm mỏng',
        prompt: 'Ultra-realistic portrait by a window with sheer curtains, soft backlight glow, linen camisole, gentle smile, mid-shot to close-up, natural skin texture, 50mm f/2.2 bokeh, no text, no watermark.'
    },
    {
        id: 'minimal_bed_corner',
        name: 'Góc giường tối giản',
        prompt: 'Minimal cozy bed corner, white tones, lazy morning vibe, side window light, natural expression, 35mm f/2.8, high-key softness, no text.'
    },
    {
        id: 'wood_table_tea',
        name: 'Bàn gỗ + cốc trà',
        prompt: 'Wood table, ceramic mug steam, soft daylight 45°, calm half-smile, intimate mid-shot with hand details, 50mm f/2, warm neutral palette, no text.'
    },
    {
        id: 'full_length_mirror',
        name: 'Gương toàn thân',
        prompt: 'Full-length mirror portrait, clean room, diffused daylight, playful half-covered face, 35mm vertical, natural grain, no text.'
    },
    {
        id: 'cafe_corridor',
        name: 'Hành lang cafe nâu',
        prompt: 'Cafe corridor, warm brown palette, bokeh string lights, soft smile, 50mm f/1.8 creamy background, lifestyle portrait, no text.'
    },
    {
        id: 'rooftop_golden_hour',
        name: 'Rooftop giờ vàng',
        prompt: 'Rooftop at golden hour, wind in white shirt, cinematic backlight rim, 35mm wide mid-shot, warm glow, no text.'
    },
    {
        id: 'street_motion',
        name: 'Đường phố chuyển động',
        prompt: 'Street style motion, panning shot, subtle motion blur, 85mm telephoto compression, confident stride, natural city background, no text.'
    },
    {
        id: 'studio_profile',
        name: 'Studio tường trơn',
        prompt: 'Clean studio headshot, blazer, neutral gray seamless, soft two-point lighting with hair light, 85mm f/4, confident calm expression, no text.'
    },
    {
        id: 'high_key_beauty',
        name: 'High-key beauty close-up',
        prompt: 'High-key beauty close-up, luminous skin, soft reflector fill, 100mm macro portrait, delicate collarbone touch, no text.'
    },
    {
        id: 'low_key_shadow',
        name: 'Low-key shadow',
        prompt: 'Low-key portrait, single hard side light, dramatic chiaroscuro, 50mm, deep shadows, sculpted cheekbones, no text.'
    },
    {
        id: 'soft_romantic_muse',
        name: 'Nàng thơ (soft romantic)',
        prompt: 'Romantic soft portrait, chiffon dress, pastel bouquet, gentle backlight with slight haze, dreamy bloom lens effect, 50mm, no text.'
    },
    {
        id: 'vintage_film',
        name: 'Vintage film',
        prompt: 'Vintage-inspired portrait, mid-century vibe, 35mm, subtle film grain and muted tones, candid look over shoulder, no text.'
    },
    {
        id: 'hanfu_style',
        name: 'Cổ trang/hanfu',
        prompt: 'Traditional hanfu style portrait in garden, delicate hand gesture, serene gaze, soft daylight, 85mm shallow depth, no text.'
    },
    {
        id: 'beach_and_wind',
        name: 'Biển & gió',
        prompt: 'Beach portrait at sunset, white slip dress, wind-swept, clean horizon, 35mm wide, gentle smile over shoulder, no text.'
    },
    {
        id: 'meadow_park',
        name: 'Đồng cỏ/công viên',
        prompt: 'Meadow portrait, floral dress, golden hour, 85mm tele compression, twirl motion, serene greenery bokeh, no text.'
    },
    {
        id: 'train_station',
        name: 'Ga tàu/giao thông',
        prompt: 'Transit hub portrait, clean architecture lines, purposeful stride, 35mm, subtle motion, lifestyle travel vibe, no text.'
    },
    {
        id: 'cinematic_selfie',
        name: 'Selfie cinematic',
        prompt: 'Cinematic ‘selfie-angle’ portrait, close crop, slant window light, playful squint, shallow depth, 28–35mm feel, no text.'
    },
    {
        id: 'in_the_kitchen',
        name: 'Trong bếp',
        prompt: 'Home kitchen lifestyle portrait, linen apron, cutting fresh fruit, soft top light with side fill, 50mm, warm homely vibe, no text.'
    },
    {
        id: 'balcony_greenery',
        name: 'Balcony greenery',
        prompt: 'Balcony morning portrait, lush plants, coffee cup, fresh soft daylight, 50mm with foreground leaves bokeh, no text.'
    },
    {
        id: 'ao_dai_non_la',
        name: 'Áo dài + nón lá',
        prompt: 'Ao dai traditional portrait with conical hat, Vietnamese heritage backdrop, soft daylight, 85mm elegance, timeless, no text.'
    },
    {
        id: 'minimal_birthday',
        name: 'Sinh nhật tối giản',
        prompt: 'Minimal birthday portrait, single cake with candles, warm candlelit glow, 50mm, intimate moment eyes closed, no text.'
    },
    {
        id: 'mini_lookbook',
        name: 'Lookbook mini',
        prompt: 'Mini lookbook sequence: three outfits, same background, step–stop–twirl, consistent daylight, 35–50mm clean fashion framing, no text.'
    },
    {
        id: 'warm_family',
        name: 'Gia đình ấm áp (solo)',
        prompt: 'Warm homey solo portrait, framed by family photo in background, natural window light, 35mm, cozy neutral palette, no text.'
    },
    {
        id: 'monochrome_minimal',
        name: 'Monochrome minimal',
        prompt: 'Monochrome minimal portrait (all-black or all-beige), clean seamless backdrop to match, soft top with edge light, 85mm refined stance, no text.'
    }
];

export const TRAVEL_OUTFITS: {id: string, name: string, thumbnail: string, prompt: string}[] = [
    {
        id: 'china_hanfu',
        name: 'Cổ trang Trung Quốc',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_outfit_hanfu.jpeg',
        prompt: 'wearing a beautiful, traditional red and gold Chinese Hanfu with intricate embroidery and long flowing sleeves'
    },
    {
        id: 'korea_hanbok',
        name: 'Hanbok Hàn Quốc',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_outfit_hanbok.jpeg',
        prompt: 'wearing an elegant traditional Korean Hanbok with a pastel-colored, high-waisted chima (skirt) and a jeogori (jacket)'
    },
    {
        id: 'japan_kimono',
        name: 'Kimono Nhật Bản',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_outfit_kimono.jpeg',
        prompt: 'wearing a vibrant, traditional Japanese Kimono with a floral pattern and a wide obi sash'
    },
    {
        id: 'india_sari',
        name: 'Sari Ấn Độ',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_outfit_sari.jpeg',
        prompt: 'wearing a luxurious, colorful Indian Sari made of silk with golden borders, draped gracefully'
    },
    {
        id: 'vietnam_aodai',
        name: 'Áo dài Việt Nam',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_outfit_aodai.jpeg',
        prompt: 'wearing a graceful white Vietnamese Ao Dai, the national dress of Vietnam'
    },
    {
        id: 'bohemian',
        name: 'Bohemian Chic',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_outfit_boho.jpeg',
        prompt: 'wearing a stylish bohemian outfit with a long, flowing maxi skirt, a crochet top, and layered jewelry'
    },
];

export const TRAVEL_LOCATIONS: {id: string, name: string, thumbnail: string, prompt: string}[] = [
    {
        id: 'forbidden_city',
        name: 'Tử Cấm Thành, TQ',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_loc_forbidden_city.jpeg',
        prompt: 'standing in the grand courtyard of the Forbidden City in Beijing, with ancient palaces and red walls in the background'
    },
    {
        id: 'gyeongbokgung',
        name: 'Cung Gyeongbok, HQ',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_loc_gyeongbokgung.jpeg',
        prompt: 'posing in front of the majestic Gyeongbokgung Palace in Seoul, South Korea, with traditional Korean architecture surrounding them'
    },
    {
        id: 'kyoto_street',
        name: 'Phố cổ Kyoto, NB',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_loc_kyoto.jpeg',
        prompt: 'walking through a historic street in Gion, Kyoto, Japan, with traditional wooden machiya houses and cherry blossoms'
    },
    {
        id: 'taj_mahal',
        name: 'Đền Taj Mahal, Ấn Độ',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_loc_taj_mahal.jpeg',
        prompt: 'standing before the iconic Taj Mahal in Agra, India, during sunrise with the marble mausoleum reflected in the pool'
    },
    {
        id: 'santorini',
        name: 'Santorini, Hy Lạp',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_loc_santorini.jpeg',
        prompt: 'looking out over the Aegean Sea from a scenic viewpoint in Oia, Santorini, Greece, with iconic white and blue buildings'
    },
     {
        id: 'paris_eiffel',
        name: 'Tháp Eiffel, Pháp',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/travel_loc_eiffel.jpeg',
        prompt: 'having a picnic on the Champ de Mars in Paris, France, with the Eiffel Tower in the background on a sunny day'
    },
];


export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];

export const MAGIC_ACTIONS: {id: MagicAction, name: string}[] = [
    { id: 'creative', name: 'Chỉnh sửa sáng tạo' },
    { id: 'auto-filter', name: 'Filter màu tự động' },
    { id: 'upscale', name: 'Nâng cấp x2' },
    { id: 'remove-bg', name: 'Xóa nền' },
    { id: 'remove-object', name: 'Xóa vật thể' },
    { id: 'change-background', name: 'Đổi nền' },
    { id: 'fix-colors', name: 'Sửa màu tự động' },
];

export const AUTO_FILTER_STYLES: {id: AutoFilterStyle, name: string}[] = [
    { id: 'cinematic-teal-orange', name: 'Điện ảnh (Teal & Orange)' },
    { id: 'vintage', name: 'Vintage Film' },
    { id: 'dramatic-bw', name: 'Trắng đen kịch tính' },
    { id: 'vibrant-pop', name: 'Rực rỡ (Vibrant Pop)' },
    { id: 'soft-dreamy', name: 'Mơ màng (Soft Dreamy)' },
    { id: 'matte-moody', name: 'Xám Mờ Trầm (Matte)' },
    { id: 'high-contrast-bw', name: 'Đen Trắng Gắt (High Contrast)' },
    { id: 'cyberpunk-neon', name: 'Cyberpunk Neon (Đêm Rực)' },
    { id: 'portra-film', name: 'Giả lập phim Portra (Da đẹp)' },
    { id: 'creamy-skin', name: 'Chân dung - Da mịn (Creamy)' },
    { id: 'golden-hour-pop', name: 'Chân dung - Chiều vàng (Golden)' },
    { id: 'creamy-bw', name: 'Chân dung - Đen trắng mịn' },
    { id: 'punchy-landscape', name: 'Phong cảnh - Rực rỡ (Punchy)' },
    { id: 'cinematic-landscape', name: 'Phong cảnh - Điện ảnh' },
    { id: 'moody-forest', name: 'Phong cảnh - Rừng trầm' },
];

export const OUTPUT_QUALITIES: OutputQuality[] = [
    { id: 'standard', name: 'Tiêu chuẩn' },
    { id: 'hd', name: 'Chất lượng cao (HD)' },
]

export const PROMPT_SUGGESTION_TAGS: Record<string, string[]> = {
    "Phong cách (Style)": ["cinematic", "photorealistic", "anime", "watercolor", "digital art", "line art", "3d render"],
    "Chi tiết (Detail)": ["highly detailed", "4k", "8k", "sharp focus", "intricate details", "masterpiece"],
    "Ánh sáng (Lighting)": ["volumetric lighting", "dramatic lighting", "studio lighting", "golden hour", "neon lighting", "rim light"],
    "Màu sắc (Color)": ["vibrant colors", "monochromatic", "pastel colors", "black and white"],
    "Kiểm soát Camera (Shot Type)": ["wide-angle shot", "macro shot", "low-angle perspective", "dutch angle", "long shot", "medium shot", "close-up shot", "pov", "overhead shot", "bokeh"],
};

export const EDIT_FORM_TAGS = PROMPT_SUGGESTION_TAGS;


export const LOADING_MESSAGES = [
    "Đánh thức AI dậy... nó đang ngủ gật.",
    "Pha cho AI một ly cà phê pixel đậm đặc.",
    "Đang triệu hồi các nàng thơ kỹ thuật số...",
    "AI đang đội mũ beret nghệ sĩ vào...",
    "Lùa các pixel vào đúng vị trí...",
    "Dạy AI vẽ trong khuôn khổ... gần đúng thôi.",
    "Tranh cãi nảy lửa với GPU về màu sắc.",
    "Rung lắc các ống nghiệm sáng tạo.",
    "Đang thêm một chút 'wow' vào tác phẩm.",
    "Đánh bóng từng pixel cho lấp lánh.",
    "Kiểm tra xem có vẽ nhầm sáu ngón tay không.",
    "Sắp xong rồi! Tác phẩm để đời sắp ra lò!",
];