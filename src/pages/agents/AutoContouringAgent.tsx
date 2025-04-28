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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  Eye,
  Upload,
  Calendar,
  Play,
  Brain,
  FileSearch,
  Target,
  BarChart4,
  User,
  MapPin,
  Tag,
  StopCircle
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface Patient extends BasePatient {
  stage?: number;
  status?: number;
  orthanic_id?: string;
  modality?: string;
  studyDate?: string;
  priority?: 'high' | 'medium' | 'low';
  anatomicalSites?: string[];
  lastUpdate?: string;
  progress?: number;
  errorMessage?: string;
}

interface CategoryCardData {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
}

interface PatientCardProps {
  patient: Patient;
  stageKey: 'awaiting' | 'ready' | 'processing' | 'review' | 'completed';
  onStartContouring: (patient: Patient) => void;
  onOpenViewer: (patient: Patient) => void;
  onRegenerateContour?: (patient: Patient) => void;
  onCancelContouring?: (patient: Patient) => void;
  onApproveContour?: (patient: Patient) => void;
}

interface FocusedStatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
}

const getPriorityBgClass = (priority: string | undefined): string => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const PatientCard: React.FC<PatientCardProps> = ({ patient, stageKey, onStartContouring, onOpenViewer, onRegenerateContour, onCancelContouring, onApproveContour }) => {
  const priorityBgClass = getPriorityBgClass(patient.priority);

  return (
    <Card className={`bg-gray-700/70 shadow hover:shadow-lg transition-shadow duration-200 rounded-md hover:scale-105 transition-transform duration-200 ease-in-out`}>
      <CardHeader className="p-3 border-b border-gray-600/50">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${priorityBgClass} flex-shrink-0`}></div>
            <span className="truncate" title={patient.name || 'N/A'}>{patient.name || 'N/A'}</span>
          </div>
          <Badge variant="secondary" className="text-xs ml-2">ID: {patient.patientId}</Badge>
        </CardTitle>
        {patient.mrn && <CardDescription className="text-[11px] pt-1 text-gray-400">MRN: {patient.mrn}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2.5">
        <div className="flex items-start gap-1.5 text-gray-300">
          <Calendar className="w-3 h-3 mt-0.5 shrink-0 text-gray-400"/>
          <div>
            <span className="font-medium text-gray-400 block leading-tight">Study Date:</span>
            <span className="block leading-tight">{patient.studyDate}</span>
          </div>
        </div>
        {(patient.anatomicalSites && patient.anatomicalSites.length > 0) && (
          <div className="flex items-start gap-1.5 text-gray-300">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-gray-400"/>
            <div>
              <span className="font-medium text-gray-400 block leading-tight">Sites:</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {patient.anatomicalSites.map((site, index) => (
                  <Badge key={index} variant="outline" className="text-[10px] bg-gray-600 border-gray-500 px-1.5 py-0.5 font-normal leading-tight">
                    {site}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        {stageKey === 'processing' && (
          <div className="pt-1">
            <Progress value={patient.progress} className="h-1.5" />
            <span className="text-xs text-gray-400 mt-1">{patient.progress?.toFixed(1)}%</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 border-t border-gray-600/50 flex justify-end gap-1.5">
        {stageKey === 'awaiting' && (
          <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs p-1 h-auto">
            <Upload className="h-3 w-3" /> Upload CT
          </Button>
        )}
        {stageKey === 'ready' && (
          <>
            <Button size="sm" variant="outline" onClick={() => onOpenViewer(patient)} className="flex items-center gap-1 text-xs p-1 h-auto">
              <FileSearch className="h-3 w-3" /> View
            </Button>
            <Button size="sm" onClick={() => onStartContouring(patient)} className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 p-1 h-auto">
              <Play className="h-3 w-3" /> Start
            </Button>
          </>
        )}
        {stageKey === 'processing' && (
          <Button size="sm" variant="destructive" onClick={() => onCancelContouring && onCancelContouring(patient)} className="flex items-center gap-1 text-xs px-0.5 py-1 h-auto">
            <StopCircle className="h-3 w-3" /> Cancel
          </Button>
        )}
        {stageKey === 'review' && (
          <div className="flex flex-wrap justify-end gap-1"> 
            <Button 
              size="sm" 
              onClick={() => onOpenViewer(patient)} 
              className="flex items-center gap-1 text-xs bg-orange-600 hover:bg-orange-700 px-0.5 py-1 h-auto"
            >
              <Eye className="h-3 w-3" /> Review
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onRegenerateContour && onRegenerateContour(patient)} 
              className="flex items-center gap-1 text-xs px-0.5 py-1 h-auto"
            >
                <RefreshCw className="h-3 w-3" /> Regenerate
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onApproveContour && onApproveContour(patient)} 
              className="flex items-center gap-1 text-xs px-0.5 py-1 h-auto"
            >
                <CheckCircle2 className="h-3 w-3" /> Approve
            </Button>
          </div>
        )}
        {stageKey === 'completed' && (
          <Button size="sm" variant="outline" onClick={() => onOpenViewer(patient)} className="flex items-center gap-1 text-xs p-1 h-auto">
            <FileSearch className="h-3 w-3" /> View
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

const AutoContouringAgent: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [patientsAwaiting, setPatientsAwaiting] = useState<Patient[]>([]);
  const [patientsReady, setPatientsReady] = useState<Patient[]>([]);
  const [patientsProcessing, setPatientsProcessing] = useState<Patient[]>([]);
  const [patientsReview, setPatientsReview] = useState<Patient[]>([]);
  const [patientsCompleted, setPatientsCompleted] = useState<Patient[]>([]);
  
  const [statusCounts, setStatusCounts] = useState({
    awaitingCT: 0,
    readyForContouring: 0,
    processing: 0,
    awaitingReview: 0,
    completed: 0,
    highPriorityReady: 0,
    highPriorityReview: 0,
    totalActive: 0,
  });

  useEffect(() => {
    fetchContouringPatients();
  }, []);

  const fetchContouringPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allPatients = await api.getPatients();
      const patientsWithProgress = await Promise.all(
        allPatients.map(async (p) => {
          const sourcePatientId = p.patient_id;

          if (typeof sourcePatientId !== 'string' && typeof sourcePatientId !== 'number') {
            console.error(`Invalid or missing patient_id for source patient object:`, p);
            return {
              ...p,
              patientId: `invalid_id_${Math.random().toString(36).substring(2, 9)}`,
              stage: 0,
              status: -1,
              orthanic_id: p.orthanic_id || `dummy_orthanc_unknown`,
              priority: p.priority || (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
              modality: p.modality || 'CT',
              mrn: p.mrn || `MRN${Math.random().toString().substring(2, 8)}`,
              studyDate: p.studyDate || (() => {
                const end = new Date(2025, 3, 17);
                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
                return randomDate.toISOString().split('T')[0];
              })(),
              anatomicalSites: (p.anatomicalSites && p.anatomicalSites.length > 0) ? p.anatomicalSites : (() => {
                if (Math.random() < 0.75) return ['all'];
                const sites = ['Brain', 'Prostate', 'Lung', 'Breast', 'Head & Neck', 'Abdomen'];
                return [sites[Math.floor(Math.random() * sites.length)]];
              })(),
              progress: 0,
              lastUpdate: (() => {
                const now = new Date();
                const minutesAgo = Math.floor(Math.random() * 6) + 5;
                now.setMinutes(now.getMinutes() - minutesAgo);
                return formatDistanceToNow(now, { addSuffix: true });
              })(),
              name: `${p.first_name || '?'} ${p.last_name || '?'}`
            } as Patient;
          }

          try {
            const progressData = await api.getPatientProgress(sourcePatientId);
            return {
              ...p,
              ...progressData,
              patientId: sourcePatientId,
              orthanic_id: progressData.orthanic_id || p.orthanic_id || `dummy_orthanc_${sourcePatientId}`,
              priority: p.priority || (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
              modality: p.modality || 'CT',
              mrn: p.mrn || `MRN${Math.random().toString().substring(2, 8)}`,
              studyDate: p.studyDate || (() => {
                const end = new Date(2025, 3, 17);
                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
                return randomDate.toISOString().split('T')[0];
              })(),
              anatomicalSites: (p.anatomicalSites && p.anatomicalSites.length > 0) ? p.anatomicalSites : (() => {
                if (Math.random() < 0.75) return ['all'];
                const sites = ['Brain', 'Prostate', 'Lung', 'Breast', 'Head & Neck', 'Abdomen'];
                return [sites[Math.floor(Math.random() * sites.length)]];
              })(),
              progress: (progressData.stage === 1 && progressData.status === 1)
                ? (progressData.progress !== undefined ? progressData.progress : Math.floor(Math.random() * 91) + 5)
                : (progressData.status === 2 || progressData.status === 3 ? 100 : 0),
              lastUpdate: progressData.lastUpdate || (() => {
                const now = new Date();
                const minutesAgo = Math.floor(Math.random() * 6) + 5;
                now.setMinutes(now.getMinutes() - minutesAgo);
                return formatDistanceToNow(now, { addSuffix: true });
              })(),
              name: `${p.first_name} ${p.last_name}`
            } as Patient;
          } catch (progressError) {
            console.error(`Failed to fetch progress for patient ${sourcePatientId}`, progressError);
            return {
              ...p,
              patientId: sourcePatientId,
              stage: 0,
              status: -1,
              orthanic_id: p.orthanic_id || `dummy_orthanc_${sourcePatientId}`,
              priority: p.priority || (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
              modality: p.modality || 'CT',
              mrn: p.mrn || `MRN${Math.random().toString().substring(2, 8)}`,
              studyDate: p.studyDate || (() => {
                const end = new Date(2025, 3, 17);
                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
                return randomDate.toISOString().split('T')[0];
              })(),
              anatomicalSites: (p.anatomicalSites && p.anatomicalSites.length > 0) ? p.anatomicalSites : (() => {
                if (Math.random() < 0.75) return ['all'];
                const sites = ['Brain', 'Prostate', 'Lung', 'Breast', 'Head & Neck', 'Abdomen'];
                return [sites[Math.floor(Math.random() * sites.length)]];
              })(),
              progress: 0,
              lastUpdate: (() => {
                const now = new Date();
                const minutesAgo = Math.floor(Math.random() * 6) + 5;
                now.setMinutes(now.getMinutes() - minutesAgo);
                return formatDistanceToNow(now, { addSuffix: true });
              })(),
              name: `${p.first_name} ${p.last_name}`
            } as Patient;
          }
        })
      );

      const awaitingCT = patientsWithProgress.filter(p => p.stage === 0 && p.status === 2);
      const ready = patientsWithProgress.filter(p => p.stage === 1 && p.status === 0);
      const processing = patientsWithProgress.filter(p => p.stage === 1 && p.status === 1);
      const review = patientsWithProgress.filter(p => p.stage === 1 && p.status === 3);
      const completed = patientsWithProgress.filter(p => (p.stage === 1 && p.status === 2) || p.stage === 2 || p.stage === 3);

      setPatientsAwaiting(awaitingCT);
      setPatientsReady(ready);
      setPatientsProcessing(processing);
      setPatientsReview(review);
      setPatientsCompleted(completed);

    } catch (err) {
      console.error('Failed to fetch patients', err);
      setError('Failed to load patient data. Please try again later.');
      setPatientsAwaiting([]);
      setPatientsReady([]);
      setPatientsProcessing([]);
      setPatientsReview([]);
      setPatientsCompleted([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const highPriorityReadyCount = patientsReady.filter(p => p.priority === 'high').length;
    const highPriorityReviewCount = patientsReview.filter(p => p.priority === 'high').length;
    const totalActiveCount = patientsReady.length + patientsProcessing.length + patientsReview.length;

    setStatusCounts({
      awaitingCT: patientsAwaiting.length,
      readyForContouring: patientsReady.length,
      processing: patientsProcessing.length,
      awaitingReview: patientsReview.length,
      completed: patientsCompleted.length,
      highPriorityReady: highPriorityReadyCount,
      highPriorityReview: highPriorityReviewCount,
      totalActive: totalActiveCount,
    });
  }, [patientsAwaiting, patientsReady, patientsProcessing, patientsReview, patientsCompleted]);

  const handleStartContouring = useCallback((patient: Patient) => {
    // Add delay
    setTimeout(() => {
      const nextReadyPatients = patientsReady.filter(p => p.patientId !== patient.patientId);
      setPatientsReady(nextReadyPatients);

      const processingPatient = {
        ...patient,
      status: 1,
        progress: 0,
      lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      
      setPatientsProcessing(prev => [processingPatient, ...prev]);
    }, 500); // 500ms delay
  }, [patientsReady, setPatientsReady, setPatientsProcessing]);

  // Callback to handle regenerating contours
  const handleRegenerateContour = useCallback((patient: Patient) => {
    console.log(`Regenerating contours for patient ${patient.patientId}: ${patient.name}`);
    
    // Add delay
    setTimeout(() => {
      // Remove from review
      setPatientsReview(prev => prev.filter(p => p.patientId !== patient.patientId));

      // Add back to processing with reset progress
      const processingPatient = {
        ...patient,
        status: 1, // Back to In Progress status for Contouring
        progress: 0, // Reset progress
        lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      setPatientsProcessing(prev => [processingPatient, ...prev]);
    }, 500); // 500ms delay
  }, [setPatientsReview, setPatientsProcessing]);

  // Callback to cancel contouring
  const handleCancelContouring = useCallback((patient: Patient) => {
    console.log(`Cancelling contouring for patient ${patient.patientId}: ${patient.name}`);
    
    // Add delay
    setTimeout(() => {
      // Remove from processing
      setPatientsProcessing(prev => prev.filter(p => p.patientId !== patient.patientId));

      // Add back to ready with reset status/progress
      const readyPatient = {
          ...patient,
          status: 0, // Back to Not Started status for Contouring
          progress: 0, // Reset progress
          lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      setPatientsReady(prev => [...prev, readyPatient]);
    }, 500); // 500ms delay
  }, [setPatientsProcessing, setPatientsReady]);

  // Callback to approve contours
  const handleApproveContour = useCallback((patient: Patient) => {
    console.log(`Approving contours for patient ${patient.patientId}: ${patient.name}`);
    
    // Add delay
    setTimeout(() => {
      // Remove from review
      setPatientsReview(prev => prev.filter(p => p.patientId !== patient.patientId));

      // Add to completed (for contouring stage) with status 2
      const completedPatient = {
          ...patient,
          status: 2, // Completed status for Contouring stage
          progress: 100,
          lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
      };
      // Note: This adds to the *local* completed list for this agent.
      // The overall workflow state (moving to stage 2) relies on the backend or broader state management.
      setPatientsCompleted(prev => [...prev, completedPatient]);
    }, 500); // 500ms delay
  }, [setPatientsReview, setPatientsCompleted]);

  useEffect(() => {
    const updateInterval = 1000;

    const intervalId = setInterval(() => {
      setPatientsProcessing(currentProcessingPatients => {
        const updatedProcessing: Patient[] = [];
        const newlyCompleted: Patient[] = [];

        for (const patient of currentProcessingPatients) {
          const currentProgress = patient.progress ?? 0;
          const increment = 0.2;
          const newProgress = currentProgress + increment;

          if (newProgress >= 100) {
            newlyCompleted.push({
                  ...patient,
                  progress: 100,
              status: 3,
              lastUpdate: formatDistanceToNow(new Date(), { addSuffix: true })
            });
          } else {
            updatedProcessing.push({
              ...patient,
              progress: Math.round(newProgress * 10) / 10 
            });
          }
        }

        if (newlyCompleted.length > 0) {
          setPatientsReview(currentReviewPatients => [
            ...newlyCompleted,
            ...currentReviewPatients
          ]);
        }

        return updatedProcessing;
      });
    }, updateInterval);

    return () => clearInterval(intervalId);

  }, []);

  const openViewerForPatient = (patient: Patient) => {
    const viewerId = patient.orthanic_id || patient.patientId;
    window.open(
      `${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/contouring/review/${viewerId}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-full">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Auto-Contouring Agent
            </h2>
            <p className="text-gray-400 mt-2">Manage and track patient contouring tasks</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.open(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/contouring`, '_blank', 'noopener,noreferrer')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open DICOM Viewer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <FocusedStatCard 
            title="High Priority Ready" 
            value={statusCounts.highPriorityReady} 
            icon={<Target />} 
            color="text-red-400" 
          />
          <FocusedStatCard 
            title="High Priority Review" 
            value={statusCounts.highPriorityReview} 
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
              <Upload className="h-4 w-4" /> Awaiting CT ({patientsAwaiting.length})
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-await-${i}`} />)
              ) : patientsAwaiting.length === 0 ? (
                <p className="text-center text-gray-500 text-sm pt-4">No patients awaiting CT.</p>
              ) : (
                patientsAwaiting.map(p => (
                  <PatientCard key={p.patientId || `awaiting-${Math.random()}`} patient={p} stageKey="awaiting" onStartContouring={handleStartContouring} onOpenViewer={openViewerForPatient} onRegenerateContour={handleRegenerateContour} onCancelContouring={handleCancelContouring} onApproveContour={handleApproveContour} />
                ))
              )}
            </div>
                          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <h3 className="font-medium text-sm mb-3 text-center text-blue-400 flex items-center justify-center gap-2">
              <Target className="h-4 w-4" /> Ready for Contouring ({patientsReady.length})
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-ready-${i}`} />)
              ) : patientsReady.length === 0 ? (
                <p className="text-center text-gray-500 text-sm pt-4">No patients ready.</p>
              ) : (
                patientsReady.map(p => (
                  <PatientCard key={p.patientId || `ready-${Math.random()}`} patient={p} stageKey="ready" onStartContouring={handleStartContouring} onOpenViewer={openViewerForPatient} onRegenerateContour={handleRegenerateContour} onCancelContouring={handleCancelContouring} onApproveContour={handleApproveContour} />
                ))
              )}
                          </div>
                          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <h3 className="font-medium text-sm mb-3 text-center text-purple-400 flex items-center justify-center gap-2">
              <Activity className="h-4 w-4" /> Processing ({patientsProcessing.length})
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-proc-${i}`} />)
              ) : patientsProcessing.length === 0 ? (
                <p className="text-center text-gray-500 text-sm pt-4">No patients processing.</p>
              ) : (
                patientsProcessing.map(p => (
                  <PatientCard key={p.patientId || `processing-${Math.random()}`} patient={p} stageKey="processing" onStartContouring={handleStartContouring} onOpenViewer={openViewerForPatient} onRegenerateContour={handleRegenerateContour} onCancelContouring={handleCancelContouring} onApproveContour={handleApproveContour} />
                ))
              )}
                          </div>
                          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <h3 className="font-medium text-sm mb-3 text-center text-orange-400 flex items-center justify-center gap-2">
              <Eye className="h-4 w-4" /> Awaiting Review ({patientsReview.length})
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-rev-${i}`} />)
              ) : patientsReview.length === 0 ? (
                <p className="text-center text-gray-500 text-sm pt-4">No plans to review.</p>
              ) : (
                patientsReview.map(p => (
                  <PatientCard key={p.patientId || `review-${Math.random()}`} patient={p} stageKey="review" onStartContouring={handleStartContouring} onOpenViewer={openViewerForPatient} onRegenerateContour={handleRegenerateContour} onCancelContouring={handleCancelContouring} onApproveContour={handleApproveContour} />
                ))
              )}
                          </div>
                          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <h3 className="font-medium text-sm mb-3 text-center text-green-400 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Completed ({patientsCompleted.length})
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {isLoading ? (
                [...Array(3)].map((_, i) => <PatientCardSkeleton key={`skel-comp-${i}`} />)
              ) : patientsCompleted.length === 0 ? (
                <p className="text-center text-gray-500 text-sm pt-4">No completed contours.</p>
              ) : (
                patientsCompleted.map(p => (
                  <PatientCard key={p.patientId || `completed-${Math.random()}`} patient={p} stageKey="completed" onStartContouring={handleStartContouring} onOpenViewer={openViewerForPatient} onRegenerateContour={handleRegenerateContour} onCancelContouring={handleCancelContouring} onApproveContour={handleApproveContour} />
                ))
              )}
                </div>
              </div>
            </div>
      </div>
    </div>
  );
};

export default AutoContouringAgent;