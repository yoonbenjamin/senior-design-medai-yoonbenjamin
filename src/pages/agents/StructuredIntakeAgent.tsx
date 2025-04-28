import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '../../context/AuthContext';
import { StructuredDataResult } from '../../types';
import PDFPreview from './PDFPreview';
import { FileUp, X, Check, Pencil, Save, Undo2, Bot, AlertCircle, FileText, TriangleAlert } from 'lucide-react';

interface ModelResponse {
    modelName: string;
    result: StructuredDataResult;
}

const StructuredIntakeAgent: React.FC = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { firstName, lastName, patientId } = location.state || { firstName: 'Unknown', lastName: 'Patient', patientId: null };

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modelResponses, setModelResponses] = useState<ModelResponse[]>([]);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [editedResult, setEditedResult] = useState<StructuredDataResult | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [differences, setDifferences] = useState<Record<string, string[]>>({});
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccessMessage(null);
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
            setModelResponses([]);
            setSelectedModel(null);
            setEditedResult(null);
            setIsEditing(false);
            setDifferences({});
        }
    };
    
    const clearSelectedFile = () => {
        setSelectedFile(null);
        setModelResponses([]);
        setSelectedModel(null);
        setEditedResult(null);
        setIsEditing(false);
        setDifferences({});
        setError(null);
        setSuccessMessage(null);
        const fileInput = document.getElementById('file-upload-structured') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        setModelResponses([]);
        setSelectedModel(null);
        setEditedResult(null);
        setIsEditing(false);
        setDifferences({});

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
                fetch('http://127.0.0.1:5001/anthropic-structured', { method: 'POST', body: formData }),
                fetch('http://127.0.0.1:5001/structured-data/analyze', { method: 'POST', body: formData })
            ]);

             if (!claudeRes.ok || !ollamaRes.ok) {
                const claudeError = !claudeRes.ok ? `Claude Error (${claudeRes.status}): ${await claudeRes.text()}` : 'Claude OK';
                const ollamaError = !ollamaRes.ok ? `Ollama Error (${ollamaRes.status}): ${await ollamaRes.text()}` : 'Ollama OK';
                throw new Error(`Failed to analyze document. ${claudeError}. ${ollamaError}`);
            }

            const claudeData = await claudeRes.json();
            const ollamaData = await ollamaRes.json();

            const responses: ModelResponse[] = [
                { modelName: 'Claude', result: claudeData.result },
                { modelName: 'Llama', result: ollamaData.results.llama },
                { modelName: 'Phi', result: ollamaData.results.phi }
            ];

            setModelResponses(responses);
            findDifferences(responses);
        } catch (error: any) {
            console.error('Error analyzing document:', error);
             setError(error.message || 'An unknown error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    };

    const findDifferences = (responses: ModelResponse[]) => {
        const diffs: Record<string, string[]> = {};
        const fields: (keyof StructuredDataResult)[] = ['disease_site', 'tumor_stage', 'laterality', 'ebrt_relevance'];
        
        fields.forEach(field => {
            const values = new Set(responses.map(r => String(r.result[field])));
            if (values.size > 1) {
                diffs[field] = Array.from(values);
            }
        });

        ['age', 'sex'].forEach(field => {
            const values = new Set(responses.map(r => String(r.result.patient_info[field as keyof typeof r.result.patient_info])));
            if (values.size > 1) {
                diffs[`patient_info.${field}`] = Array.from(values);
            }
        });

        setDifferences(diffs);
    };

    const handleEdit = (model: ModelResponse) => {
        setEditedResult({ ...model.result });
        setSelectedModel(model.modelName);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditedResult(null);
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!selectedModel || !editedResult) return;
        setModelResponses(prev => 
            prev.map(r => 
                r.modelName === selectedModel 
                    ? { ...r, result: editedResult } 
                    : r
            )
        );
        setIsEditing(false);
        setEditedResult(null);
        setSuccessMessage("Edits saved locally. Select and save the result to finalize.");
         setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleSelectModel = (model: ModelResponse) => {
        setSelectedModel(model.modelName);
    };

    const handleSubmitSelected = async () => {
        if (!selectedModel) {
             setError("Please select a model's result to save.");
            return;
        }
        setIsSubmittingSelection(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const selectedResult = modelResponses.find(r => r.modelName === selectedModel);
            if (!selectedResult) throw new Error("Selected model result not found.");

            const reportRes = await fetch(`http://127.0.0.1:5001/latest-report/${patientId}`);
            if (!reportRes.ok) { throw new Error('Failed to get report ID'); }
            const { report_id } = await reportRes.json();
            if (!report_id) { throw new Error('Invalid report ID'); }
            
            const is_edited_flag = false;

            const submitRes = await fetch('http://127.0.0.1:5001/save-structured-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    report_id: report_id,
                    disease_site: selectedResult.result.disease_site,
                    tumor_stage: selectedResult.result.tumor_stage,
                    laterality: selectedResult.result.laterality,
                    age: selectedResult.result.patient_info?.age?.toString() || '',
                    sex: selectedResult.result.patient_info?.sex || '',
                    ebrt_relevance: selectedResult.result.ebrt_relevance?.toString() || '',
                    model: selectedModel,
                    is_edited: is_edited_flag
                }),
            });

            if (!submitRes.ok) {
                const errorText = await submitRes.text();
                throw new Error(`Failed to save structured data: ${submitRes.status} ${errorText}`);
            }

            setSuccessMessage(`Structured data from ${selectedModel} saved successfully!`);

        } catch (error: any) {
            console.error('Error submitting selection:', error);
            setError(error.message || 'An unknown error occurred saving the data.');
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
                            <Bot size={30} className="mr-3 text-indigo-600"/> Structured Intake Agent
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
                        <CardTitle className="flex items-center"><FileUp className="mr-2 h-5 w-5 text-blue-500"/> Upload Document</CardTitle>
                        <CardDescription>Select the patient document (PDF) to extract structured data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <label 
                            htmlFor="file-upload-structured" 
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
                                id="file-upload-structured" 
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
                                {isLoading ? 'Analyzing...' : 'Analyze Document'}
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

                {Object.keys(differences).length > 0 && !isEditing && (
                    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-300">
                        <div className="flex items-center mb-1">
                             <TriangleAlert className="h-5 w-5 mr-2 flex-shrink-0" />
                            <h3 className="font-semibold">Differences Detected Between Models</h3>
                         </div>
                         <ul className="list-disc list-inside pl-2 text-sm space-y-1">
                            {Object.entries(differences).map(([field, values]) => (
                                <li key={field}>
                                    <span className="font-medium capitalize">{field.replace(/_/g, ' ').replace('patient info.', '')}:</span> 
                                    <span className="opacity-90"> {values.join(' vs ')}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Results Grid - Overhauled */}
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Analysis Results</h2>
                <div className={`grid grid-cols-1 ${modelResponses.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 mb-6`}>
                    {/* Loading/Empty States */}
                    {isLoading && (
                        <div className="md:col-span-3 text-center p-10 text-gray-500 dark:text-gray-400">
                            <Bot size={30} className="animate-spin inline-block mb-2" />
                             <p>Analyzing document...</p>
                        </div>
                    )}
                    {!isLoading && modelResponses.length === 0 && selectedFile && (
                        <div className="md:col-span-3 text-center p-10 text-gray-500 dark:text-gray-400">
                            Click "Analyze Document" above to see results.
                        </div>
                    )}
                    {!isLoading && modelResponses.length === 0 && !selectedFile && (
                        <div className="md:col-span-3 text-center p-10 text-gray-500 dark:text-gray-400">
                           Upload a document to begin.
                        </div>
                    )}

                    {/* Results Cards */} 
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
                                        {isEditing && selectedModel === model.modelName ? (
                                            <> 
                                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                                     <Undo2 className="h-4 w-4 mr-1"/> Cancel
                                                </Button>
                                                <Button size="sm" variant="default" onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                                                    <Save className="h-4 w-4 mr-1"/> Save
                                                </Button>
                                            </>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => handleEdit(model)} title="Edit this result">
                                                <Pencil className="h-4 w-4"/>
                                            </Button>
                                        )}
                                        {selectedModel !== model.modelName && !isEditing && (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleSelectModel(model)}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                title="Select this result"
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
                            <CardContent className="flex-grow text-sm">
                                {isEditing && selectedModel === model.modelName && editedResult ? (
                                    <div className="space-y-3">
                                        {[ 
                                            { key: 'disease_site', label: 'Disease Site', type: 'text' },
                                            { key: 'tumor_stage', label: 'Tumor Stage', type: 'text' },
                                            { key: 'laterality', label: 'Laterality', type: 'text' },
                                            { key: 'age', label: 'Age', type: 'number', parent: 'patient_info' },
                                            { key: 'sex', label: 'Sex', type: 'text', parent: 'patient_info' },
                                            { key: 'ebrt_relevance', label: 'EBRT Relevant', type: 'select' },
                                        ].map(field => (
                                            <div key={field.key}>
                                                <label htmlFor={`${field.key}-${model.modelName}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
                                                {field.type === 'select' ? (
                                                     <Select 
                                                         value={editedResult.ebrt_relevance === null || editedResult.ebrt_relevance === undefined ? '' : String(editedResult.ebrt_relevance)}
                                                         onValueChange={(value) => {
                                                            const boolValue = value === '' ? null : value === 'true';
                                                             setEditedResult(prev => prev ? { ...prev, ebrt_relevance: boolValue } : null);
                                                         }}
                                                     >
                                                        <SelectTrigger id={`${field.key}-${model.modelName}`} className="w-full bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600">
                                                            <SelectValue placeholder="Select relevance..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                             <SelectItem value="">Not Specified</SelectItem>
                                                            <SelectItem value="true">Yes</SelectItem>
                                                            <SelectItem value="false">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input
                                                        id={`${field.key}-${model.modelName}`}
                                                        type={field.type}
                                                        value={field.parent ? (editedResult.patient_info as Record<string, any>)?.[field.key] ?? '' : (editedResult as any)[field.key] ?? ''}
                                                        onChange={(e) => {
                                                            const rawValue = e.target.value;
                                                            const value = field.type === 'number' ? (rawValue ? parseInt(rawValue) : null) : rawValue;
                                                            setEditedResult(prev => {
                                                                if (!prev) return null;
                                                                const newState = JSON.parse(JSON.stringify(prev)); 
                                                                if (field.parent) {
                                                                    if (!newState[field.parent]) newState[field.parent] = { age: null, sex: null }; // Ensure parent exists with expected keys
                                                                    newState[field.parent][field.key] = value;
                                                                } else {
                                                                     newState[field.key] = value;
                                                                }
                                                                return newState;
                                                            });
                                                        }}
                                                         className="bg-white dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                                    />
                                                )}
                                            </div>
                                        ))} 
                                    </div>
                                ) : (
                                     <div className="space-y-1.5 text-gray-700 dark:text-gray-300">
                                        <p><strong className="font-medium text-gray-500 dark:text-gray-400">Disease Site:</strong> {model.result.disease_site || <i className="opacity-60">N/A</i>}</p>
                                        <p><strong className="font-medium text-gray-500 dark:text-gray-400">Tumor Stage:</strong> {model.result.tumor_stage || <i className="opacity-60">N/A</i>}</p>
                                        <p><strong className="font-medium text-gray-500 dark:text-gray-400">Laterality:</strong> {model.result.laterality || <i className="opacity-60">N/A</i>}</p>
                                        <p><strong className="font-medium text-gray-500 dark:text-gray-400">Age:</strong> {model.result.patient_info?.age ?? <i className="opacity-60">N/A</i>}</p>
                                        <p><strong className="font-medium text-gray-500 dark:text-gray-400">Sex:</strong> {model.result.patient_info?.sex || <i className="opacity-60">N/A</i>}</p>
                                         <p><strong className="font-medium text-gray-500 dark:text-gray-400">EBRT Relevant:</strong> 
                                             {model.result.ebrt_relevance === true ? 'Yes' : model.result.ebrt_relevance === false ? 'No' : <i className="opacity-60">N/A</i>}
                                        </p>
                                    </div>
                                )}
                            </CardContent> 
                        </Card>
                    ))} 
                </div>

                {/* PDF Preview */} 
                {selectedFile && (
                     <Card className="mb-6 bg-white dark:bg-gray-800/60 shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                        <CardHeader>
                             <CardTitle className="flex items-center">
                                <FileText className="mr-2 h-5 w-5 text-gray-500"/> Document Preview
                             </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <PDFPreview 
                                selectedFile={selectedFile} 
                                clearFile={clearSelectedFile}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

             {/* Final Submit Button Area */} 
             {modelResponses.length > 0 && selectedModel && !isEditing && (
                 <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end sticky bottom-0 bg-gradient-to-t from-gray-100 dark:from-gray-800/80 to-transparent pb-6 px-6 -mx-6">
                    <Button
                        size="lg"
                        onClick={handleSubmitSelected}
                        disabled={isSubmittingSelection || !!successMessage}
                         className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:opacity-70 disabled:cursor-not-allowed text-white shadow hover:shadow-md"
                    >
                         {isSubmittingSelection ? 'Saving...' 
                           : successMessage ? <><Check className="h-5 w-5 mr-2"/> Saved</> 
                           : `Save ${selectedModel} Result`
                         }
                     </Button>
                </div>
            )}

        </div>
    );
};

export default StructuredIntakeAgent;