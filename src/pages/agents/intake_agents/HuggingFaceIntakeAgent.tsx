import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '../../../context/AuthContext';

const HuggingFaceIntakeAgent: React.FC = () => {
    const { isLoggedIn } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [summaries, setSummaries] = useState<{ summary1: string; summary2: string } | null>(null);
    const [displayedSummaries, setDisplayedSummaries] = useState<{ summary1: string; summary2: string }>({ summary1: '', summary2: '' });
    const [selectedSummary, setSelectedSummary] = useState<'summary1' | 'summary2' | null>('summary1');
    const [viewMode, setViewMode] = useState<'side-by-side' | 'fullscreen'>('side-by-side');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [improvedSummary, setImprovedSummary] = useState<string | null>(null);
    const navigate = useNavigate();

    // Utility function to clean text
    const cleanText = (text: string): string => {
        console.log('Cleaning text:', text);
        return text
            .replace(/[*#]/g, '') // Remove * and #
            .replace(/---/g, '') // Remove ---
            .replace(/\s{2,}/g, ' ') // Replace multiple spaces
            .replace(/\s+- /g, '\n- ') // Replace spaces before "- "
            .replace(/ - /g, '\n- ') // Insert break before "- "
            .trim();
    };

    // Text animation function
    const animateText = (text: string, callback: (updatedText: string) => void) => {
        let index = 0;
        const interval = setInterval(() => {
            if (index <= text.length) {
                callback(text.slice(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 5); // Adjust typing speed here
    };

    // Update displayed summaries with animations
    useEffect(() => {
        if (summaries) {
            animateText(cleanText(summaries.summary1), (updatedText) =>
                setDisplayedSummaries((prev) => ({ ...prev, summary1: updatedText }))
            );
            animateText(cleanText(summaries.summary2), (updatedText) =>
                setDisplayedSummaries((prev) => ({ ...prev, summary2: updatedText }))
            );
        }
    }, [summaries]);

    // Handle file upload
    const handleUpload = async () => {
        if (selectedFile) {
            setIsLoading(true);
            setSummaries(null);
            setDisplayedSummaries({ summary1: '', summary2: '' });

            const formData = new FormData();
            formData.append('file', selectedFile);

            try {
                const response = await fetch('http://127.0.0.1:5001/summarize-text', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Failed to upload the file');
                }

                const data = await response.json();
                setSummaries({
                    summary1: cleanText(data.summary1),
                    summary2: cleanText(data.summary2),
                });
            } catch (error) {
                console.error('Error during file upload:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Handle feedback submission
    const handleSendFeedback = async () => {
        if (feedback.trim() === '' || !selectedFile || !summaries || !selectedSummary) {
            console.log('Incomplete input for feedback.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('feedback', feedback);
            formData.append('initial_summary', summaries[selectedSummary]);

            const response = await fetch('http://127.0.0.1:5001/improve-summary-hf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to send feedback');
            }

            const data = await response.json();
            setImprovedSummary(cleanText(data.improved_summary));
        } catch (error) {
            console.error('Error during feedback submission:', error);
        }
    };

    // Handle file input change
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    // Switch to fullscreen view
    const handleSelectSummary = (summaryKey: 'summary1' | 'summary2') => {
        setSelectedSummary(summaryKey);
        setViewMode('fullscreen');
    };

    // Toggle view mode
    const handleToggleView = () => {
        setViewMode((prev) => (prev === 'fullscreen' ? 'side-by-side' : 'fullscreen'));
    };

    return (
        <div className="flex min-h-screen min-w-screen bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <main className="flex-1 p-8 max-w-screen-lg mx-auto">
                {isLoggedIn ? (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <button
                                onClick={() => navigate('/patient-intake-agent')}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Back
                            </button>
                            <h2 className="text-3xl font-semibold">Patient Intake Agent (Hugging Face)</h2>
                        </div>

                        <div className="flex justify-center">
                            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 w-full">
                                <CardHeader>
                                    <CardTitle className="text-lg font-medium text-white">Upload Patient Document</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 mb-4"
                                    />
                                    <button
                                        onClick={handleUpload}
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                    >
                                        Get Results
                                    </button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-8">
                            {isLoading && <div className="text-center text-lg">Generating results...</div>}
                            {summaries && viewMode === 'side-by-side' ? (
                                <div className="flex gap-4">
                                    <div
                                        className="w-1/2 bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600"
                                        onClick={() => handleSelectSummary('summary1')}
                                    >
                                        <h3 className="font-semibold text-lg mb-2">Response 1</h3>
                                        <p className="whitespace-pre-line">{displayedSummaries.summary1}</p>
                                    </div>
                                    <div
                                        className="w-1/2 bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600"
                                        onClick={() => handleSelectSummary('summary2')}
                                    >
                                        <h3 className="font-semibold text-lg mb-2">Response 2</h3>
                                        <p className="whitespace-pre-line">{displayedSummaries.summary2}</p>
                                    </div>
                                </div>
                            ) : viewMode === 'fullscreen' && selectedSummary ? (
                                <div>
                                    <button
                                        onClick={handleToggleView}
                                        className="mb-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                                    >
                                        Back to Side-by-Side View
                                    </button>
                                    <div className="bg-gray-700 p-4 rounded-lg">
                                        <h3 className="font-semibold text-lg">Selected Response</h3>
                                        <p className="whitespace-pre-line">
                                            {selectedSummary === 'summary1' ? displayedSummaries.summary1 : displayedSummaries.summary2}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            {summaries && (
                                <div>
                                    <textarea
                                        className="w-full p-2 mt-4 rounded border border-gray-700 bg-gray-800 text-white"
                                        rows={4}
                                        placeholder="Provide feedback here..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSendFeedback}
                                        className="w-full mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        Submit Feedback & Improve Results
                                    </button>
                                    {improvedSummary && (
                                        <div className="mt-4 p-4 bg-gray-700 text-white rounded-lg shadow-lg">
                                            <h3 className="font-semibold text-lg">Improved Results:</h3>
                                            <p className="whitespace-pre-line">{improvedSummary}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center">Please log in to view content.</div>
                )}
            </main>
        </div>
    );
};

export default HuggingFaceIntakeAgent;
