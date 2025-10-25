import type { StyleOption } from './types';
import { ComicStyle } from './types';

export const STYLES: StyleOption[] = [
  {
    name: ComicStyle.INDIAN_NOIR,
    image: 'https://raw.githubusercontent.com/yd-singh/public-assets/main/indian-noir.png',
    prompt: 'A dark, gritty, high-contrast comic book panel in an Indian Noir style, reminiscent of classic detective films but with a South Asian setting. Heavy shadows, dramatic lighting, and a sense of mystery.',
  },
  {
    name: ComicStyle.ANIME_REALISM,
    image: 'https://raw.githubusercontent.com/yd-singh/public-assets/main/anime-realism.png',
    prompt: 'A comic book panel in a hyper-realistic anime aesthetic. Detailed characters with expressive eyes, cinematic lighting, and a beautifully rendered background. Clean lines with a touch of painterly texture.',
  },
  {
    name: ComicStyle.WESTERN_COMIC,
    image: 'https://raw.githubusercontent.com/yd-singh/public-assets/main/western-comic.png',
    prompt: 'A classic Western comic book style panel. Bold lines, dynamic action poses, and a color palette with strong primary colors and Ben-Day dots effect. Think Silver Age comics.',
  },
  {
    name: ComicStyle.EUROPEAN_COMIC,
    image: 'https://raw.githubusercontent.com/yd-singh/public-assets/main/european-comic.png',
    prompt: 'A sophisticated European comic art style (Bande Dessinée). Clean, precise lines (ligne claire), realistic environments, and a mature, cinematic color palette. The art is elegant and detailed.',
  },
  {
    name: ComicStyle.FANTASY_ILLUSTRATION,
    image: 'https://raw.githubusercontent.com/yd-singh/public-assets/main/fantasy-illustration.png',
    prompt: 'A lush fantasy illustration style. Painterly rendering, vibrant colors, and intricate details in costumes and environments. Magical elements, glowing effects, and a sense of epic scale.',
  },
  {
    name: ComicStyle.NINETIES_INDIAN_COMIC,
    image: 'https://raw.githubusercontent.com/yd-singh/public-assets/main/90s-indian-comic.png',
    prompt: '90s Indian comic book art style — vibrant flat colors, exaggerated action poses, bold outlines, slightly grainy print texture, dynamic Hindi onomatopoeia, inspired by Raj Comics heroes like Super Commando Dhruv and Nagraj.',
  }
];

export const TOTAL_PAGES = 7; // 1 cover, 5 story pages, 1 credits page
export const PANELS_PER_PAGE = 4;
export const TOTAL_STORY_PAGES = 5;
export const TOTAL_PANELS = TOTAL_STORY_PAGES * PANELS_PER_PAGE;

export const GENERATION_MESSAGES = [
    "Sketching characters...",
    "Inking the lines...",
    "Coloring the world...",
    "Adding dialogue bubbles...",
    "Shading the scenes...",
    "Finalizing the cover art...",
    "Binding the pages...",
    "Almost there..."
];