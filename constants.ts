
import React from 'react';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { CreateVideoIcon } from './components/icons/CreateVideoIcon';
import { ZoomIcon } from './components/icons/ZoomIcon';
import type { AppMode, AspectRatio, MagicAction, OutputQuality } from './types';
import { GenerateFromImageIcon } from './components/icons/GenerateFromImageIcon';
import { EditIcon } from './components/icons/EditIcon';
import { SwapIcon } from './components/icons/SwapIcon';
import { MagicWandIcon } from './components/icons/MagicWandIcon';

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
  { id: 'image-generate', name: 'Tạo từ ảnh', icon: GenerateFromImageIcon },
  { id: 'edit', name: 'Biến hoá', icon: EditIcon },
  { id: 'magic', name: 'Magic Edit', icon: MagicWandIcon },
  { id: 'analyze', name: 'Phân tích', icon: ZoomIcon },
  { id: 'video', name: 'Tạo video', icon: CreateVideoIcon },
  { id: 'video-analysis', name: 'Nhận diện Video', icon: VideoAnalysisIcon },
];

export const CONCEPTS: {id: string, name: string, thumbnail: string, prompt: string}[] = [
    {
        id: 'vietnam_tet',
        name: 'Tết Việt Nam',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_tet.jpeg',
        prompt: 'A beautiful young Vietnamese woman in a traditional red Ao Dai, smiling happily during Tet holiday. The background is a vibrant street scene in Hanoi\'s Old Quarter, adorned with festive red lanterns and peach blossoms. Cinematic photography, golden hour lighting.'
    },
    {
        id: 'mid_autumn',
        name: 'Tết Trung Thu',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_mid_autumn.jpeg',
        prompt: 'A graceful Vietnamese woman in a lovely dress, holding a star-shaped lantern during the Mid-Autumn Festival. She is standing on a street decorated with colorful lanterns at night, with a joyful and magical atmosphere. A full moon is visible in the sky. Photorealistic, bokeh.'
    },
    {
        id: 'garden_muse',
        name: 'Nàng thơ & Vườn hoa',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_garden_muse.jpeg',
        prompt: 'A dreamy Vietnamese muse in a flowing white dress, standing in the middle of a beautiful, blooming flower garden. The scene is bathed in soft, diffused morning sunlight, creating a gentle and romantic mood. Ethereal, soft focus, pastel colors.'
    },
    {
        id: 'coffee_muse',
        name: 'Nàng thơ Cà phê',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_coffee_muse.jpeg',
        prompt: 'A chic, modern Vietnamese woman sitting at a stylish coffee shop in Saigon. She is looking thoughtfully out the window, with a cup of coffee on the table. The lighting is warm and inviting, with soft shadows. Urban lifestyle photography, shallow depth of field.'
    },
    {
        id: 'dalat_muse',
        name: 'Nàng thơ Đà Lạt',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_dalat_muse.jpeg',
        prompt: 'A young woman with a vintage, romantic style, wearing a woolen sweater and a beret in a dreamy Da Lat pine forest. The air is slightly misty, and the late afternoon sun filters through the trees, creating a nostalgic and peaceful mood. Film photography look, warm tones.'
    },
    {
        id: 'hoian_muse',
        name: 'Nàng thơ Hội An',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_hoian_muse.jpeg',
        prompt: 'An elegant woman wearing a traditional Ao Dai, posing gracefully in a narrow alley of Hoi An\'s ancient town. The background features iconic yellow walls and colorful silk lanterns. The lighting is from the golden hour, casting a warm, magical glow. Cinematic, travel photography.'
    },
    {
        id: 'graduation_day',
        name: 'Lễ Tốt nghiệp',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_graduation.jpeg',
        prompt: 'A proud and happy Vietnamese graduate woman in a university graduation gown and cap, holding a diploma. She is standing in a beautiful university campus with friends celebrating in the background. Bright, sunny day lighting, celebratory mood.'
    },
    {
        id: 'office_chic',
        name: 'Công sở Thanh lịch',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_office.jpeg',
        prompt: 'A professional and confident businesswoman in a stylish, modern office outfit (blazer and trousers). She is standing in a sleek, contemporary office interior with large windows and a city view. Clean, professional lighting, corporate headshot style.'
    },
    {
        id: 'beach_vacation',
        name: 'Kỳ nghỉ Biển',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_beach.jpeg',
        prompt: 'A relaxed and happy woman in a beautiful summer maxi dress and a wide-brimmed hat, walking on a pristine tropical beach in Phu Quoc. The background shows turquoise water and white sand. The lighting is the beautiful golden hour just before sunset.'
    },
    {
        id: 'christmas',
        name: 'Giáng Sinh',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_christmas.jpeg',
        prompt: 'A joyful woman wearing a cozy christmas sweater and a santa hat, sitting next to a beautifully decorated christmas tree with warm lights, smiling.'
    },
    {
        id: 'ancient_library',
        name: 'Thư viện Cổ',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_library.jpeg',
        prompt: 'An intellectual young woman sitting at a large wooden table in a grand, ancient library, surrounded by towering bookshelves. She is deeply focused on reading a classic book. The lighting is dramatic, with shafts of light coming from high windows, creating a quiet and studious atmosphere. Dark academia aesthetic.'
    },
    {
        id: 'natural',
        name: 'Tự nhiên',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_natural.jpeg',
        prompt: 'A female model in her 20s, wearing a linen pastel dress, in a park with many trees and trails. The scene is illuminated by window light penetrating through the foliage, creating a golden leaves bokeh effect. She is walking lightly with a natural, candid smile. The mood is fresh and candid with earth tones. A full-body shot using the rule of thirds with shallow depth of field, fine film grain, realistic skin, and cinematic color balance.'
    },
    {
        id: 'picnic',
        name: 'Picnic Lifestyle',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_picnic.jpeg',
        prompt: 'A female model in a picnic setup on the grass: a bright gingham blanket, wicker basket, grapes, apples, and a glass cup. She is sitting sideways, reading a book under high-key natural light. The background features a blurred hill and lake. A wide environmental composition with warm whites, pastel accents, realistic textiles, and a gentle breeze in her hair. The aesthetic is that of a lifestyle magazine.'
    },
    {
        id: 'romantic_pastel',
        name: 'Lãng mạn Pastel',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_romantic.jpeg',
        prompt: 'A romantic pastel portrait of a female model in a flowing chiffon dress, holding a bouquet of baby\'s breath. The scene is backlit by the golden hour, creating a soft rim light on her hair. An airy voile scarf is in motion. The mood is dreamy with a soft glow, slight haze, and creamy highlights. A centered composition with negative space.'
    },
    {
        id: 'street_style',
        name: 'Street Style',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_street.jpeg',
        prompt: 'An editorial street style photo of a woman in a crop top and denim, captured mid-walk across a crosswalk on a city street. The lighting is hard-edged from the late afternoon sun, creating urban textures on the concrete. She has a confident attitude. The image has a teal and orange cinematic grade, with a shallow depth of field, leading lines, and reflections on her sunglasses.'
    },
    {
        id: 'vintage',
        name: 'Vintage Hoàng hôn',
        thumbnail: 'https://storage.googleapis.com/gemini-ui-params/images/concept_vintage_2.jpeg',
        prompt: 'A vintage sunset portrait of a woman in a collared midi dress on an old balcony with ironwork. The lighting is golden hour, with a subtle mix of tungsten light. The image has a Kodak Portra-like film look with soft contrast and warm shadows. She is looking through a window, creating a reflection. The image features fine grain and gentle halation. Props include a vintage film camera.'
    }
];


export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];

export const MAGIC_ACTIONS: {id: MagicAction, name: string}[] = [
    { id: 'upscale', name: 'Nâng cấp x2' },
    { id: 'remove-bg', name: 'Xóa nền' },
    { id: 'remove-object', name: 'Xóa vật thể' },
    { id: 'change-background', name: 'Đổi nền' },
    { id: 'fix-colors', name: 'Sửa màu tự động' },
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