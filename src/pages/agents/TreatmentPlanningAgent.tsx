import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../services/api';
import { Patient as BasePatient } from '../../types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  Eye,
  Zap,
  Calendar,
  Target,
  Play,
  FileSearch,
  BarChart4,
  Lightbulb,
  FileText,
  StopCircle
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface Patient extends BasePatient {
  id: string;
  name: string;
  mrn: string;
  modality?: string;
  studyDate?: string;
  lastUpdate?: string;
  priority?: 'high' | 'medium' | 'low';
  treatmentSite?: string;
  prescription?: string;
  status?: number;
  stage?: number;
  orthanic_id?: string;
  progress?: number;
  dosimetricValues?: Record<string, number | undefined>;
  errorMessage?: string;
}

interface FocusedStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  color?: string;
}

interface PatientCardProps {
  patient: Patient;
  stageKey: 'awaitingContourReview' | 'awaiting' | 'ready' | 'processing' | 'review' | 'completed';
  onStartPlanning: (patient: Patient) => void;
  onApproveReview: (patient: Patient) => void;
  onOpenViewer: (url: string) => void;
  onRegeneratePlan: (patient: Patient) => void;
  onCancelProcessing: (patient: Patient) => void;
}

const getPriorityBgClass = (priority: string | undefined): string => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const getPriorityTooltip = (priority: string | undefined): string => {
    switch(priority) {
        case 'high': return 'High Priority';
        case 'medium': return 'Medium Priority';
        case 'low': return 'Low Priority';
        default: return 'Unknown Priority';
    }
};

const PatientCard: React.FC<PatientCardProps> = ({ patient, stageKey, onStartPlanning, onApproveReview, onOpenViewer, onRegeneratePlan, onCancelProcessing }) => {
  const priorityBgClass = getPriorityBgClass(patient.priority);

  return (
    <Card className={`bg-gray-700/70 shadow hover:shadow-lg rounded-md hover:scale-105 transition-transform duration-200 ease-in-out`}>
      <CardHeader className="p-3 border-b border-gray-600/50">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center">
                 <TooltipProvider delayDuration={100}>
                     <Tooltip>
                         <TooltipTrigger asChild>
                             <div className={`w-2 h-2 rounded-full mr-2 ${priorityBgClass} flex-shrink-0`}></div>
                         </TooltipTrigger>
                         <TooltipContent>
                             <p>{getPriorityTooltip(patient.priority)}</p>
                         </TooltipContent>
                     </Tooltip>
                 </TooltipProvider>
                <span className="truncate" title={patient.name || 'N/A'}>{patient.name || 'N/A'}</span>
            </div>
            <Badge variant="secondary" className="text-xs ml-2">ID: {patient.patientId}</Badge>
        </CardTitle>
        {patient.mrn && <CardDescription className="text-[11px] pt-1 text-gray-400">MRN: {patient.mrn}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2.5">
        <div className="flex items-start gap-1.5 text-gray-300">
          <Target className="w-3 h-3 mt-0.5 shrink-0 text-gray-400"/>
          <div>
            <span className="font-medium text-gray-400 block leading-tight">Site:</span>
            <span className="block leading-tight">{patient.treatmentSite || 'N/A'}</span>
          </div>
        </div>
        {patient.prescription && (
          <div className="flex items-start gap-1.5 text-gray-300">
            <FileText className="w-3 h-3 mt-0.5 shrink-0 text-gray-400"/>
            <div>
              <span className="font-medium text-gray-400 block leading-tight">Rx:</span>
              <span className="block leading-tight">{patient.prescription}</span>
            </div>
          </div>
        )}
        {(stageKey === 'review' || stageKey === 'completed') && patient.dosimetricValues && (
             <div className="flex items-start gap-1.5 text-gray-300 pt-1">
                 <BarChart4 className="w-3 h-3 mt-0.5 shrink-0 text-gray-400"/>
                 <div>
                     <span className="font-medium text-gray-400 block leading-tight">Dosimetry:</span>
                     <div className="flex flex-col gap-0.5 mt-0.5">
                         {Object.entries(patient.dosimetricValues)
                           .filter(([, value]) => value !== undefined)
                           .map(([key, value]) => (
                             <span key={key} className="text-xs"><span className="uppercase text-gray-400">{key}:</span> {value}%</span>
                         ))}
                     </div>
                 </div>
             </div>
        )}
        {stageKey === 'processing' && patient.progress !== undefined && (
          <div className="pt-1">
            <Progress value={patient.progress} className="h-1.5" />
            <span className="text-xs text-gray-400 mt-1">{patient.progress?.toFixed(1)}%</span>
          </div>
        )}
      </CardContent>
       <CardFooter className={`p-2 border-t border-gray-600/50 flex justify-end ${stageKey === 'review' ? 'flex-wrap gap-1' : 'gap-1.5'}`}>
            {stageKey === 'awaitingContourReview' && (
                 <Button size="sm" variant="outline" onClick={() => {
                     const viewerId = patient.orthanic_id || patient.patientId || 'unknown-id';
                     onOpenViewer(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/contouring/review/${viewerId}`);
                 }} className="flex items-center gap-1 text-xs p-1 h-auto">
                     <Eye className="h-3 w-3" /> Review Contours
                 </Button>
             )}
            {stageKey === 'ready' && (
                 <>
                     <Button size="sm" variant="outline" onClick={() => {
                         const viewerId = patient.patientId || 'unknown-id';
                         onOpenViewer(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/planning/review/${viewerId}`);
                     }} className="flex items-center gap-1 text-xs p-1 h-auto">
                         <FileSearch className="h-3 w-3" /> View
                     </Button>
                     <Button size="sm" onClick={() => onStartPlanning(patient)} className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 p-1 h-auto">
                         <Play className="h-3 w-3" /> Start
                     </Button>
                 </>
             )}
             {stageKey === 'processing' && (
                 <Button size="sm" variant="destructive" onClick={() => onCancelProcessing(patient)} className="flex items-center gap-1 text-xs px-0.5 py-1 h-auto">
                     <StopCircle className="h-3 w-3" /> Cancel
                 </Button>
             )}
             {stageKey === 'review' && (
                 <>
                     <Button size="sm" onClick={() => {
                         const viewerId = patient.orthanic_id || patient.patientId || 'unknown-id';
                         onOpenViewer(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/planning/review/${viewerId}`);
                     }} className="flex items-center gap-1 text-xs bg-orange-600 hover:bg-orange-700 px-0.5 py-1 h-auto">
                         <Eye className="h-3 w-3" /> Review
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => onRegeneratePlan(patient)} className="flex items-center gap-1 text-xs px-0.5 py-1 h-auto">
                         <RefreshCw className="h-3 w-3" /> Replan
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => onApproveReview(patient)} className="flex items-center gap-1 text-xs px-0.5 py-1 h-auto">
                         <CheckCircle2 className="h-3 w-3" /> Approve
                     </Button>
                 </>
             )}
             {stageKey === 'completed' && (
                 <Button size="sm" variant="outline" onClick={() => {
                     const viewerId = patient.patientId || 'unknown-id';
                     onOpenViewer(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/planning/review/${viewerId}`);
                 }} className="flex items-center gap-1 text-xs p-1 h-auto">
                     <FileSearch className="h-3 w-3" /> View Plan
                 </Button>
             )}
       </CardFooter>
    </Card>
  );
};

const FocusedStatCard: React.FC<FocusedStatCardProps> = ({ title, value, icon, color = "text-white" }) => (
  <Card className="bg-gray-800/60 border border-gray-700/50 shadow-sm">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
      </div>
      <div className="rounded-full p-3 bg-gray-700/50 ${color} opacity-80">
        {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" })}
      </div>
    </CardContent>
  </Card>
);

const PatientCardSkeleton: React.FC = () => (
    <Card className="bg-gray-700/50 shadow rounded-md">
        <CardHeader className="p-3 border-b border-gray-600/50">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-3 w-1/3 mt-1.5" />
        </CardHeader>
        <CardContent className="p-3 text-xs space-y-2.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </CardContent>
        <CardFooter className="p-2 border-t border-gray-600/50 flex justify-end">
             <Skeleton className="h-6 w-16" />
        </CardFooter>
    </Card>
);

const TreatmentPlanningAgent: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for patient data in each workflow stage
  const [patientsAwaitingContourReview, setPatientsAwaitingContourReview] = useState<Patient[]>([]);
  const [patientsReady, setPatientsReady] = useState<Patient[]>([]);
  const [patientsProcessing, setPatientsProcessing] = useState<Patient[]>([]);
  const [patientsReviewPlan, setPatientsReviewPlan] = useState<Patient[]>([]);
  const [patientsCompleted, setPatientsCompleted] = useState<Patient[]>([]);
  
  // Status counts derived from patient lists
  const [statusCounts, setStatusCounts] = useState({
    awaitingContourReview: 0,
    readyForPlanning: 0,
    processing: 0,
    reviewPlanNeeded: 0,
    completed: 0,
    highPriorityReady: 0,
    highPriorityReviewPlan: 0,
    totalActive: 0,
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchPlanningPatients();
  }, []);

  // Function to fetch and process patient data
  const fetchPlanningPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allPatients = await api.getPatients();
      const patientsWithProgress = await Promise.all<Patient>(
        allPatients.map(async (p) => {
          const basePatientId = p.patient_id; // Capture the ID from the base patient object
          if (!basePatientId) {
             console.error("Invalid or missing patient_id in base patient object:", p);
             // Return a dummy patient or skip
             return {
                 ...p,
                 patientId: `invalid_${Math.random().toString(36).substring(2, 9)}`,
                 name: `${p.first_name || '?'} ${p.last_name || '?'}`,
                 stage: 0, status: -1, // Mark as error
                 lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true }),
                 priority: 'low',
             } as Patient;
           }

          try {
            const progressData = await api.getPatientProgress(basePatientId);
            
            // Add fallbacks for planning-specific data if needed
            const treatmentSite = progressData.treatmentSite || p.treatmentSite || ['Brain', 'Prostate', 'Lung', 'Breast', 'Head & Neck'][Math.floor(Math.random() * 5)];
            const prescription = progressData.prescription || p.prescription || (treatmentSite === 'Prostate' ? '78 Gy / 39 fx' : '60 Gy / 30 fx');
          
            // Generate mock dosimetric values only for review/completed stages
            let dosimetricValues: Record<string, number | undefined> | undefined = undefined;
            if ((progressData.stage === 2 && progressData.status === 3) || progressData.stage === 3 || (progressData.stage === 2 && progressData.status === 2)) {
              dosimetricValues = {
                ptv: Math.floor(Math.random() * 5) + 95, // 95-99%
                [`oar1_${treatmentSite.toLowerCase().substring(0,3)}`]: Math.floor(Math.random() * 30) + 20, // 20-49%
                [`oar2_${treatmentSite.toLowerCase().substring(0,3)}`]: Math.floor(Math.random() * 25) + 15, // 15-39%
              };
            }
          
            return {
              ...p,
              ...progressData,
              patientId: basePatientId, // Ensure patientId is set correctly
              name: `${p.first_name} ${p.last_name}`, // Construct name
              orthanic_id: progressData.orthanic_id || p.orthanic_id || `dummy_orthanc_${basePatientId}`,
              priority: p.priority || (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
              modality: p.modality || 'CT',
              mrn: p.mrn || `MRN${Math.random().toString().substring(2, 8)}`,
              studyDate: p.studyDate || (() => {
                const end = new Date(2025, 3, 17); // Example date range
                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
                return randomDate.toISOString().split('T')[0];
              })(),
              treatmentSite: treatmentSite,
              prescription: prescription,
              progress: (progressData.stage === 2 && progressData.status === 1) 
                        ? (progressData.progress !== undefined ? progressData.progress : Math.floor(Math.random() * 91) + 5) 
                        : (progressData.status === 2 || progressData.status === 3 ? 100 : 0),
              lastUpdate: progressData.lastUpdate || formatDistanceToNow(new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24), { addSuffix: true }), // Random time in last day
              dosimetricValues: dosimetricValues,
            } as Patient;
          } catch (progressError) {
            console.error(`Failed to fetch progress for patient ${basePatientId}`, progressError);
            return {
              ...p,
              patientId: basePatientId,
              name: `${p.first_name} ${p.last_name}`,
              stage: 0, 
              status: -1, // Mark as error status
              orthanic_id: p.orthanic_id || `dummy_orthanc_${basePatientId}`,
              priority: p.priority || 'low',
              lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true }),
              errorMessage: 'Failed to load workflow status'
            } as Patient;
          }
        })
      );

      // Filter patients into stages based on API data
      const awaitingContourReview = patientsWithProgress.filter(p => p.stage === 1 && p.status === 3);
      const ready = patientsWithProgress.filter(p => p.stage === 2 && p.status === 0);
      const processing = patientsWithProgress.filter(p => p.stage === 2 && p.status === 1);
      const reviewPlan = patientsWithProgress.filter(p => p.stage === 2 && p.status === 3);
      const completed = patientsWithProgress.filter(p => p.stage === 3 || (p.stage === 2 && p.status === 2));

      setPatientsAwaitingContourReview(awaitingContourReview);
      setPatientsReady(ready);
      setPatientsProcessing(processing);
      setPatientsReviewPlan(reviewPlan);
      setPatientsCompleted(completed);

    } catch (err) {
      console.error('Failed to fetch patients', err);
      setError('Failed to load patient data. Please try again later.');
      // Clear all lists on error
      setPatientsAwaitingContourReview([]);
      setPatientsReady([]);
      setPatientsProcessing([]);
      setPatientsReviewPlan([]);
      setPatientsCompleted([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update status counts whenever patient lists change
  useEffect(() => {
    const highPriorityReadyCount = patientsReady.filter(p => p.priority === 'high').length;
    const highPriorityReviewPlanCount = patientsReviewPlan.filter(p => p.priority === 'high').length;
    const totalActiveCount = patientsReady.length + patientsProcessing.length + patientsReviewPlan.length;

    setStatusCounts({
      awaitingContourReview: patientsAwaitingContourReview.length,
      readyForPlanning: patientsReady.length,
      processing: patientsProcessing.length,
      reviewPlanNeeded: patientsReviewPlan.length,
      completed: patientsCompleted.length,
      highPriorityReady: highPriorityReadyCount,
      highPriorityReviewPlan: highPriorityReviewPlanCount,
      totalActive: totalActiveCount,
    });
  }, [patientsAwaitingContourReview, patientsReady, patientsProcessing, patientsReviewPlan, patientsCompleted]);

  const handleStartPlanning = useCallback(async (patient: Patient) => {
    // Simulating API call
    console.log(`Simulating start planning for patient ${patient.patientId}: ${patient.name}`);
    
    // Add a delay before updating state
    setTimeout(() => {
      setPatientsReady(prev => prev.filter(p => p.patientId !== patient.patientId));
        
      // Add to processing list with initial progress
      const processingPatient = {
        ...patient,
      status: 1, // Update status code
      progress: 0, // Start progress at 0
      lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      
      setPatientsProcessing(prev => [processingPatient, ...prev]);
      
      // Progress would be updated via polling or websockets in a real app
    }, 500); // 500ms delay
  }, [setPatientsReady, setPatientsProcessing]);
  
  const handleApproveReview = useCallback(async (patient: Patient) => {
    // Move from review to completed
    console.log(`Simulating approve review for patient ${patient.patientId}: ${patient.name}`);
    
    // Add a delay before updating state
    setTimeout(() => {
      setPatientsReviewPlan(prev => prev.filter(p => p.patientId !== patient.patientId));
      
      const completedPatient = {
        ...patient,
        status: 2,
        stage: 3,
        lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      
      setPatientsCompleted(prev => [...prev, completedPatient]);
    }, 500); // 500ms delay
  }, [setPatientsReviewPlan, setPatientsCompleted]);

  // Callback to handle regenerating a plan
  const handleRegeneratePlan = useCallback((patient: Patient) => {
    console.log(`Regenerating plan for patient ${patient.patientId}: ${patient.name}`);
    // Add a delay before updating state
    setTimeout(() => {
      // Remove from review
      setPatientsReviewPlan(prev => prev.filter(p => p.patientId !== patient.patientId));
      
      // Add back to processing with reset progress
      const processingPatient = {
        ...patient,
        status: 1, // Back to In Progress status
        progress: 0, // Reset progress
        lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      setPatientsProcessing(prev => [processingPatient, ...prev]);
    }, 500); // 500ms delay
  }, [setPatientsReviewPlan, setPatientsProcessing]);

  // Callback to cancel processing
  const handleCancelProcessing = useCallback((patient: Patient) => {
    console.log(`Cancelling processing for patient ${patient.patientId}: ${patient.name}`);
    // Add a delay before updating state
    setTimeout(() => {
      // Remove from processing
      setPatientsProcessing(prev => prev.filter(p => p.patientId !== patient.patientId));

      // Add back to ready with reset status/progress
      const readyPatient = {
          ...patient,
          status: 0, // Back to Not Started status for Planning stage
          progress: 0, // Reset progress
          lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      setPatientsReady(prev => [readyPatient, ...prev]);
    }, 500); // 500ms delay
  }, [setPatientsProcessing, setPatientsReady]);

  // Effect to simulate progress for processing patients
  useEffect(() => {
    const updateInterval = 1000; // Update progress every second

    const intervalId = setInterval(() => {
      setPatientsProcessing(currentProcessingPatients => {
        const updatedProcessing: Patient[] = [];
        const newlyCompleted: Patient[] = [];

        for (const patient of currentProcessingPatients) {
          const currentProgress = patient.progress ?? 0;
          // Simulate a slower progress for planning compared to contouring
          const increment = 0.5; // e.g., 0.5% per second
          const newProgress = currentProgress + increment;

          if (newProgress >= 100) {
            // Move to review when complete
            newlyCompleted.push({
              ...patient,
              progress: 100,
              status: 3, // Status 3: Awaiting Review (for Planning stage)
              lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
            });
          } else {
            // Update progress if still processing
            updatedProcessing.push({
              ...patient,
              progress: Math.round(newProgress * 10) / 10, // Keep one decimal place
              lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true }) // Update timestamp
            });
          }
        }

        // If any patients completed, add them to the review list
        if (newlyCompleted.length > 0) {
          setPatientsReviewPlan(currentReviewPatients => [
            ...newlyCompleted,
            ...currentReviewPatients
          ]);
        }

        // Return the list of patients still processing
        return updatedProcessing;
      });
    }, updateInterval);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);

  }, []); // Empty dependency array ensures this runs only once on mount
  
  const openViewerForPatient = (url: string) => {
    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-full">
        <div className="flex justify-between items-center mb-10">
          <div>
             <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">
                 Treatment Planning Agent
             </h2>
             <p className="text-gray-400 mt-2">Manage and optimize patient treatment plans</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.open(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/planning`, '_blank', 'noopener,noreferrer')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Planning System
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <FocusedStatCard 
            title="High Priority Ready" 
            value={statusCounts.highPriorityReady} 
            icon={<Zap />} 
            color="text-red-400" 
          />
          <FocusedStatCard 
            title="High Priority Review" 
            value={statusCounts.highPriorityReviewPlan} 
            icon={<Eye />} 
            color="text-orange-400" 
          />
          <FocusedStatCard 
            title="Total Active (Ready/Processing/Review)" 
            value={statusCounts.totalActive} 
            icon={<Activity />} 
            color="text-blue-400"
          />
        </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8 min-h-[600px]">
             <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                 <h3 className="font-medium text-sm mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
                     <Eye className="h-4 w-4" /> Awaiting Contour Review ({statusCounts.awaitingContourReview})
                 </h3>
                 <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                     {isLoading ? (
                         [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-await-${i}`} />)
                     ) : patientsAwaitingContourReview.length === 0 ? (
                         <p className="text-center text-gray-500 text-sm pt-4">No patients awaiting contour review.</p>
                     ) : (
                         patientsAwaitingContourReview.map(p => ( <PatientCard key={p.patientId} patient={p} stageKey="awaitingContourReview" onStartPlanning={handleStartPlanning} onApproveReview={handleApproveReview} onOpenViewer={openViewerForPatient} onRegeneratePlan={handleRegeneratePlan} onCancelProcessing={handleCancelProcessing} /> ))
                     )}
                 </div>
                          </div>
 
             <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                 <h3 className="font-medium text-sm mb-3 text-center text-blue-400 flex items-center justify-center gap-2">
                     <Zap className="h-4 w-4" /> Ready ({statusCounts.readyForPlanning})
                 </h3>
                 <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                     {isLoading ? (
                         [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-ready-${i}`} />)
                     ) : patientsReady.length === 0 ? (
                         <p className="text-center text-gray-500 text-sm pt-4">No patients ready.</p>
                     ) : (
                         patientsReady.map(p => ( <PatientCard key={p.patientId} patient={p} stageKey="ready" onStartPlanning={handleStartPlanning} onApproveReview={handleApproveReview} onOpenViewer={openViewerForPatient} onRegeneratePlan={handleRegeneratePlan} onCancelProcessing={handleCancelProcessing} /> ))
                     )}
                          </div>
                          </div>
 
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <h3 className="font-medium text-sm mb-3 text-center text-purple-400 flex items-center justify-center gap-2">
                      <Activity className="h-4 w-4" /> Processing ({statusCounts.processing})
                  </h3>
                  <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                      {isLoading ? (
                         [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-proc-${i}`} />)
                     ) : patientsProcessing.length === 0 ? (
                         <p className="text-center text-gray-500 text-sm pt-4">No plans processing.</p>
                     ) : (
                         patientsProcessing.map(p => ( <PatientCard key={p.patientId} patient={p} stageKey="processing" onStartPlanning={handleStartPlanning} onApproveReview={handleApproveReview} onOpenViewer={openViewerForPatient} onRegeneratePlan={handleRegeneratePlan} onCancelProcessing={handleCancelProcessing} /> ))
                     )}
              </div>
              </div>
 
             <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <h3 className="font-medium text-sm mb-3 text-center text-orange-400 flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" /> Review Plan ({statusCounts.reviewPlanNeeded})
                  </h3>
                  <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 flex-wrap gap-1">
                      {isLoading ? (
                         [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-rev-${i}`} />)
                     ) : patientsReviewPlan.length === 0 ? (
                         <p className="text-center text-gray-500 text-sm pt-4">No plans to review.</p>
                     ) : (
                         patientsReviewPlan.map(p => ( <PatientCard key={p.patientId} patient={p} stageKey="review" onStartPlanning={handleStartPlanning} onApproveReview={handleApproveReview} onOpenViewer={openViewerForPatient} onRegeneratePlan={handleRegeneratePlan} onCancelProcessing={handleCancelProcessing} /> ))
                     )}
                </div>
              </div>
 
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <h3 className="font-medium text-sm mb-3 text-center text-green-400 flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Completed ({statusCounts.completed})
                  </h3>
                  <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                      {isLoading ? (
                         [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-comp-${i}`} />)
                     ) : patientsCompleted.length === 0 ? (
                         <p className="text-center text-gray-500 text-sm pt-4">No plans completed.</p>
                     ) : (
                         patientsCompleted.map(p => ( <PatientCard key={p.patientId} patient={p} stageKey="completed" onStartPlanning={handleStartPlanning} onApproveReview={handleApproveReview} onOpenViewer={openViewerForPatient} onRegeneratePlan={handleRegeneratePlan} onCancelProcessing={handleCancelProcessing} /> ))
                     )}
                </div>
              </div>
            </div>
      </div>
    </div>
  );
};

export default TreatmentPlanningAgent;