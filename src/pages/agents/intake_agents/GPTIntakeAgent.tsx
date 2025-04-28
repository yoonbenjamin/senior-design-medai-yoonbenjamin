import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '../../../context/AuthContext'; // Import the AuthContext hook

const GPTIntakeAgent: React.FC = () => {
    const isLoggedIn = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null); // State to track the selected file
    const navigate = useNavigate();

    const handleUpload = () => {
        if (selectedFile) {
            // Perform the file upload logic here
            console.log("File to upload:", selectedFile);
            // CALL BACKEND FUNCTION HERE TO SEND SELECTED FILE
        } else {
            console.log("No file selected.");
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleBack = () => {
        navigate("/patient-intake-agent");
    };

    return (
        <div className="flex h-screen min-w-screen bg-gradient-to-r from-slate-900 to-slate-800 from-50% text-white">
            <main className="flex-1 p-8 overflow-auto max-w-screen-lg mx-auto">
                {isLoggedIn ? (
                    <>
                        <>
                            <div className="flex justify-between items-center mb-8">
                                <button onClick={() => handleBack()} className="w-half bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-300">
                                    Back
                                </button>
                                <h2 className="text-3xl font-semibold mb-6">Patient Intake Agent</h2>
                            </div>
                            <h3 className="text-xl font-semibold mb-6 text-center">Upload your patient document and get results on disease categorization, and generate one-liners</h3>
                            <div className="flex justify-center">
                                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 w-full">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-medium text-white">Upload Patient Document</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-400 mb-4">Click Choose File to Upload Your Patient Document</p>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 mb-4"
                                        />
                                        <button onClick={() => handleUpload()} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-300">
                                            Get Results
                                        </button>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    </>
                ) : (
                    <div className="w-full bg-gray-800 p-6 rounded-lg">
                        <p>Please log in to view content.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GPTIntakeAgent;