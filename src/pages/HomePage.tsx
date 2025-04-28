import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Brain,
  Users,
  Clock,
  AlertCircle,
  FileText,
  Play,
  CheckCircle,
  Target,
  Zap,
  Plus,
  ArrowRight,
  BarChartHorizontal,
  ListChecks,
  ServerCrash,
} from 'lucide-react';
import { api } from '../services/api';
import { Patient } from '../types';
import { Skeleton } from '@/components/ui/skeleton';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeTasks: 0,
    processedPatients: 2,
    pendingReviews: 0,
    errors: 0,
    docProcessingCount: 0,
    contouringCount: 0,
    planningCount: 0,
    completedCount: 0,
  });

  const getOverallStatus = (patient: Patient): number => {
    if (patient.stage === 3) return 2;
    if (patient.status === -1) return -1;
    if (patient.status === 1) return 1;
    if (patient.status === 3) return 3;
    return 0;
  };

  const getStageText = (patient: Patient): string => {
    const stage = patient.stage ?? 0;
    switch (stage) {
        case 0: return 'Document Processing';
        case 1: return 'Auto Contouring';
        case 2: return 'Treatment Planning';
        case 3: return 'Completed';
        default: return 'Document Processing';
    }
  };

  const getStageIcon = (patient: Patient) => {
    const stage = patient.stage ?? 0;
    switch (stage) {
        case 0: return <FileText className="h-5 w-5 text-blue-500" />;
        case 1: return <Target className="h-5 w-5 text-purple-500" />;
        case 2: return <Zap className="h-5 w-5 text-indigo-500" />;
        case 3: return <CheckCircle className="h-5 w-5 text-green-500" />;
        default: return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: number): string => {
    switch (status) {
        case 0: return 'Not Started';
        case 1: return 'In Progress';
        case 2: return 'Completed';
        case 3: return 'Awaiting Review';
        case -1: return 'Error';
        default: return 'Unknown';
    }
  };

  const getStatusColorClass = (status: number): string => {
    switch (status) {
      case 0: return 'text-gray-500';
      case 1: return 'text-blue-500';
      case 2: return 'text-green-500';
      case 3: return 'text-yellow-500';
      case -1: return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
        case 0: return <Clock className="h-5 w-5 text-gray-500" />;
        case 1: return <Play className="h-5 w-5 text-blue-500" />;
        case 2: return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 3: return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        case -1: return <ServerCrash className="h-5 w-5 text-red-500" />;
        default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  useEffect(() => {
    fetchPatientsAndStats();
  }, []);

  const fetchPatientsAndStats = async () => {
    try {
        setLoading(true);
        const fetchedPatients = await api.getPatients();

        const patientsWithProgress = await Promise.all(
            fetchedPatients.map(async (patient) => {
                try {
                    const progressData = await api.getPatientProgress(patient.patient_id);
                    return {
                        ...patient,
                        document: progressData.document,
                        contour: progressData.contour,
                        planning: progressData.planning,
                        stage: progressData.stage,
                        status: progressData.status,
                        orthanic_id: progressData.orthanic_id || patient.orthanic_id
                    };
                } catch (error) {
                    console.error(`Failed to fetch progress for patient ${patient.patient_id}`, error);
                    return { ...patient, stage: 0, status: 0 };
                }
            })
        );

        setPatients(patientsWithProgress);

        let activeTasks = 0;
        let processedPatients = 0;
        let pendingReviews = 0;
        let errors = 0;
        let docProcessingCount = 0;
        let contouringCount = 0;
        let planningCount = 0;
        let completedCount = 0;

        patientsWithProgress.forEach(p => {
          const overallStatus = getOverallStatus(p);
          if (overallStatus === 1) activeTasks++;
          else if (overallStatus === 2) processedPatients++;
          else if (overallStatus === 3) pendingReviews++;
          else if (overallStatus === -1) errors++;

          const stage = p.stage ?? 0;
          const status = p.status ?? 0;
          if (stage === 3) {
             completedCount++;
          } else if (status !== -1) {
            if (stage === 0) docProcessingCount++;
            else if (stage === 1) contouringCount++;
            else if (stage === 2) planningCount++;
          }
        });
        processedPatients = completedCount; 

        setStats({
          totalPatients: patientsWithProgress.length,
          activeTasks,
          processedPatients,
          pendingReviews,
          errors,
          docProcessingCount,
          contouringCount,
          planningCount,
          completedCount
        });

    } catch (error) {
        console.error('Failed to fetch patients', error);
    } finally {
        setLoading(false);
    }
  };

  const taskCompletionData = [
    { name: 'Mon', intake: 4, contouring: 3, planning: 2 },
    { name: 'Tue', intake: 3, contouring: 4, planning: 3 },
    { name: 'Wed', intake: 5, contouring: 2, planning: 4 },
    { name: 'Thu', intake: 6, contouring: 5, planning: 3 },
    { name: 'Fri', intake: 4, contouring: 3, planning: 5 },
  ];

  type DisplayTask = {
    patientData: Patient | null;
    id: string | number;
    patientName: string;
    stageText: string;
    statusText: string;
    statusCode: number;
    time: string;
    stageIcon: JSX.Element;
    statusIcon: JSX.Element;
  }

  let displayTasks: DisplayTask[] = patients
    .sort((a, b) => {
        const statusA = getOverallStatus(a);
        const statusB = getOverallStatus(b);
        const priorityA = (statusA === -1 || statusA === 3) ? 0 : 1;
        const priorityB = (statusB === -1 || statusB === 3) ? 0 : 1;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return 0;
    })
    .slice(0, 5)
    .map(p => {
      const statusCode = getOverallStatus(p);
      return {
        patientData: p, 
        id: p.patient_id,
        patientName: `${p.first_name} ${p.last_name}`,
        stageText: getStageText(p),
        statusText: getStatusText(statusCode),
        statusCode: statusCode,
        time: "Recently",
        stageIcon: getStageIcon(p),
        statusIcon: getStatusIcon(statusCode)
      };
    });

  if (displayTasks.length === 0 && patients.length === 0 && !loading) {
      displayTasks = [{
          patientData: null,
          id: 'no-patients',
          patientName: "No Patients Available",
          stageText: "N/A",
          statusText: "N/A",
          statusCode: 0,
          time: "",
          stageIcon: <FileText className="h-5 w-5 text-gray-400" />,
          statusIcon: <Clock className="h-5 w-5 text-gray-400" />
      }];
  }

  const handleNavigate = (path: string, state?: any) => {
    navigate(path, { state });
  };

  const handleViewPatientWorkflow = (patient: Patient | null) => {
    if (!patient) return;

    console.log("Navigate for patient:", patient.patient_id, "Stage:", patient.stage, "Status:", patient.status, "OrthancID:", patient.orthanic_id);
    const overallStatus = getOverallStatus(patient);
    const stage = patient.stage ?? 0;

    if (overallStatus === 3) {
       if (stage === 1 && patient.orthanic_id) {
           console.log(`Opening contouring review for ${patient.orthanic_id}`);
           window.open(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/contouring/review/${patient.orthanic_id}`, '_blank');
           return;
       } else if (stage === 2 && patient.orthanic_id) {
           console.log(`Opening planning review for ${patient.orthanic_id}`);
           window.open(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/planning/review/${patient.orthanic_id}`, '_blank');
           return;
       } else {
           console.log("Review needed but no specific link/stage match (or missing orthanic_id), navigating to patients page.");
           navigate(`/patients`);
       }
    } else if (overallStatus === -1) {
        console.log("Error status, navigating to patients page.");
        navigate(`/patients`);
    } else {
        console.log("Non-actionable status, navigating to patients page.");
        navigate(`/patients`);
    }
  };

  type ActionItem = {
    patientData: Patient | null;
    id: string | number;
    patientName: string;
    actionNeeded: string;
    time?: string;
    icon: JSX.Element;
    priority: number;
  }

  let actionItems: ActionItem[] = patients
    .filter(p => getOverallStatus(p) === -1 || getOverallStatus(p) === 3)
    .map(p => {
        const status = getOverallStatus(p);
        const stage = p.stage ?? 0;
        let actionNeeded = "Action Required";
        let icon = <AlertCircle className="h-5 w-5 text-yellow-500" />;
        let priority = 2;

        if (status === -1) {
            actionNeeded = `Resolve Error: ${getStageText(p)}`;
            icon = <ServerCrash className="h-5 w-5 text-red-500" />;
            priority = 1;
        } else if (status === 3) {
            actionNeeded = `Review: ${getStageText(p)}`;
        }

        return {
            patientData: p,
            id: p.patient_id,
            patientName: `${p.first_name} ${p.last_name}`,
            actionNeeded: actionNeeded,
            icon: icon,
            priority: priority
        };
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  if (actionItems.length === 0 && !loading) {
      actionItems.push({
          patientData: null,
          id: 'no-actions',
          patientName: "No priority actions needed",
          actionNeeded: "All caught up!",
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          priority: 3
      });
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/30 min-h-screen">

      <div className="mb-10 p-6 bg-white dark:bg-gray-800/50 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-1">
              Welcome back, {user?.firstName || 'Doctor'}!
        </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Here's your AI-powered radiation oncology workflow overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            <Button
              size="lg"
              onClick={() => handleNavigate('/patients-new')}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 ease-in-out"
            >
              <Plus className="h-5 w-5 mr-2" /> Start New Patient
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleNavigate('/patients')}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <Users className="h-5 w-5 mr-2" /> View All Patients
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        <Card className="bg-white dark:bg-gray-800/60 shadow-md hover:shadow-lg transition-shadow border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Patients</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.totalPatients}
              </h3>
            </div>
            <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/50">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
         <Card className="bg-white dark:bg-gray-800/60 shadow-md hover:shadow-lg transition-shadow border border-transparent hover:border-teal-200 dark:hover:border-teal-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tasks In Progress</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.activeTasks}
              </h3>
            </div>
            <div className="rounded-full p-3 bg-teal-100 dark:bg-teal-900/50">
              <Play className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
          </CardContent>
        </Card>
         <Card className="bg-white dark:bg-gray-800/60 shadow-md hover:shadow-lg transition-shadow border border-transparent hover:border-yellow-200 dark:hover:border-yellow-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Pending Review</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.pendingReviews}
              </h3>
            </div>
            <div className="rounded-full p-3 bg-yellow-100 dark:bg-yellow-900/50">
              <ListChecks className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
         <Card className="bg-white dark:bg-gray-800/60 shadow-md hover:shadow-lg transition-shadow border border-transparent hover:border-red-200 dark:hover:border-red-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Workflow Errors</p>
              <h3 className="text-3xl font-bold text-red-600 dark:text-red-500">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.errors}
              </h3>
            </div>
            <div className="rounded-full p-3 bg-red-100 dark:bg-red-900/50">
              <ServerCrash className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
         <Card className="bg-white dark:bg-gray-800/60 shadow-md hover:shadow-lg transition-shadow border border-transparent hover:border-green-200 dark:hover:border-green-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Completed</p>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                {loading ? <Skeleton className="h-8 w-12" /> : stats.completedCount}
              </h3>
            </div>
            <div className="rounded-full p-3 bg-green-100 dark:bg-green-900/50">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        <Card className="lg:col-span-3 bg-white dark:bg-gray-800/60 shadow-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-200">
              <BarChartHorizontal className="h-5 w-5 mr-2 text-indigo-500" />
              Patient Workflow Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
             {loading ? (
                 <div className="h-20 flex items-center justify-center text-gray-500 dark:text-gray-400">Loading pipeline...</div>
             ) : (
                <div className="flex flex-col sm:flex-row items-stretch justify-between gap-2 sm:gap-4">
                    {/* Stage: Document Processing */}
                    <div className="flex-1 flex flex-col items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800/50 text-center">
                         <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                         <span className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                             {loading ? <Skeleton className="h-6 w-10" /> : stats.docProcessingCount}
                         </span>
                         <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Patient Intake</span>
                    </div>
                    <div className="flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <ArrowRight className="h-5 w-5 hidden sm:block" />
                        <ArrowRight className="h-5 w-5 rotate-90 sm:hidden" /> { /* Down arrow for mobile */}
                    </div>
                    {/* Stage: Auto Contouring */}
                     <div className="flex-1 flex flex-col items-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800/50 text-center">
                         <Target className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                         <span className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                             {loading ? <Skeleton className="h-6 w-10" /> : stats.contouringCount}
                         </span>
                         <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Auto Contouring</span>
                    </div>
                     <div className="flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <ArrowRight className="h-5 w-5 hidden sm:block" />
                        <ArrowRight className="h-5 w-5 rotate-90 sm:hidden" />
                    </div>
                    {/* Stage: Treatment Planning */}
                     <div className="flex-1 flex flex-col items-center p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800/50 text-center">
                         <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                         <span className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">
                             {loading ? <Skeleton className="h-6 w-10" /> : stats.planningCount}
                         </span>
                         <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Treatment Planning</span>
                    </div>
                     <div className="flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <ArrowRight className="h-5 w-5 hidden sm:block" />
                        <ArrowRight className="h-5 w-5 rotate-90 sm:hidden" />
                    </div>
                    {/* Stage: Completed */}
                     <div className="flex-1 flex flex-col items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800/50 text-center">
                         <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                         <span className="text-2xl font-bold text-green-800 dark:text-green-300">
                             {loading ? <Skeleton className="h-6 w-10" /> : stats.completedCount}
                         </span>
                         <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Completed</span>
                    </div>
                </div>
             )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white dark:bg-gray-800/60 shadow-lg border border-gray-200 dark:border-gray-700/50">
          <CardHeader>
             <CardTitle className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-200">
                <ListChecks className="h-5 w-5 mr-2 text-orange-500" />
                Priority Actions
             </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {[...Array(3)].map((_, i) => <ActionItemSkeleton key={i} />)}
                </div>
            ) : (
             <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleViewPatientWorkflow(item.patientData)}
                    className={`flex items-center p-3 rounded-lg transition-all duration-150 ease-in-out shadow-sm ${item.patientData ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} ${item.priority === 1 ? 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/50' : item.priority === 2 ? 'bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800/50' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                  >
                    <div className={`flex-shrink-0 rounded-full p-2 mr-3 ${item.priority === 1 ? 'bg-red-100 dark:bg-red-800/50' : 'bg-yellow-100 dark:bg-yellow-800/50'}`}>{item.icon}</div>
                    <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${item.priority === 1 ? 'text-red-800 dark:text-red-200' : item.priority === 2 ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-800 dark:text-gray-200'}`}>{item.patientName}</h4>
                        <p className={`text-xs truncate ${item.priority === 1 ? 'text-red-600 dark:text-red-400' : item.priority === 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`}>{item.actionNeeded}</p>
                    </div>
                     <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-white dark:bg-gray-800/60 shadow-lg border border-gray-200 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-200">Weekly Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={taskCompletionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)'}}/>
                  <Line 
                    type="monotone" 
                    dataKey="intake" 
                    stroke="#3B82F6" 
                    name="Docs Proc."
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="contouring" 
                    stroke="#A855F7"
                    name="Contouring"
                    strokeWidth={2}
                     dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="planning" 
                    stroke="#6366F1" 
                    name="Planning"
                    strokeWidth={2}
                     dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
};

// Skeleton component for Priority Action items
const ActionItemSkeleton: React.FC = () => (
    <div className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 shadow-sm">
        <Skeleton className="h-10 w-10 rounded-full mr-3 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-5 ml-2 flex-shrink-0" />
    </div>
);

export default HomePage;
