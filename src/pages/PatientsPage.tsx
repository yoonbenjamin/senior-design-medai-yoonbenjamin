import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Plus, Play, AlertCircle, CheckCircle, Clock, Target, Zap, FileText, ArrowUpDown, Search, Activity, TriangleAlert } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { api } from '../services/api';
import { Patient } from '../types';
import { Skeleton } from "@/components/ui/skeleton";

// Define SortConfig type
type SortConfig = {
    key: keyof Patient | 'stageText' | 'statusText' | null;
    direction: 'ascending' | 'descending';
};

// Define Stats type
type PageStats = {
    totalPatients: number;
    awaitingReview: number;
    workflowErrors: number;
    activeWorkflows: number;
};

const PatientsPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState<boolean>(false);
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'patient_id', direction: 'ascending' });
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [stats, setStats] = useState<PageStats>({
        totalPatients: 0,
        awaitingReview: 0,
        workflowErrors: 0,
        activeWorkflows: 0,
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
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
                        return {
                            ...patient,
                            document: 0,
                            contour: 0,
                            planning: 0,
                            stage: 0,
                            status: 0,
                            orthanic_id: patient.orthanic_id 
                        }; 
                    }
                })
            );
            
            setPatients(patientsWithProgress);
            calculateStats(patientsWithProgress);
            setError(null);
        } catch (error) {
            console.error('Failed to fetch patients', error);
            setError('Failed to load patients. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (currentPatients: Patient[]) => {
        let awaitingReview = 0;
        let workflowErrors = 0;
        let activeWorkflows = 0;

        currentPatients.forEach(p => {
            const status = p.status ?? 0; 
            if (status === 3) awaitingReview++;
            else if (status === -1) workflowErrors++;
            else if (status === 1) activeWorkflows++;
        });

        setStats({
            totalPatients: currentPatients.length,
            awaitingReview,
            workflowErrors,
            activeWorkflows,
        });
    };

    const getStageText = (patient: Patient): string => {
        const stage = patient.stage ?? 0;
        
        switch (stage) {
            case 0:
                return 'Document Processing';
            case 1:
                return 'Auto Contouring';
            case 2:
                return 'Treatment Planning';
            case 3:
                return 'Completed';
            default:
                return 'Document Processing';
        }
    };

    const getStageIcon = (patient: Patient) => {
        const stage = patient.stage ?? 0;
        
        switch (stage) {
            case 0:
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 1:
                return <Target className="h-5 w-5 text-purple-500" />;
            case 2:
                return <Zap className="h-5 w-5 text-indigo-500" />;
            case 3:
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            default:
                return <FileText className="h-5 w-5 text-blue-500" />;
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

    const getStatusBadgeVariant = (status: number): "default" | "destructive" | "outline" | "secondary" => {
        switch (status) {
            case 0: return 'outline';    // Not Started - Outline
            case 1: return 'default';    // In Progress - Default (Blue/Primary)
            case 2: return 'secondary';  // Completed - Secondary (Greenish)
            case 3: return 'default';    // Awaiting Review - Default (Yellowish - handled by custom color below)
            case -1: return 'destructive'; // Error - Destructive (Red)
            default: return 'outline';
        }
    };
    
    const getStatusBadgeColorClass = (status: number): string => {
         switch (status) {
            case 1: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700';
            case 2: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700';
            case 3: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
            default: return ''; // Let default variant styles apply
         }
    };

    const getStageBadgeVariant = (stage: number | undefined): "default" | "secondary" | "outline" => {
         switch (stage) {
            case 0: return 'default'; // Blueish
            case 1: return 'secondary'; // Purplish
            case 2: return 'default'; // Indigoish - needs custom color
            case 3: return 'outline'; // Greyish/Completed
            default: return 'outline';
        }
    };
    
    const getStageBadgeColorClass = (stage: number | undefined): string => {
         switch (stage) {
            case 0: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700';
            case 1: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700';
            case 2: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700';
            default: return ''; // Let default variant styles apply for Completed/Unknown
         }
    };

    const getStatusIcon = (status: number) => {
        switch (status) {
            case 0: return <Clock className="h-5 w-5 text-gray-500" />;
            case 1: return <Play className="h-5 w-5 text-yellow-500" />;
            case 2: return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 3: return <AlertCircle className="h-5 w-5 text-orange-500" />;
            case -1: return <AlertCircle className="h-5 w-5 text-red-500" />;
            default: return <Clock className="h-5 w-5 text-gray-500" />;
        }
    };

    const getCurrentStageStatus = (patient: Patient): number => {
        // Use the status directly - it represents the status of the current stage
        return patient.status ?? 0;
    };

    const filteredAndSortedPatients = useMemo(() => {
        let filteredItems = [...patients];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(patient => {
                return (
                    patient.patient_id.toString().toLowerCase().includes(lowerCaseSearchTerm) ||
                    patient.first_name.toLowerCase().includes(lowerCaseSearchTerm) ||
                    patient.last_name.toLowerCase().includes(lowerCaseSearchTerm)
                );
            });
        }

        if (sortConfig.key !== null) {
            filteredItems.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'stageText') {
                    aValue = getStageText(a);
                    bValue = getStageText(b);
                } else if (sortConfig.key === 'statusText') {
                    aValue = getStatusText(getCurrentStageStatus(a));
                    bValue = getStatusText(getCurrentStageStatus(b));
                } else {
                    aValue = a[sortConfig.key as keyof Patient];
                    bValue = b[sortConfig.key as keyof Patient];
                }
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filteredItems;
    }, [patients, sortConfig, searchTerm]);

    const requestSort = (key: keyof Patient | 'stageText' | 'statusText') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Patient | 'stageText' | 'statusText') => {
        if (sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        }
        return sortConfig.direction === 'ascending' ? 
            <ArrowUpDown className="ml-2 h-4 w-4 transform rotate-180" /> : 
            <ArrowUpDown className="ml-2 h-4 w-4" />;
    };

    const handleViewStatus = async (patient: Patient) => {
        try {
            // First, set the selected patient with existing data
            setSelectedPatient(patient);
            
            // Then fetch the latest progress data
            const progressData = await api.getPatientProgress(patient.patient_id);
            
            // Update the selected patient with the progress data
            setSelectedPatient(prevPatient => {
                if (prevPatient) {
                    // Create updated patient object with fresh workflow data
                    return {
                        ...prevPatient,
                        document: progressData.document,
                        contour: progressData.contour,
                        planning: progressData.planning,
                        stage: progressData.stage,
                        status: progressData.status
                    };
                }
                return prevPatient;
            });
        } catch (error) {
            console.error("Error fetching patient progress:", error);
            // If there's an error, we'll still use the existing data
        }
        
        setIsStatusDialogOpen(true);
    };

    const getWorkflowStatuses = (patient: Patient): { name: string; status: number; statusText: string; badgeVariant: "default" | "destructive" | "outline" | "secondary"; badgeClass: string; }[] => {
        const statuses = [
            { name: 'Document Processing', code: patient.document || 0 },
            { name: 'Contouring', code: patient.contour || 0 },
            { name: 'Treatment Planning', code: patient.planning || 0 }
        ];

        return statuses.map(s => ({
            name: s.name,
            status: s.code,
            statusText: getStatusText(s.code),
            badgeVariant: getStatusBadgeVariant(s.code),
            badgeClass: getStatusBadgeColorClass(s.code)
        }));
    };

    const handleStartTask = (workflowName: string) => {
        if (!selectedPatient) return;
        
        // Navigate to the appropriate page based on the workflow
        switch (workflowName) {
            case 'Document Processing':
                navigate('/patient-list-s', { 
                    state: { 
                        firstName: selectedPatient.first_name, 
                        lastName: selectedPatient.last_name, 
                        patientId: selectedPatient.patient_id 
                    } 
                });
                break;
            case 'Contouring':
                navigate('/auto-contouring-agent');
                break;
            case 'Treatment Planning':
                navigate('/treatment-planning-agent');
                break;
        }
        
        setIsStatusDialogOpen(false);
    };

    const handleViewResults = (workflowName: string, patientId?: string | number, orthanic_id?: string) => {
        if (!selectedPatient) return;
        
        // If no patientId is provided, use the selectedPatient's ID
        const id = patientId || selectedPatient.patient_id;
        
        switch (workflowName) {
          case 'Document Processing':
              // Navigate to the pathology reports viewer
              navigate(`/pathology-reports/${id}`);
            break;
          case 'Contouring':
            // Check if status is Awaiting Review (3)
            if (selectedPatient.contour === 3) {
              // Redirect to Google for Awaiting Review status
              window.open(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/contouring/review/${orthanic_id}`, '_blank');
            } else {
              // Navigate to contouring results viewer (future implementation)
              navigate('/auto-contouring-agent');
            }
            break;
          case 'Treatment Planning':
            // Check if status is Awaiting Review (3)
            if (selectedPatient.planning === 3) {
              // Redirect to Google for Awaiting Review status
              window.open(`${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/planning/review/${orthanic_id}`, '_blank');
            } else {
              // Navigate to treatment planning results (future implementation)
              navigate('/treatment-planning-agent');
            }
            break;
          default:
            console.log(`Viewing results for ${workflowName} for patient ID: ${id}`);
        }
        
        setIsStatusDialogOpen(false);
    };

    return (
        <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/30 min-h-screen">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Patient Management</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">View, manage, and track patient workflow progress.</p>
                </div>
                <Button
                    onClick={() => navigate('/patients-new')}
                     className="bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md transition-all"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add New Patient
                </Button>
            </div>

            {/* Stats Row - Updated */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Total Patients */}
                <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
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
                 {/* Awaiting Review */}
                 <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Awaiting Review</p>
                            <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                                {loading ? <Skeleton className="h-8 w-12" /> : stats.awaitingReview}
                            </h3>
                        </div>
                        <div className="rounded-full p-3 bg-yellow-100 dark:bg-yellow-900/50">
                            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </CardContent>
                </Card>
                {/* Workflow Errors */}
                 <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Workflow Errors</p>
                            <h3 className="text-3xl font-bold text-red-600 dark:text-red-500">
                                {loading ? <Skeleton className="h-8 w-12" /> : stats.workflowErrors}
                            </h3>
                        </div>
                        <div className="rounded-full p-3 bg-red-100 dark:bg-red-900/50">
                            <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                    </CardContent>
                </Card>
                 {/* Active Workflows */}
                 <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active Workflows</p>
                            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {loading ? <Skeleton className="h-8 w-12" /> : stats.activeWorkflows}
                            </h3>
                        </div>
                        <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/50">
                            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table Controls (Search) & Patients List Table */}
            <Card className="bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden">
                 <CardHeader className="border-b dark:border-gray-700 p-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Search by ID, name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {error ? (
                        <p className="p-6 text-center text-red-500">Error: {error}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                        {/* Add onClick for sorting */} 
                                        <TableHead className="w-[80px] cursor-pointer" onClick={() => requestSort('patient_id')}>
                                            <div className="flex items-center">ID {getSortIcon('patient_id')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('first_name')}>
                                             <div className="flex items-center">First Name {getSortIcon('first_name')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('last_name')}>
                                             <div className="flex items-center">Last Name {getSortIcon('last_name')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('birth_date')}>
                                             <div className="flex items-center">Birth Date {getSortIcon('birth_date')}</div>
                                        </TableHead>
                                        <TableHead>Sex</TableHead> 
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('stageText')}>
                                             <div className="flex items-center">Current Stage {getSortIcon('stageText')}</div>
                                         </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('statusText')}>
                                            <div className="flex items-center">Status {getSortIcon('statusText')}</div>
                                        </TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {loading ? (
                                        [...Array(8)].map((_, i) => <PatientRowSkeleton key={i} />)
                                    ) : filteredAndSortedPatients.length > 0 ? (
                                        filteredAndSortedPatients.map(patient => {
                                            const currentStageStatus = getCurrentStageStatus(patient);
                                            const stage = patient.stage ?? 0;
                                            
                                            return (
                                                <TableRow 
                                                    key={patient.patient_id} 
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                                                >
                                                    <TableCell className="font-medium text-center">{patient.patient_id}</TableCell>
                                                    <TableCell>{patient.first_name}</TableCell>
                                                    <TableCell>{patient.last_name}</TableCell>
                                                    <TableCell className="text-center">
                                                        {new Date(patient.birth_date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-center">{patient.sex}</TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            variant={getStageBadgeVariant(stage)}
                                                            className={getStageBadgeColorClass(stage)}
                                                        >
                                                            {getStageText(patient)}
                                                         </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                         <Badge 
                                                             variant={getStatusBadgeVariant(currentStageStatus)}
                                                             className={getStatusBadgeColorClass(currentStageStatus)}
                                                         >
                                                            {getStatusText(currentStageStatus)}
                                                         </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handleViewStatus(patient)}
                                                            className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                                        >
                                                            <Play className="h-4 w-4 mr-1" /> Workflow
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                {searchTerm ? `No patients found matching "${searchTerm}".` : "No patients found. Use the button above to add one."} 
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Patient Status Dialog - Overhauled */}
            {selectedPatient && (
                <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                    {/* Increased max width for better layout */}
                    <DialogContent className="sm:max-w-md md:max-w-lg bg-white dark:bg-gray-800">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white">Patient Workflow: {selectedPatient.first_name} {selectedPatient.last_name}</DialogTitle>
                            <DialogDescription>
                                Patient ID: {selectedPatient.patient_id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 grid gap-4">
                            {/* Map through workflow statuses */}
                             {getWorkflowStatuses(selectedPatient).map((workflow, index) => (
                                <div key={index} className="grid grid-cols-3 items-center gap-4 p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    {/* Workflow Name & Icon */}
                                    <div className="col-span-1 flex items-center">
                                        {/* Use stage icons based on name/index ? Or keep status icon? Let's use status icon for now */} 
                                        <div className={`p-1.5 rounded-full mr-2 ${workflow.badgeClass} border`}> 
                                            {getStatusIcon(workflow.status)} 
                                         </div>
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{workflow.name}</span>
                                    </div>
                                    
                                     {/* Status Badge */}
                                    <div className="col-span-1 text-center">
                                        <Badge 
                                             variant={workflow.badgeVariant}
                                             className={`${workflow.badgeClass} text-xs px-2.5 py-0.5`}
                                        >
                                            {workflow.statusText}
                                        </Badge>
                                    </div>

                                    {/* Action Button(s) */}
                                    <div className="col-span-1 flex justify-end">
                                         {/* Action buttons based on status */}
                                         {workflow.status === 0 && (
                                            <Button size="sm" variant="outline" onClick={() => handleStartTask(workflow.name)}>
                                                <Play className="h-3 w-3 mr-1"/> Start
                                            </Button>
                                        )}
                                        {workflow.status === 1 && (
                                            <Button size="sm" variant="outline" onClick={() => handleStartTask(workflow.name)}>
                                                <Play className="h-3 w-3 mr-1"/> Continue
                                            </Button>
                                        )}
                                        {workflow.status === 2 && (
                                            <Button size="sm" variant="outline" onClick={() => handleViewResults(workflow.name, selectedPatient?.patient_id)}>
                                                <CheckCircle className="h-3 w-3 mr-1"/> View
                                            </Button>
                                        )}
                                        {workflow.status === 3 && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                                                onClick={() => handleViewResults(workflow.name, selectedPatient?.patient_id, selectedPatient?.orthanic_id)}
                                            >
                                                <AlertCircle className="h-3 w-3 mr-1"/> Review
                                            </Button>
                                        )}
                                        {workflow.status === -1 && (
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => handleStartTask(workflow.name)}
                                            >
                                                <TriangleAlert className="h-3 w-3 mr-1"/> Retry
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                         {/* Use DialogFooter for the close button */}
                        <DialogFooter className="mt-4">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsStatusDialogOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

// --- Skeleton Component --- 

const PatientRowSkeleton: React.FC = () => (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <TableCell className="font-medium text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
        <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
    </TableRow>
);

export default PatientsPage;