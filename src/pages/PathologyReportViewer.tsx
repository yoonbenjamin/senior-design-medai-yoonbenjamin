import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Download,
  RefreshCw,
  AlertCircle,
  FileText,
  Clipboard,
  Target,
  Zap,
  Loader2
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from '../services/api'; // Import the api service

interface PathologyReport {
  report_id: number;
  patient_id: number;
  pdf_s3_url: string;
  creation_time: string;
  name: string; // Filename extracted from the URL or provided by API
}

interface OneLiner {
  one_liner_id: number;
  patient_id: number;
  report_id: number;
  one_liner_text: string;
  model: string;
  created_at?: string;
}

interface StructuredData {
  structured_data_id: number;
  patient_id: number;
  report_id: number;
  disease_site: string | null;
  tumor_stage: string | null;
  laterality: string | null;
  age: string | null;
  sex: string | null;
  ebrt_relevance: string | null;
  model: string | null;
  creation_time?: string;
}

// Define ApiError class locally if not exported/imported from api.ts
// Ensure this matches the definition in api.ts if importing/exporting
class ApiError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

const PathologyReportViewer: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<PathologyReport[]>([]);
  const [oneLiner, setOneLiner] = useState<OneLiner | null>(null);
  const [structuredData, setStructuredData] = useState<StructuredData | null>(null);
  const [selectedReport, setSelectedReport] = useState<PathologyReport | null>(null);
  const [viewerLoading, setViewerLoading] = useState<boolean>(false);
  // Updated to potentially include name directly from Patient type via api.getPatient
  const [patientInfo, setPatientInfo] = useState<{ firstName: string, lastName: string, name?: string } | null>(null);

  useEffect(() => {
    if (!patientId) return;
    fetchAllData();
  }, [patientId]);

  const fetchAllData = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    setSelectedReport(null); // Reset selected report on new fetch
    setReports([]);
    setOneLiner(null);
    setStructuredData(null);
    setPatientInfo(null);

    try {
      // Use Promise.allSettled to fetch concurrently and handle individual errors
      const results = await Promise.allSettled([
        api.getPatient(patientId),
        api.getPatientReports(patientId),
        api.getOneLiner(patientId),
        api.getStructuredData(patientId),
      ]);

      let overallError = null;

      // Process Patient Info
      if (results[0].status === 'fulfilled') {
        const patientData = results[0].value;
        setPatientInfo({
          firstName: patientData.first_name,
          lastName: patientData.last_name,
          name: patientData.name // Use name from Patient type
        });
      } else {
        console.error('Error fetching patient info:', results[0].reason);
        setPatientInfo({ firstName: 'Unknown', lastName: 'Patient' });
        overallError = overallError || 'Failed to load patient details.';
      }

      // Process Reports
      if (results[1].status === 'fulfilled') {
        const fetchedReports = results[1].value;
        const processedReports = fetchedReports.map(report => ({
          ...report,
          // Ensure name is present (either from API or derived)
          name: report.name || report.pdf_s3_url?.split('/').pop() || 'Unknown Report',
        }));
        setReports(processedReports);
        if (processedReports.length > 0) {
          setSelectedReport(processedReports[0]); // Select first report by default
        }
      } else {
        console.error('Error fetching reports:', results[1].reason);
        setReports([]);
        overallError = overallError || 'Failed to load pathology reports.';
      }

      // Process One-Liner
      if (results[2].status === 'fulfilled') {
        setOneLiner(results[2].value);
      } else {
         // Handle 404 specifically (no one-liner is not necessarily a page error)
         if (results[2].reason instanceof ApiError && results[2].reason.status === 404) {
            console.log(`No one-liner found for patient ${patientId}.`);
            setOneLiner(null);
         } else {
            console.error('Error fetching one-liner:', results[2].reason);
            setOneLiner(null);
            // Don't set overallError for missing one-liner unless desired
         }
      }

      // Process Structured Data
      if (results[3].status === 'fulfilled') {
        setStructuredData(results[3].value);
      } else {
        // Handle 404 specifically
        if (results[3].reason instanceof ApiError && results[3].reason.status === 404) {
            console.log(`No structured data found for patient ${patientId}.`);
            setStructuredData(null);
        } else {
            console.error('Error fetching structured data:', results[3].reason);
            setStructuredData(null);
            // Don't set overallError for missing structured data unless desired
        }
      }

      // Set the overall error state if any critical fetch failed
      setError(overallError);

    } catch (generalError) {
        // Catch any unexpected error during Promise.allSettled itself (unlikely)
        console.error("Unexpected error fetching patient data:", generalError);
        setError("An unexpected error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = (report: PathologyReport) => {
    setSelectedReport(report);
    setViewerLoading(true); // Show loader while iframe potentially reloads
    setError(null); // Clear previous viewer errors
  };

  const handleViewerLoad = () => {
    setViewerLoading(false);
  };

  const handleViewerError = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error("Iframe loading error:", e);
    setViewerLoading(false);
    setError('Error loading PDF in viewer. Try downloading.');
  };

  const getViewerUrl = (report: PathologyReport | null) => {
    if (!report) return '';

    let pathKey: string;

    // Check if it's a demo PDF path
    if (report.pdf_s3_url?.startsWith('demo-pdf://')) {
      // Extract the relative path after the scheme
      pathKey = report.pdf_s3_url.substring('demo-pdf://'.length);
      // We assume the backend viewer endpoint knows how to handle this relative path
      // when it doesn't look like an S3 path. The backend might need adjustment
      // to serve local files based on this path in demo mode.
    } else if (report.pdf_s3_url?.startsWith('s3://')) {
      // Existing logic for S3 paths
      const keyMatch = report.pdf_s3_url.match(/s3:\/\/[^\/]+\/(.*)/);
      pathKey = keyMatch ? keyMatch[1] : report.pdf_s3_url; // Fallback if regex fails
    } else {
      // Handle unexpected URL formats or potentially treat as a direct key/path
      console.warn("Unexpected pdf_s3_url format:", report.pdf_s3_url);
      pathKey = report.pdf_s3_url || '';
    }

    if (!pathKey) return '';

    // Use the base API URL consistently
    const baseApiUrl = 'http://127.0.0.1:5001'; // Or import API_URL from api.ts if exported
    // The backend at /pdf-viewer/ needs to correctly interpret the pathKey
    // whether it's an S3 key like 'PathologyReports/123.pdf' or a demo path like '/demo-pdfs/report_9001.pdf'
    return `${baseApiUrl}/pdf-viewer/${encodeURIComponent(pathKey)}`;
  };

  const handleDownload = (report: PathologyReport) => {
    // Construct the download URL (might be same as viewer or different)
    const downloadUrl = getViewerUrl(report); // Assuming viewer URL works for download
    window.open(downloadUrl, '_blank');
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Helper function to render structured data fields
  const renderStructuredDataField = (label: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="grid grid-cols-3 gap-2 items-start">
        <span className="col-span-1 font-medium text-gray-500 dark:text-gray-400 text-sm">{label}</span>
        <span className="col-span-2 text-gray-800 dark:text-gray-200 text-sm">{value}</span>
      </div>
    );
  };

  // Helper function to map icons to specific structured data fields
  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'disease_site':
        return <Target className="h-5 w-5 text-blue-500 mt-1" />;
      case 'tumor_stage':
        return <Zap className="h-5 w-5 text-purple-500 mt-1" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500 mt-1" />;
    }
  };

  // --- Loading State --- 
  if (loading) {
    return (
      <div className="p-8 max-w-screen-xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6 flex justify-between items-center">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-7 w-48" />
          <div className="w-[100px]"></div>
        </div>
        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report List Skeleton */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-gray-700">
                  {[...Array(4)].map((_, i) => <ReportListItemSkeleton key={i} />)}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* PDF Viewer Skeleton */}
          <div className="col-span-1 md:col-span-2">
            <PDFViewerSkeleton />
          </div>
          {/* One-Liner Skeleton */}
          <div className="col-span-3">
            <InfoCardSkeleton titleLines={1} contentLines={2} />
          </div>
          {/* Structured Data Skeleton */}
          <div className="col-span-3">
            <InfoCardSkeleton titleLines={1} contentLines={4} />
          </div>
        </div>
      </div>
    );
  }

  // --- Error State (Only show if critical data like patient info or reports failed) --- 
  if (error && (!patientInfo || reports.length === 0)) {
    return (
      <div className="p-8 max-w-screen-xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Error</h1>
          <div className="w-[100px]"></div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <p>{error || 'Failed to load essential patient data.'}</p>
            </div>
            <Button onClick={fetchAllData} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2"/>
              Retry
              </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main Content --- 
  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Button
          onClick={handleBack}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-center truncate px-4">
          {/* Use fetched patient name if available */}
          {patientInfo?.name || (patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'Patient')} - Pathology
        </h1>
        <div className="w-[100px] flex justify-end"> 
          <Button onClick={fetchAllData} variant="ghost" size="icon" title="Refresh Data">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Display general error if present but not critical */}
      {error && (reports.length > 0 || patientInfo) && (
           <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-300 flex items-center gap-2 border border-red-200 dark:border-red-800/50">
              <AlertCircle className="h-4 w-4" />
              {error}
           </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report List Panel */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200"> 
                <FileText className="h-4 w-4" />
                Available Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                {reports.length === 0 && !loading ? (
                  <div className="p-4 text-center text-gray-500">
                    No reports found
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.report_id}
                      className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150 ${selectedReport?.report_id === report.report_id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      onClick={() => handleSelectReport(report)}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm leading-tight" title={report.name}>{report.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.creation_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Viewer Panel */}
        <div className="col-span-1 md:col-span-2">
          {selectedReport ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-200 truncate" title={selectedReport.name}>{selectedReport.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedReport)}
                  className="flex items-center gap-2"
                  disabled={!selectedReport.pdf_s3_url}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </CardHeader>
              <CardContent className="p-0 h-[600px] relative border-t dark:border-gray-700">
                {viewerLoading && (
                  <div className="absolute inset-0 flex justify-center items-center bg-white/50 dark:bg-gray-900/50 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                )}
                {/* Conditionally render iframe only if URL is valid */} 
                {getViewerUrl(selectedReport) ? (
                    <iframe
                        key={selectedReport.report_id} // Add key to force re-render on report change
                        id="pdf-iframe"
                        src={getViewerUrl(selectedReport)}
                        className={`w-full h-full border-0 ${viewerLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                        onLoad={handleViewerLoad}
                        onError={handleViewerError}
                        title="PDF Viewer"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Cannot display PDF.
                    </div>
                )}
              </CardContent>
              {/* Error display within viewer card, specifically for PDF loading */}
              {error && error.includes('PDF') && (
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/50">
                    <AlertCircle className="h-4 w-4" />
                    <p>{error}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ) : (
            <Card className="h-[680px]">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-center">
                  {reports.length > 0
                    ? 'Select a report from the list to view it here.'
                    : 'No pathology reports found for this patient.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* One-Liner Card */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                <Clipboard className="h-4 w-4" />
                One-Liner Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!oneLiner && !loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No one-liner summary available.
                </div>
              ) : oneLiner ? (
                <div
                  key={oneLiner.one_liner_id} 
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md"
                >
                  <p className="text-gray-800 dark:text-gray-200 mb-2 text-sm leading-relaxed">{oneLiner.one_liner_text}</p>
                  {oneLiner.model && (
                    <Badge variant="secondary" className="text-xs">Generated by: {oneLiner.model}</Badge>
                  )}
                </div>
              ) : (
                 <Skeleton className="h-12 w-full" />
              ) }
            </CardContent>
          </Card>
        </div>

        {/* Structured Data Card */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                <Target className="h-4 w-4" />
                Structured Data Extraction
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!structuredData && !loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No structured data available.
                </div>
              ) : structuredData ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6">
                    {renderStructuredDataField("Disease Site", structuredData.disease_site)}
                    {renderStructuredDataField("Tumor Stage", structuredData.tumor_stage)}
                    {renderStructuredDataField("Laterality", structuredData.laterality)}
                    {renderStructuredDataField("Age", structuredData.age)}
                    {renderStructuredDataField("Sex", structuredData.sex)}
                    {renderStructuredDataField("EBRT Relevance", structuredData.ebrt_relevance)}
                  </div>
                  {structuredData.model && (
                    <div className="mt-4 pt-3 border-t dark:border-gray-600">
                      <Badge variant="secondary" className="text-xs">Generated by: {structuredData.model}</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- Skeleton Components --- 

const ReportListItemSkeleton: React.FC = () => (
  <div className="p-3 flex items-start gap-3">
    <Skeleton className="h-5 w-5 flex-shrink-0 mt-0.5" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const PDFViewerSkeleton: React.FC = () => (
  <Card className="h-[680px]">
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-8 w-24" />
    </CardHeader>
    <CardContent className="p-0 h-[600px] relative border-t dark:border-gray-700">
      <div className="absolute inset-0 flex justify-center items-center bg-gray-100 dark:bg-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    </CardContent>
  </Card>
);

const InfoCardSkeleton: React.FC<{titleLines: number, contentLines: number}> = ({ titleLines, contentLines }) => (
  <Card>
    <CardHeader>
      {[...Array(titleLines)].map((_, i) => <Skeleton key={i} className="h-6 w-1/3 mb-1" />)}
    </CardHeader>
    <CardContent className="p-4 space-y-2">
      {[...Array(contentLines)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
    </CardContent>
  </Card>
);

export default PathologyReportViewer;