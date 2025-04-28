// PDFPreview.tsx
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle, X, Maximize, Minimize } from 'lucide-react';

interface PDFPreviewProps {
  selectedFile: File | null;
  clearFile?: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ selectedFile, clearFile }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Create object URL when file is selected
  React.useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setObjectUrl(url);
      setLoading(true);
      setError(null);
      
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    } else {
      setObjectUrl(null);
    }
  }, [selectedFile]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setError("Failed to load PDF. The file may be corrupt or not a valid PDF.");
    setLoading(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!selectedFile) return null;

  return (
    <Card className={`mt-6 bg-gray-800 border-gray-700 transition-all ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardContent className="relative p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-lg">PDF Preview: {selectedFile.name}</h3>
          <div className="flex gap-2">
            {clearFile && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearFile}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-1"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => objectUrl && window.open(objectUrl, '_blank')}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded border border-gray-700 ${isFullscreen ? 'h-[calc(100vh-150px)]' : 'h-[500px]'}`}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <RefreshCw className="h-10 w-10 animate-spin text-blue-500 mb-4" />
              <p>Loading PDF preview...</p>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
              <p className="text-red-400">{error}</p>
              <p className="text-gray-400 mt-2">Try downloading the file to view it externally.</p>
            </div>
          )}
          
          {objectUrl && (
            <iframe
              src={objectUrl}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFPreview;