import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import PDFPreview from './PDFPreview';
import { FileUp, X, Check, Pencil, Save, Undo2, Send, Bot, AlertCircle, FileText } from 'lucide-react';

interface OnelinerResponse {
    modelName: string;
    oneliner: string;
}

const OnelinerIntakeAgent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { firstName, lastName, patientId } = location.state || { firstName: 'Unknown', lastName: 'Patient', patientId: null };

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modelResponses, setModelResponses] = useState<OnelinerResponse[]>([]);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [improvedOneliner, setImprovedOneliner] = useState<string | null>(null);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
    const [editingModel, setEditingModel] = useState<string | null>(null);
    const [editedOneliner, setEditedOneliner] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccessMessage(null);
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
            setModelResponses([]);
            setSelectedModel(null);
            setFeedback('');
            setImprovedOneliner(null);
            setEditingModel(null);
            setEditedOneliner('');
        }
    };
    
    const clearSelectedFile = () => {
        setSelectedFile(null);
        setModelResponses([]);
        setSelectedModel(null);
        setFeedback('');
        setImprovedOneliner(null);
        setEditingModel(null);
        setEditedOneliner('');
        setError(null);
        setSuccessMessage(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        setModelResponses([]);
        setSelectedModel(null);
        setFeedback('');
        setImprovedOneliner(null);
        setEditingModel(null);
        setEditedOneliner('');

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('patientId', patientId ? patientId.toString() : '');
        formData.append('firstName', firstName || '');
        formData.append('lastName', lastName || '');

        try {
            try {
                 await fetch('http://127.0.0.1:5001/upload-pathology-report', { method: 'POST', body: formData });
            } catch (saveError) {
                 console.warn('Failed to save report to database:', saveError);
            }

            const [claudeRes, ollamaRes] = await Promise.all([
                fetch('http://127.0.0.1:5001/anthropic-oneliner', { method: 'POST', body: formData }),
                fetch('http://127.0.0.1:5001/generate-oneliners', { method: 'POST', body: formData })
            ]);

            if (!claudeRes.ok || !ollamaRes.ok) {
                const claudeError = !claudeRes.ok ? await claudeRes.text() : '';
                const ollamaError = !ollamaRes.ok ? await ollamaRes.text() : '';
                throw new Error(`Failed to generate one-liners. Claude: ${claudeRes.status}. Ollama: ${ollamaRes.status}. Details: ${claudeError} ${ollamaError}`);
            }

            const claudeData = await claudeRes.json();
            const ollamaData = await ollamaRes.json();

            const responses: OnelinerResponse[] = [
                { modelName: 'Claude', oneliner: claudeData.summary?.trim() || 'Error: No summary received' },
                { modelName: 'Llama', oneliner: ollamaData.llama_response?.trim() || 'Error: No response received' },
                { modelName: 'Phi', oneliner: ollamaData.phi_response?.trim() || 'Error: No response received' }
            ];

            setModelResponses(responses);
        } catch (error: any) {
            console.error('Error generating one-liners:', error);
            setError(error.message || 'An unknown error occurred during generation.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (model: OnelinerResponse) => {
        setEditingModel(model.modelName);
        setEditedOneliner(model.oneliner);
    };

    const handleCancelEdit = () => {
        setEditingModel(null);
        setEditedOneliner('');
    };

    const handleSaveEdit = () => {
        if (!editingModel) return;

        setModelResponses(prev =>
            prev.map(r =>
                r.modelName === editingModel
                    ? { ...r, oneliner: editedOneliner }
                    : r
            )
        );
        setEditingModel(null);
        setEditedOneliner('');
    };

    const handleSelectModel = (model: OnelinerResponse) => {
        setSelectedModel(model.modelName);
    };

    const handleSendFeedback = async () => {
        if (feedback.trim() === '' || !selectedFile || !selectedModel) {
            setError("Please select a model and provide feedback text.");
            return;
        }
        setIsSubmittingFeedback(true);
        setError(null);
        setSuccessMessage(null);
        setImprovedOneliner(null);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('feedback', feedback);
            formData.append('model_name', selectedModel);
            formData.append('original_oneliner',
                modelResponses.find(r => r.modelName === selectedModel)?.oneliner || '');

            const endpoint = selectedModel === 'Claude'
                ? 'improve-anthropic-oneliner'
                : 'improve-oneliner';

            const response = await fetch(`http://127.0.0.1:5001/${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                 const errorText = await response.text();
                throw new Error(`Failed to process feedback: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            setImprovedOneliner(data.improved_oneliner?.trim() || 'Error: No improvement received');
        } catch (error: any) {
            console.error('Error processing feedback:', error);
             setError(error.message || 'An unknown error occurred processing feedback.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleApplyImprovement = () => {
        if (!selectedModel || !improvedOneliner) return;

        setModelResponses(prev =>
            prev.map(r =>
                r.modelName === selectedModel
                    ? { ...r, oneliner: improvedOneliner }
                    : r
            )
        );

        setImprovedOneliner(null);
        setFeedback('');
        setSuccessMessage(`Improvement from feedback applied to ${selectedModel}. You can now submit or edit further.`);
    };

    const handleDiscardImprovement = () => {
        setImprovedOneliner(null);
        setFeedback('');
    };

    const handleSubmitSelected = async () => {
        if (!selectedModel) {
            setError("Please select a model's one-liner to submit.");
            return;
        }
        setIsSubmittingSelection(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const selectedResult = modelResponses.find(r => r.modelName === selectedModel);
            if (!selectedResult) throw new Error("Selected model result not found.");

            const reportRes = await fetch(`http://127.0.0.1:5001/latest-report/${patientId}`);
            if (!reportRes.ok) {
                 const errorText = await reportRes.text();
                throw new Error(`Failed to fetch latest report ID: ${reportRes.status} ${errorText}`);
            }
            const { report_id } = await reportRes.json();
            if (!report_id) {
                 throw new Error('Received invalid report ID.');
            }

            const originalResponse = modelResponses.find(r => r.modelName === selectedModel);
            const isEdited = !originalResponse || selectedResult.oneliner !== originalResponse.oneliner;

            const submitRes = await fetch('http://127.0.0.1:5001/add-oneliner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    report_id: report_id,
                    model_name: selectedModel,
                    oneliner_text: selectedResult.oneliner,
                    is_edited: isEdited
                }),
            });

             if (!submitRes.ok) {
                 const errorText = await submitRes.text();
                throw new Error(`Failed to save one-liner: ${submitRes.status} ${errorText}`);
            }

            setSuccessMessage(`One-liner for ${selectedModel} submitted successfully!`);

        } catch (error: any) {
            console.error('Error submitting selection:', error);
             setError(error.message || 'An unknown error occurred submitting the selection.');
        } finally {
             setIsSubmittingSelection(false);
        }
    };


    return (
        <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/30 min-h-screen flex flex-col">
             <div className="flex-grow">
                <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                             <Bot size={30} className="mr-3 text-blue-600"/> Oneliner Generation Agent
                        </h1>
                         <p className="mt-1 text-gray-600 dark:text-gray-300">
                            Patient: <span className="font-medium">{firstName} {lastName}</span> (ID: {patientId || 'N/A'})
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                         <Undo2 className="h-4 w-4 mr-2" />
                         Back
                    </Button>
                </div>

                <Card className="mb-6 bg-white dark:bg-gray-800/60 shadow-sm border border-gray-200 dark:border-gray-700/50">
                    <CardHeader>
                        <CardTitle className="flex items-center"><FileUp className="mr-2 h-5 w-5 text-blue-500"/> Upload Pathology Report</CardTitle>
                        <CardDescription>Select the patient's pathology report file (PDF) to generate one-liners.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <label 
                            htmlFor="file-upload" 
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-150 ease-in-out ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                         >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                 {selectedFile ? (
                                    <> 
                                        <Check className="w-8 h-8 mb-3 text-green-600 dark:text-green-400" />
                                        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{selectedFile.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                        <span className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">Click to change file</span>
                                    </> 
                                 ) : (
                                    <> 
                                         <FileUp className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF files only</p>
                                    </> 
                                 )} 
                             </div>
                            <Input 
                                id="file-upload" 
                                type="file" 
                                accept=".pdf" 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                        </label>
                         <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile || isLoading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md"
                            >
                                {isLoading ? 'Generating...' : 'Generate One-liners'}
                            </Button>
                            {selectedFile && (
                                 <Button
                                    variant="outline"
                                    onClick={clearSelectedFile}
                                    disabled={isLoading}
                                    className="flex-shrink-0"
                                >
                                    <X className="h-4 w-4 mr-2" /> Remove File
                                </Button>
                            )}
                         </div>
                    </CardContent>
                </Card>

                {error && (
                     <div className="mb-6 p-4 border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-start text-red-700 dark:text-red-300">
                         <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <div>
                            <h5 className="font-semibold">Error</h5>
                             <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}
                {successMessage && (
                     <div className="mb-6 p-4 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-start text-green-700 dark:text-green-300">
                         <Check className="h-5 w-5 mr-3 flex-shrink-0" />
                         <div>
                            <h5 className="font-semibold">Success</h5>
                             <p className="text-sm">{successMessage}</p>
                        </div>
                    </div>
                )}

                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Generated One-liners</h2>
                <div className={`grid grid-cols-1 ${modelResponses.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 mb-6`}>
                    {isLoading && (
                         <div className="md:col-span-3 text-center p-10 text-gray-500 dark:text-gray-400">
                             <Bot size={30} className="animate-spin inline-block mb-2" />
                             <p>Generating results...</p>
                         </div>
                    )}
                    {!isLoading && modelResponses.length === 0 && selectedFile && (
                       <div className="md:col-span-3 text-center p-10 text-gray-500 dark:text-gray-400">
                           Click "Generate One-liners" above to see results.
                       </div>
                   )}
                    {!isLoading && modelResponses.length === 0 && !selectedFile && (
                        <div className="md:col-span-3 text-center p-10 text-gray-500 dark:text-gray-400">
                           Upload a document to begin.
                       </div>
                    )}

                    {modelResponses.map((model) => (
                        <Card
                            key={model.modelName}
                             className={`bg-white dark:bg-gray-800/60 shadow-sm border transition-all duration-200 ease-in-out flex flex-col
                                        ${selectedModel === model.modelName
                                            ? 'border-blue-500 dark:border-blue-600 ring-2 ring-blue-500/50 dark:ring-blue-600/50'
                                            : 'border-gray-200 dark:border-gray-700/50 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    <span className="font-semibold text-gray-800 dark:text-white">{model.modelName}</span>
                                     <div className="flex items-center gap-2">
                                         {editingModel === model.modelName ? (
                                            <> 
                                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                                    <Undo2 className="h-4 w-4 mr-1"/> Cancel
                                                </Button>
                                                 <Button size="sm" variant="default" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                                                    <Save className="h-4 w-4 mr-1"/> Save
                                                 </Button>
                                            </>
                                        ) : (
                                             <Button size="sm" variant="outline" onClick={() => handleEdit(model)} title="Edit this one-liner">
                                                <Pencil className="h-4 w-4"/>
                                             </Button>
                                        )}

                                        {selectedModel !== model.modelName && editingModel !== model.modelName && (
                                            <Button
                                                size="sm"
                                                variant="default" 
                                                onClick={() => handleSelectModel(model)}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                title="Select this one-liner"
                                            >
                                                <Check className="h-4 w-4"/>
                                            </Button>
                                         )}
                                        {selectedModel === model.modelName && (
                                             <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700 text-xs">
                                                 <Check className="h-3 w-3 mr-1"/> Selected
                                             </Badge>
                                        )} 
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {editingModel === model.modelName ? (
                                    <Textarea
                                        value={editedOneliner}
                                        onChange={(e) => setEditedOneliner(e.target.value)}
                                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white min-h-[150px] focus:ring-blue-500 dark:focus:ring-blue-600"
                                        rows={8}
                                    />
                                ) : (
                                     <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                                         {model.oneliner || <span className="text-gray-400 italic">No content generated.</span>}
                                     </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {modelResponses.length > 0 && selectedModel && !isSubmittingSelection && (
                     <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end sticky bottom-0 bg-gradient-to-t from-gray-100 dark:from-gray-800/80 to-transparent pb-6 px-6 -mx-6"> 
                        <Button
                            size="lg"
                            onClick={handleSubmitSelected}
                             disabled={isSubmittingSelection || !!successMessage} 
                             className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:opacity-70 disabled:cursor-not-allowed text-white shadow hover:shadow-md"
                        >
                             {isSubmittingSelection ? 'Submitting...' 
                               : successMessage ? <><Check className="h-5 w-5 mr-2"/> Submitted</> 
                               : `Submit ${selectedModel} One-liner`
                             }
                         </Button>
                    </div>
                )}

                {/* Step 3: Feedback & Improvement (Conditional) */}
                {modelResponses.length > 0 && (
                    <Card className="mb-6 bg-white dark:bg-gray-800/60 shadow-sm border border-gray-200 dark:border-gray-700/50">
                        <CardHeader>
                            <CardTitle className="flex items-center"><Send className="mr-2 h-5 w-5 text-purple-500"/> Provide Feedback</CardTitle>
                            <CardDescription>Optionally provide feedback on the <span className="font-semibold">{selectedModel || 'selected'}</span> model to improve its results.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Textarea
                                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-blue-500 dark:focus:ring-blue-600"
                                rows={3}
                                placeholder={`Enter feedback for the ${selectedModel || '(select a model first)'} one-liner...`}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                disabled={!selectedModel || isSubmittingFeedback}
                            />
                             <Button
                                onClick={handleSendFeedback}
                                 disabled={!selectedModel || !feedback.trim() || isSubmittingFeedback}
                                 className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white shadow hover:shadow-md"
                            >
                                 {isSubmittingFeedback ? 'Processing Feedback...' : 'Submit Feedback & Improve'}
                             </Button>

                             {/* Display Improved Oneliner */}
                             {isSubmittingFeedback && (
                                  <div className="text-center p-4 text-gray-500 dark:text-gray-400">Improving...</div>
                             )}
                             {improvedOneliner && (
                                <div className="mt-4 p-4 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300">Improved One-liner ({selectedModel}):</h4>
                                     <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{improvedOneliner}</p>
                                     {/* Optionally add a button to use this improved version */} 
                                </div>
                            )}
                        </CardContent>
                     </Card>
                )}
                
                 {/* Step 4: PDF Preview (Conditional) */}
                 {selectedFile && (
                     <Card className="bg-white dark:bg-gray-800/60 shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                         <CardHeader>
                             <CardTitle className="flex items-center">
                                 <FileText className="mr-2 h-5 w-5 text-gray-500"/> Document Preview
                             </CardTitle>
                         </CardHeader>
                         <CardContent>
                             <PDFPreview 
                                selectedFile={selectedFile} 
                                clearFile={clearSelectedFile} // Pass the clear function if PDFPreview uses it
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default OnelinerIntakeAgent;