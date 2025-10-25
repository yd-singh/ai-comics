import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TOTAL_PANELS } from '../constants';
import type { PanelScript, Character } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function enrichStory(storyIdea: string, characters: Character[]): Promise<string> {
    try {
        const characterDescriptions = characters.map(c => `${c.name}: ${c.appearance}. Personality: ${c.personality}. Backstory: ${c.backstory}`).join('\n');
        const prompt = `You are a master storyteller. A user has provided a story idea and a cast of characters. Expand this idea into a richer, more detailed narrative suitable for a 5-page, 20-panel comic book. The story should have a clear beginning, middle, and end, and should centrally feature the provided characters.

Characters:
---
${characterDescriptions}
---

User's Story Idea: "${storyIdea}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error enriching story:", error);
        throw new Error("Failed to enrich the story. Please try again.");
    }
}

export async function reviseStory(currentStory: string, feedback: string): Promise<string> {
    try {
        const prompt = `You are a master storyteller and editor. A user has provided feedback on a story you generated. Your task is to revise the story to incorporate the user's feedback while maintaining the core narrative, characters, and tone. Do not rewrite the story from scratch.

Here is the current story:
---
${currentStory}
---

Here is the user's feedback:
---
${feedback}
---

Please provide the revised story that incorporates this feedback.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error revising story:", error);
        throw new Error("Failed to revise the story. Please try again.");
    }
}

export async function suggestCharacters(storyIdea: string): Promise<Omit<Character, 'id'>[]> {
    try {
        const prompt = `You are a creative character designer for comic books. Based on the following story idea, suggest 3 to 4 distinct and interesting main characters. For each character, provide a name, a visual appearance description, key personality traits, and a brief backstory.

Story Idea: "${storyIdea}"

Provide the output as a JSON array of objects.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            appearance: { type: Type.STRING },
                            personality: { type: Type.STRING },
                            backstory: { type: Type.STRING },
                        },
                        required: ['name', 'appearance', 'personality', 'backstory'],
                    },
                },
            },
        });
        
        const suggested = JSON.parse(response.text);
        if (!Array.isArray(suggested)) {
             throw new Error("AI did not return a valid list of characters.");
        }
        return suggested;
    } catch (error) {
        console.error("Error suggesting characters:", error);
        throw new Error("Failed to suggest characters. Please try again or create them manually.");
    }
}

export async function generateCoverPage(
    storyIdea: string,
    characters: Character[],
    stylePrompt: string
): Promise<{ title: string; image: string }> {
    try {
        const characterDescriptions = characters.map(c => `${c.name} (${c.appearance})`).join(', ');

        const titlePrompt = `You are a comic book editor. Based on the following story idea, create a short, catchy, and dramatic title for the comic book. The title should be no more than 5 words.

Story Idea: "${storyIdea}"

Title:`;
        const titleResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: titlePrompt,
        });
        const title = titleResponse.text.trim().replace(/"/g, '');

        const imagePrompt = `${stylePrompt}. A dramatic and eye-catching comic book cover. The scene should feature the main characters: ${characterDescriptions}. The image must summarize the core theme of the story: "${storyIdea}". Leave some negative space at the top for the title to be placed.`;
        
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: imagePrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
                return { title, image: part.inlineData.data };
            }
        }
        throw new Error("No image data found for the cover.");

    } catch (error) {
        console.error("Error generating cover page:", error);
        throw new Error("Failed to generate the comic book cover. Please try again.");
    }
}


export async function createComicScript(story: string, characters: Character[]): Promise<PanelScript[]> {
    try {
        const characterDescriptions = characters.map(c => `${c.name}: ${c.appearance}. Personality: ${c.personality}.`).join('\n');
        const prompt = `You are a comic book scriptwriter. Based on the following story and character descriptions, break it down into a script for a comic book. The comic book has exactly ${TOTAL_PANELS} panels in total. 
For each panel, provide:
1.  'description': A concise but vivid visual description of the scene, action, and characters. **Crucially, for any character in the scene, reiterate their key visual features from the character descriptions to ensure visual consistency.**
2.  'narration': A string for the narrator's text box. If no narration, provide an empty string.
3.  'dialogue': An array of objects, where each object has 'character' (the character's name) and 'speech' (what they say). If no dialogue, provide an empty array.

The output must be a JSON array of ${TOTAL_PANELS} objects.

Characters:
---
${characterDescriptions}
---

Story: "${story}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: {
                                type: Type.STRING,
                                description: 'The visual description of the comic panel, including consistent character appearances.',
                            },
                            narration: {
                                type: Type.STRING,
                                description: 'The narrator\'s text for the panel.',
                            },
                            dialogue: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        character: { type: Type.STRING },
                                        speech: { type: Type.STRING },
                                    },
                                    required: ['character', 'speech'],
                                },
                                description: 'Dialogue spoken by characters in the panel.',
                            },
                        },
                        required: ['description', 'narration', 'dialogue'],
                    },
                },
            },
        });
        
        const script = JSON.parse(response.text);

        if (!Array.isArray(script) || script.length === 0) {
            throw new Error("Generated script is not a valid array.");
        }
        
        return script.slice(0, TOTAL_PANELS);

    } catch (error)
        {
        console.error("Error creating comic script:", error);
        throw new Error("Failed to create the comic script. The story might be too complex or the format is incorrect.");
    }
}

export async function generatePanelImage(panelDescription: string, stylePrompt: string): Promise<string> {
    try {
        const fullPrompt = `${stylePrompt}. The scene is: ${panelDescription}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: fullPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image data found in response.");

    } catch (error) {
        console.error("Error generating panel image:", error);
        throw new Error("Failed to generate an image for a panel.");
    }
}

export async function editPanelImage(base64ImageData: string, prompt: string): Promise<string> {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: 'image/png',
            },
        };
        const textPart = {
            text: prompt,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No edited image data found in response.");
    } catch (error) {
        console.error("Error editing panel image:", error);
        throw new Error("Failed to edit the image for the panel.");
    }
}
