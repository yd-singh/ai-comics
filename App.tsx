import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStep, ComicStyle } from './types';
import type { PanelScript, StyleOption, Character, ComicProject } from './types';
import { enrichStory, createComicScript, generatePanelImage, reviseStory, suggestCharacters, generateCoverPage } from './services/geminiService';
import { STYLES, TOTAL_PANELS, PANELS_PER_PAGE, TOTAL_PAGES, TOTAL_STORY_PAGES } from './constants';
import LoadingSpinner from './components/LoadingSpinner';
import ImageEditorModal from './components/ImageEditorModal';

type StoryLoadingAction = 'none' | 'revise' | 'regenerate';

const futureIdeas = [
    "Feature: AI-powered sound effects for each panel!",
    "Coming Soon: Export to animated video format!",
    "Next Up: Collaborative comic creation with friends!",
    "In the Works: Custom character model training!",
    "Idea: Interactive, branching comic narratives!",
    "Future Drop: Mint your comic as an NFT!"
];

const FutureIdeasTicker: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % futureIdeas.length);
        }, 5000); // Must match animation duration in CSS
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-6 relative overflow-hidden w-2/3 md:w-1/2" aria-live="polite">
            <p key={currentIndex} className="absolute inset-0 w-full text-right idea-ticker-text pr-2">
                {futureIdeas[currentIndex]}
            </p>
        </div>
    );
};

const AppFooter: React.FC = () => (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-gray-300 p-2 border-t border-gray-700 text-xs sm:text-sm z-10">
        <div className="container mx-auto flex justify-between items-center px-4">
            <p>
                Created by: <a href="https://www.linkedin.com/in/yashdeepsingh/" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 hover:text-blue-300">@Yash</a>
            </p>
            <FutureIdeasTicker />
        </div>
    </footer>
);

const WelcomeScreen: React.FC<{ onStart: () => void; onImport: () => void }> = ({ onStart, onImport }) => (
    <div className="text-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700">
        <h1 className="text-5xl md:text-7xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-600 font-bangers tracking-wider text-shadow">ComicGen AI</h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8 text-shadow-md">Turn your wildest stories into stunning, AI-generated comic books. Just bring your idea, and we'll handle the illustration.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onStart} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 w-full sm:w-auto">
                Create Your Comic
            </button>
            <button onClick={onImport} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 w-full sm:w-auto">
                Import Project
            </button>
        </div>
    </div>
);

const StoryInputScreen: React.FC<{ onSubmit: (story: string) => void }> = ({ onSubmit }) => {
    const [story, setStory] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (story.trim()) {
            onSubmit(story.trim());
        }
    };

    return (
        <div className="w-full max-w-3xl text-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700">
            <h2 className="text-4xl font-bold mb-6 text-shadow">Enter Your Story Idea</h2>
            <p className="text-gray-400 mb-6 text-shadow-md">It can be a simple sentence or a detailed plot. First, we need the core idea.</p>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    className="w-full h-48 p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., A detective in neo-Mumbai discovers a secret that could change the city forever."
                />
                <button type="submit" className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:scale-100" disabled={!story.trim()}>
                    Define Characters
                </button>
            </form>
        </div>
    );
};

const CharacterCreationScreen: React.FC<{ storyIdea: string; onSubmit: (characters: Character[]) => void; onBack: () => void }> = ({ storyIdea, onSubmit, onBack }) => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [currentChar, setCurrentChar] = useState<Omit<Character, 'id'>>({ name: '', appearance: '', personality: '', backstory: '' });
    const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSuggestCharacters = async () => {
        setIsSuggesting(true);
        setError(null);
        try {
            const suggestions = await suggestCharacters(storyIdea);
            const newCharacters = suggestions.map((char, index) => ({ ...char, id: `sugg-${Date.now()}-${index}` }));
            setCharacters(prev => [...prev, ...newCharacters]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSaveCharacter = () => {
        if (!currentChar.name || !currentChar.appearance || !currentChar.personality) return;

        if (editingCharacterId) {
            // Update existing character
            setCharacters(characters.map(c => c.id === editingCharacterId ? { ...currentChar, id: editingCharacterId } : c));
        } else {
            // Add new character
            setCharacters([...characters, { ...currentChar, id: `manual-${Date.now()}` }]);
        }
        // Reset form
        setCurrentChar({ name: '', appearance: '', personality: '', backstory: '' });
        setEditingCharacterId(null);
    };

    const handleEditCharacter = (character: Character) => {
        setEditingCharacterId(character.id);
        setCurrentChar({
            name: character.name,
            appearance: character.appearance,
            personality: character.personality,
            backstory: character.backstory,
        });
    };
    
    const handleCancelEdit = () => {
        setEditingCharacterId(null);
        setCurrentChar({ name: '', appearance: '', personality: '', backstory: '' });
    };

    const handleRemoveCharacter = (id: string) => {
        setCharacters(characters.filter(c => c.id !== id));
        if (id === editingCharacterId) {
            handleCancelEdit();
        }
    };

    const isFormValid = currentChar.name && currentChar.appearance && currentChar.personality;

    return (
        <div className="w-full max-w-5xl bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700">
            <h2 className="text-4xl font-bold mb-6 text-center text-shadow">Create Your Characters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-2xl font-bold mb-4">{editingCharacterId ? 'Edit Character' : 'Add a New Character'}</h3>
                    <div className="space-y-4">
                        <input type="text" placeholder="Name (e.g., Kael)" value={currentChar.name} onChange={e => setCurrentChar({...currentChar, name: e.target.value})} className="w-full p-2 bg-gray-700 rounded-md" />
                        <textarea placeholder="Appearance (e.g., Tall, cybernetic arm, trench coat)" value={currentChar.appearance} onChange={e => setCurrentChar({...currentChar, appearance: e.target.value})} className="w-full h-24 p-2 bg-gray-700 rounded-md" />
                        <textarea placeholder="Personality (e.g., Grumpy but with a heart of gold)" value={currentChar.personality} onChange={e => setCurrentChar({...currentChar, personality: e.target.value})} className="w-full h-20 p-2 bg-gray-700 rounded-md" />
                        <textarea placeholder="Backstory (Optional)" value={currentChar.backstory} onChange={e => setCurrentChar({...currentChar, backstory: e.target.value})} className="w-full h-20 p-2 bg-gray-700 rounded-md" />
                        <div className="flex gap-2">
                             {editingCharacterId && <button onClick={handleCancelEdit} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full">Cancel</button>}
                             <button onClick={handleSaveCharacter} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full disabled:bg-gray-500" disabled={!isFormValid}>
                                {editingCharacterId ? 'Update Character' : 'Add Character'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold">Cast</h3>
                        <button onClick={handleSuggestCharacters} disabled={isSuggesting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full text-sm disabled:bg-gray-500">
                            {isSuggesting ? 'Suggesting...' : '✨ Suggest Characters'}
                        </button>
                     </div>
                     {error && <p className="text-red-400 mb-2 bg-red-900 p-2 rounded-md">{error}</p>}
                     <div className="space-y-3 flex-grow overflow-y-auto max-h-96">
                        {characters.length === 0 && <p className="text-gray-400 text-center mt-4">Add characters manually or use the suggest feature!</p>}
                        {characters.map(c => (
                            <div key={c.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-start gap-2">
                                <div className="flex-grow">
                                    <p className="font-bold text-lg">{c.name}</p>
                                    <p className="text-sm text-gray-300">{c.appearance}</p>
                                </div>
                                <div className="flex-shrink-0 flex gap-2">
                                     <button onClick={() => handleEditCharacter(c)} className="text-blue-300 hover:text-blue-200 font-bold text-sm">EDIT</button>
                                     <button onClick={() => handleRemoveCharacter(c.id)} className="text-red-400 hover:text-red-300 font-bold text-xl leading-none">&times;</button>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
            <div className="flex justify-center items-center gap-4 mt-8">
                 <button onClick={onBack} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full text-lg">
                    Back
                 </button>
                 <button onClick={() => onSubmit(characters)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500" disabled={characters.length === 0}>
                    Enrich Story with Characters
                </button>
            </div>
        </div>
    );
};

const StoryApprovalScreen: React.FC<{ story: string; onApprove: () => void; onRegenerate: () => void; onRevise: (feedback: string) => void; loadingAction: StoryLoadingAction }> = ({ story, onApprove, onRegenerate, onRevise, loadingAction }) => {
    const [feedback, setFeedback] = useState('');
    const isLoading = loadingAction !== 'none';

    return (
        <div className="w-full max-w-4xl bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700">
            <h2 className="text-4xl font-bold mb-6 text-center text-shadow">Review Your Story</h2>
            <div className="bg-gray-800 p-6 rounded-lg text-left max-h-80 overflow-y-auto border border-gray-700 mb-6">
                <p className="whitespace-pre-wrap text-gray-300">{story}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-2xl font-bold mb-4 text-center">Does the story need changes?</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex flex-col">
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full flex-grow p-3 bg-gray-700 rounded-md border-gray-600"
                            placeholder="e.g., Make the ending more dramatic."
                            rows={3}
                            disabled={isLoading}
                        />
                        <button onClick={() => onRevise(feedback)} disabled={isLoading || !feedback.trim()} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full disabled:bg-gray-500">
                            {loadingAction === 'revise' ? 'Revising...' : 'Revise Story'}
                        </button>
                    </div>
                    <div className="flex items-center text-center">
                        <span className="text-gray-400 mx-4">OR</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-2">
                        <button onClick={onRegenerate} disabled={isLoading} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full disabled:bg-gray-500">
                             {loadingAction === 'regenerate' ? 'Regenerating...' : 'Regenerate From Scratch'}
                        </button>
                         <button onClick={onApprove} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105" disabled={isLoading}>
                            Approve & Choose Style
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StyleSelectionScreen: React.FC<{ onSelect: (style: StyleOption) => void }> = ({ onSelect }) => (
    <div className="w-full max-w-5xl text-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700">
        <h2 className="text-4xl font-bold mb-8 text-shadow">Choose Your Art Style</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STYLES.map((style) => (
                <div key={style.name} onClick={() => onSelect(style)} className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer border-2 border-gray-700 hover:border-blue-500 hover:scale-105 transition-all duration-300 group">
                    <img src={style.image} alt={style.name} className="w-full h-48 object-cover" />
                    <div className="p-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{style.name}</h3>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ComicBookViewer: React.FC<{
    script: PanelScript[],
    panels: (string | null)[],
    onReset: () => void,
    onEditPanel: (index: number) => void,
    onSaveProject: () => void,
    comicTitle: string,
    coverImage: string | null
}> = ({ script, panels, onReset, onEditPanel, onSaveProject, comicTitle, coverImage }) => {
    const [currentPage, setCurrentPage] = useState(0);

    const handleDownloadPdf = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Your Comic Book</title>');
        printWindow.document.write('<link rel="stylesheet" href="https://cdn.tailwindcss.com"></link>');
        printWindow.document.write(`<style>
            @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Lato:wght@400;700&display=swap');
            body { background-color: #111827; font-family: 'Lato', sans-serif; }
            .page { width: 8.5in; height: 11in; margin: 0 auto; background-color: #1f2937; color: white; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }
            .story-page-content { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 1rem; padding: 1rem; flex-grow: 1;}
            .cover-page { padding: 0; position: relative; }
            .cover-image { width: 100%; height: 100%; object-fit: cover; }
            .cover-title { position: absolute; bottom: 5%; left: 0; right: 0; text-align: center; font-family: 'Bangers', cursive; font-size: 5rem; color: white; text-shadow: 4px 4px 8px rgba(0,0,0,0.8); }
            .credits-page { align-items: center; justify-content: center; text-align: center; }
            .panel-container { display: flex; flex-direction: column; background-color: #111827; border: 2px solid white; }
            .panel-image { width: 100%; height: auto; object-fit: cover; flex-shrink: 0; aspect-ratio: 4/3; }
            .panel-text { padding: 8px; background-color: #fde047; color: black; font-family: 'Bangers', cursive; border-top: 2px solid white; flex-grow: 1; }
            .panel-text-narration { font-style: italic; font-size: 14px; margin-bottom: 4px; }
            .panel-text-dialogue { font-size: 16px; }
        </style>`);
        printWindow.document.write('</head><body class="bg-gray-900">');

        // Page 0: Cover
        printWindow.document.write('<div class="page cover-page">');
        if (coverImage) {
            printWindow.document.write(`<img class="cover-image" src="data:image/png;base64,${coverImage}" />`);
            printWindow.document.write(`<h1 class="cover-title">${comicTitle}</h1>`);
        }
        printWindow.document.write('</div>');

        // Pages 1-5: Story
        for (let i = 0; i < TOTAL_STORY_PAGES; i++) {
            printWindow.document.write(`<div class="page"><div class="story-page-content">`);
            const pagePanels = script.slice(i * PANELS_PER_PAGE, (i + 1) * PANELS_PER_PAGE);
            const pageImages = panels.slice(i * PANELS_PER_PAGE, (i + 1) * PANELS_PER_PAGE);

            pagePanels.forEach((panelScript, idx) => {
                const panelImage = pageImages[idx];
                printWindow.document.write(`<div class="panel-container">`);
                if(panelImage) {
                    printWindow.document.write(`<img class="panel-image" src="data:image/png;base64,${panelImage}" />`);
                }
                if (panelScript.narration || panelScript.dialogue.length > 0) {
                     printWindow.document.write(`<div class="panel-text">`);
                     if (panelScript.narration) {
                        printWindow.document.write(`<p class="panel-text-narration">${panelScript.narration}</p>`);
                     }
                     panelScript.dialogue.forEach((dialog) => {
                         printWindow.document.write(`<p class="panel-text-dialogue"><b>${dialog.character}:</b> ${dialog.speech}</p>`);
                     });
                     printWindow.document.write(`</div>`);
                }
                printWindow.document.write(`</div>`);
            });
            printWindow.document.write(`</div></div>`);
        }

        // Page 6: Credits
        printWindow.document.write('<div class="page credits-page">');
        printWindow.document.write('<div><h2 style="font-size: 3rem; font-weight: bold;">Created by Yash</h2><p style="font-size: 1.5rem; color: #9ca3af; margin-top: 0.5rem;">Use Responsibly.</p></div>');
        printWindow.document.write('</div>');

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };
    
    const isGenerating = panels.length < TOTAL_PANELS || panels.some(p => p === null) || !coverImage;

    const renderPageContent = () => {
        if (currentPage === 0) {
            return (
                <div className="w-full max-w-4xl p-4 bg-gray-800 rounded-lg border-2 border-gray-700 aspect-[8.5/11] flex flex-col items-center justify-center">
                    {coverImage ? (
                        <div className="relative w-full h-full bg-black rounded-md overflow-hidden">
                            <img src={`data:image/png;base64,${coverImage}`} alt="Comic book cover" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-8">
                                <h1 className="text-5xl md:text-7xl font-bangers text-white text-shadow tracking-wider text-center">{comicTitle}</h1>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="ml-4 text-xl">Generating Cover...</p>
                        </div>
                    )}
                </div>
            );
        }
        
        if (currentPage === TOTAL_PAGES - 1) {
            return (
                 <div className="w-full max-w-4xl p-4 bg-gray-800 rounded-lg border-2 border-gray-700 aspect-[8.5/11] flex flex-col items-center justify-center">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-gray-300">Created by Yash</p>
                        <p className="text-xl text-gray-400 mt-2">Use Responsibly.</p>
                    </div>
                 </div>
            );
        }

        const storyPageIdx = currentPage - 1;
        return (
             <div className="w-full max-w-4xl p-4 bg-gray-800 rounded-lg border-2 border-gray-700">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {script.slice(storyPageIdx * PANELS_PER_PAGE, (storyPageIdx + 1) * PANELS_PER_PAGE).map((panelScript, idx) => {
                        const panelIndex = storyPageIdx * PANELS_PER_PAGE + idx;
                        const panelImage = panels[panelIndex];
                        return (
                            <div key={panelIndex} className="bg-gray-900 rounded-md overflow-hidden border-2 border-gray-600 flex flex-col">
                                <div className="relative aspect-[4/3] bg-gray-900 group" onClick={() => panelImage && onEditPanel(panelIndex)}>
                                    {panelImage ? (
                                        <>
                                            <img src={`data:image/png;base64,${panelImage}`} alt={`Comic panel ${panelIndex + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center cursor-pointer">
                                                <span className="text-white font-bold text-xl opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 bg-black bg-opacity-50 px-4 py-2 rounded-md">EDIT</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                {(panelScript.narration || panelScript.dialogue.length > 0) && (
                                     <div className="p-2 bg-yellow-300 text-black font-bangers tracking-wide border-t-2 border-gray-600">
                                        {panelScript.narration && (
                                            <p className="text-sm italic mb-1">{panelScript.narration}</p>
                                        )}
                                        {panelScript.dialogue.map((dialog, dIdx) => (
                                            <p key={dIdx} className="text-base">
                                                <span className="font-bold">{dialog.character}:</span> {dialog.speech}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                 </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700">
            <h2 className="text-4xl font-bold mb-2 text-center text-shadow">{currentPage === 0 ? comicTitle || "Your Comic Book" : "Your Comic Book"}</h2>
            {isGenerating && <p className="text-yellow-400 mb-4 text-center text-shadow-md">Generating your comic... please wait.</p>}
            
            {renderPageContent()}

            <div className="flex items-center justify-center gap-4 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-6 py-2 bg-gray-600 rounded-full disabled:opacity-50">Prev</button>
                <span className="text-lg font-bold">Page {currentPage + 1} of {TOTAL_PAGES}</span>
                <button onClick={() => setCurrentPage(p => Math.min(TOTAL_PAGES - 1, p + 1))} disabled={currentPage === TOTAL_PAGES - 1} className="px-6 py-2 bg-gray-600 rounded-full disabled:opacity-50">Next</button>
            </div>

            <div className="text-center mt-8 space-x-4">
                 <button onClick={onReset} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">
                    Create Another
                </button>
                <button onClick={onSaveProject} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">
                    Save Project
                </button>
                <button onClick={handleDownloadPdf} disabled={isGenerating} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500">
                    {isGenerating ? "Generating..." : "Download PDF"}
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
    const [userStory, setUserStory] = useState<string>('');
    const [characters, setCharacters] = useState<Character[]>([]);
    const [enrichedStory, setEnrichedStory] = useState<string>('');
    const [comicScript, setComicScript] = useState<PanelScript[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
    const [generatedPanels, setGeneratedPanels] = useState<(string | null)[]>([]);
    const [comicTitle, setComicTitle] = useState<string>('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editingPanel, setEditingPanel] = useState<{ index: number; data: string } | null>(null);
    const [storyLoadingAction, setStoryLoadingAction] = useState<StoryLoadingAction>('none');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReset = () => {
        setStep(AppStep.WELCOME);
        setUserStory('');
        setCharacters([]);
        setEnrichedStory('');
        setComicScript([]);
        setSelectedStyle(null);
        setGeneratedPanels([]);
        setComicTitle('');
        setCoverImage(null);
        setError(null);
        setEditingPanel(null);
        setStoryLoadingAction('none');
    };

    const handleError = (errorMessage: string) => {
        setError(errorMessage);
        if (step > AppStep.STYLE_SELECTION) {
             setStep(AppStep.STYLE_SELECTION);
        } else if (step > AppStep.STORY_APPROVAL) {
            setStep(AppStep.STORY_APPROVAL);
        }
    };
    
    const handleStorySubmit = (story: string) => {
        setUserStory(story);
        setStep(AppStep.CHARACTER_CREATION);
    };
    
    const handleCharacterSubmit = useCallback(async (charList: Character[]) => {
        setCharacters(charList);
        setStep(AppStep.STORY_ENRICHING);
        setError(null);
        try {
            const result = await enrichStory(userStory, charList);
            setEnrichedStory(result);
            setStep(AppStep.STORY_APPROVAL);
        } catch (e) {
            handleError(e instanceof Error ? e.message : 'An unknown error occurred.');
        }
    }, [userStory]);

     const handleRegenerateStory = useCallback(async () => {
        setStoryLoadingAction('regenerate');
        setError(null);
        try {
            const result = await enrichStory(userStory, characters);
            setEnrichedStory(result);
        } catch (e) {
            handleError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setStoryLoadingAction('none');
        }
    }, [userStory, characters]);

    const handleReviseStory = useCallback(async (feedback: string) => {
        if (!feedback.trim()) return;
        setStoryLoadingAction('revise');
        setError(null);
        try {
            const result = await reviseStory(enrichedStory, feedback);
            setEnrichedStory(result);
        } catch (e) {
            handleError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setStoryLoadingAction('none');
        }
    }, [enrichedStory]);

    const handleSelectStyle = (style: StyleOption) => {
        setSelectedStyle(style);
        setStep(AppStep.GENERATING_SCRIPT);
    };

    const handleEditPanel = (index: number) => {
        const panelData = generatedPanels[index];
        if(panelData) {
            setEditingPanel({ index, data: panelData });
        }
    };

    const handleSaveEdit = (index: number, newImageData: string) => {
        const updatedPanels = [...generatedPanels];
        updatedPanels[index] = newImageData;
        setGeneratedPanels(updatedPanels);
        setEditingPanel(null);
    };

    const handleSaveProject = () => {
        if (!selectedStyle) {
            alert("Cannot save project without a selected style.");
            return;
        }

        const projectData: ComicProject = {
            version: 2,
            storyIdea: userStory,
            characters,
            enrichedStory,
            comicScript,
            selectedStyleName: selectedStyle.name,
            generatedPanels,
            comicTitle,
            coverImage,
        };

        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'comic-gen-project.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Invalid file content");
                
                const projectData = JSON.parse(text) as ComicProject;

                if (projectData.version !== 2) {
                    throw new Error("This project file is from an older version of ComicGen AI and is not compatible.");
                }

                if (!projectData.storyIdea || !projectData.characters || !projectData.selectedStyleName) {
                    throw new Error("Invalid or corrupted project file.");
                }

                const style = STYLES.find(s => s.name === projectData.selectedStyleName);
                if (!style) {
                    throw new Error(`Style "${projectData.selectedStyleName}" not found.`);
                }
                
                setUserStory(projectData.storyIdea);
                setCharacters(projectData.characters);
                setEnrichedStory(projectData.enrichedStory);
                setComicScript(projectData.comicScript);
                setSelectedStyle(style);
                setGeneratedPanels(projectData.generatedPanels);
                setComicTitle(projectData.comicTitle);
                setCoverImage(projectData.coverImage);
                
                setStep(AppStep.DISPLAY);

            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load project file.";
                setError(message);
                setStep(AppStep.WELCOME);
            }
        };
        reader.onerror = () => {
             setError("Error reading the project file.");
             setStep(AppStep.WELCOME);
        }
        reader.readAsText(file);
        
        event.target.value = '';
    };

    useEffect(() => {
        const generateScript = async () => {
            if (step === AppStep.GENERATING_SCRIPT && enrichedStory && characters.length > 0) {
                setError(null);
                try {
                    const script = await createComicScript(enrichedStory, characters);
                    setComicScript(script);
                    setGeneratedPanels(Array(TOTAL_PANELS).fill(null));
                    setStep(AppStep.GENERATING_COVER);
                } catch (e) {
                    handleError(e instanceof Error ? e.message : 'An unknown error occurred.');
                }
            }
        };
        generateScript();
    }, [step, enrichedStory, characters]);

    useEffect(() => {
        const generateCover = async () => {
            if (step === AppStep.GENERATING_COVER && userStory && characters.length > 0 && selectedStyle) {
                setError(null);
                try {
                    const { title, image } = await generateCoverPage(userStory, characters, selectedStyle.prompt);
                    setComicTitle(title);
                    setCoverImage(image);
                    setStep(AppStep.DISPLAY);
                } catch (e) {
                    handleError(e instanceof Error ? e.message : 'An unknown error occurred.');
                }
            }
        };
        generateCover();
    }, [step, userStory, characters, selectedStyle]);


    useEffect(() => {
        const generateImages = async () => {
            if (step === AppStep.DISPLAY && comicScript.length > 0 && selectedStyle && generatedPanels.some(p => p === null)) {
                setError(null);
                
                for (let i = 0; i < comicScript.length; i++) {
                    if (generatedPanels[i] === null) {
                        try {
                            const imageData = await generatePanelImage(comicScript[i].description, selectedStyle.prompt);
                            setGeneratedPanels(prevPanels => {
                                const newPanels = [...prevPanels];
                                newPanels[i] = imageData;
                                return newPanels;
                            });
                        } catch (e) {
                            console.error(`Failed to generate panel ${i+1}:`, e);
                            handleError(`Failed to generate panel ${i + 1}. You can try to edit it manually or create a new comic.`);
                            return;
                        }
                    }
                }
            }
        };
        generateImages();
    }, [step, comicScript, selectedStyle]);


    const renderContent = () => {
        switch (step) {
            case AppStep.WELCOME:
                return <WelcomeScreen onStart={() => setStep(AppStep.STORY_INPUT)} onImport={handleImportClick} />;
            case AppStep.STORY_INPUT:
                return <StoryInputScreen onSubmit={handleStorySubmit} />;
            case AppStep.CHARACTER_CREATION:
                 return <CharacterCreationScreen storyIdea={userStory} onSubmit={handleCharacterSubmit} onBack={() => setStep(AppStep.STORY_INPUT)} />;
            case AppStep.STORY_ENRICHING:
                 return <div className="text-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700"><LoadingSpinner /><h2 className="text-2xl mt-4 text-shadow">Enriching story with your characters...</h2></div>;
            case AppStep.STORY_APPROVAL:
                return <StoryApprovalScreen story={enrichedStory} onApprove={() => setStep(AppStep.STYLE_SELECTION)} onRegenerate={handleRegenerateStory} onRevise={handleReviseStory} loadingAction={storyLoadingAction} />;
            case AppStep.STYLE_SELECTION:
                return <StyleSelectionScreen onSelect={handleSelectStyle} />;
            case AppStep.GENERATING_SCRIPT:
                return <div className="text-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700"><LoadingSpinner /><h2 className="text-2xl mt-4 text-shadow">Writing comic script...</h2></div>;
            case AppStep.GENERATING_COVER:
                return <div className="text-center bg-black/60 backdrop-blur-md p-8 rounded-xl border border-gray-700"><LoadingSpinner /><h2 className="text-2xl mt-4 text-shadow">Designing your cover page...</h2></div>;
            case AppStep.DISPLAY:
                return <ComicBookViewer script={comicScript} panels={generatedPanels} onReset={handleReset} onEditPanel={handleEditPanel} onSaveProject={handleSaveProject} comicTitle={comicTitle} coverImage={coverImage} />;
            default:
                return <WelcomeScreen onStart={() => setStep(AppStep.STORY_INPUT)} onImport={handleImportClick} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 pb-16">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/json"
                className="hidden"
             />
             <main className="w-full flex-grow flex flex-col items-center justify-center">
                 {error && (
                    <div className="bg-red-900 border border-red-500 text-red-200 px-4 py-3 rounded-lg relative mb-6 w-full max-w-4xl" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                {renderContent()}
             </main>
             <AppFooter />
             {editingPanel && (
                <ImageEditorModal
                    panelIndex={editingPanel.index}
                    imageData={editingPanel.data}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingPanel(null)}
                />
             )}
        </div>
    );
};

export default App;