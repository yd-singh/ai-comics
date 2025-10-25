import React, { useState } from 'react';
import { editPanelImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface ImageEditorModalProps {
    panelIndex: number;
    imageData: string;
    onSave: (index: number, newImageData: string) => void;
    onClose: () => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ panelIndex, imageData, onSave, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [editedImageData, setEditedImageData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const newImage = await editPanelImage(editedImageData || imageData, prompt);
            setEditedImageData(newImage);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to edit image.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (editedImageData) {
            onSave(panelIndex, editedImageData);
        }
    };
    
    const handleDiscard = () => {
        setEditedImageData(null);
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-full overflow-y-auto relative border border-gray-700">
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 text-gray-400 hover:text-white text-3xl font-bold leading-none"
                    aria-label="Close"
                >
                    &times;
                </button>
                <h2 className="text-2xl font-bold mb-4 text-white">Edit Panel</h2>
                
                <div className="relative mb-4 aspect-w-3 aspect-h-4 bg-gray-900 rounded-md overflow-hidden">
                    <img src={`data:image/png;base64,${editedImageData || imageData}`} alt="Panel to edit" className="w-full h-full object-contain" />
                    {isLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    )}
                </div>
                
                {error && <p className="text-red-400 mb-4 text-center bg-red-900 p-2 rounded-md">{error}</p>}

                <div className="flex flex-col gap-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Add a retro filter, make the sky red..."
                        className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows={2}
                        disabled={isLoading}
                    />
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                        <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:scale-100">
                            {isLoading ? 'Generating...' : 'Generate Edit'}
                        </button>
                        
                        {editedImageData && (
                            <div className="flex gap-2">
                                 <button onClick={handleDiscard} disabled={isLoading} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-5 rounded-full transition-transform transform hover:scale-105">
                                    Discard
                                </button>
                                <button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-full transition-transform transform hover:scale-105">
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;
