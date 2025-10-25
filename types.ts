export enum AppStep {
  WELCOME,
  STORY_INPUT,
  CHARACTER_CREATION,
  STORY_ENRICHING,
  STORY_APPROVAL,
  STYLE_SELECTION,
  GENERATING_SCRIPT,
  GENERATING_COVER,
  DISPLAY,
}

export enum ComicStyle {
  INDIAN_NOIR = 'Indian Noir',
  ANIME_REALISM = 'Anime Realism Aesthetic',
  WESTERN_COMIC = 'Western Comic Book',
  EUROPEAN_COMIC = 'European Comic Art',
  FANTASY_ILLUSTRATION = 'Fantasy Illustration',
  NINETIES_INDIAN_COMIC = '90s Indian Comics',
}

export interface Character {
  id: string;
  name: string;
  appearance: string;
  personality: string;
  backstory: string;
}

export interface PanelScript {
  description: string;
  narration: string;
  dialogue: {
    character: string;
    speech: string;
  }[];
}

export interface StyleOption {
  name: ComicStyle;
  image: string;
  prompt: string;
}

export interface ComicProject {
  version: number;
  storyIdea: string;
  characters: Character[];
  enrichedStory: string;
  comicScript: PanelScript[];
  selectedStyleName: ComicStyle;
  generatedPanels: (string | null)[];
  comicTitle: string;
  coverImage: string | null;
}