import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Button,
  buttonVariants,
} from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Play, 
  Pause, 
  RefreshCw, 
  Calendar,
  ExternalLink,
  Target,
  Zap,
  Filter,
  ArrowUpDown,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Define task priority types and colors
type Priority = 'high' | 'medium' | 'low';

const priorityColors: Record<Priority, string> = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-green-500'
};

// Define task types and icons
type TaskType = 'document' | 'contour' | 'planning';

const taskTypeIcons: Record<TaskType, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  contour: <Target className="h-4 w-4" />,
  planning: <Zap className="h-4 w-4" />
};

const taskTypeColors: Record<TaskType, string> = {
  document: 'bg-blue-100 text-blue-600',
  contour: 'bg-purple-100 text-purple-600',
  planning: 'bg-indigo-100 text-indigo-600'
};

// Define task status types and icons
type Status = 'in-progress' | 'paused' | 'queued' | 'needs-attention';

const statusIcons: Record<Status, React.ReactNode> = {
  'in-progress': <Play className="h-4 w-4 text-green-500" />,
  'paused': <Pause className="h-4 w-4 text-yellow-500" />,
  'queued': <Clock className="h-4 w-4 text-blue-500" />,
  'needs-attention': <AlertCircle className="h-4 w-4 text-red-500" />
};

// Mock tasks data
interface Task {
  id: string;
  name: string;
  patient: string;
  patientId: string;
  type: TaskType;
  status: Status;
  progress: number;
  priority: Priority;
  dueDate: string;
  createdAt: string;
  assignedTo: string;
}

const mockTasks: Task[] = [
  {
    id: 'task-001',
    name: 'Brain Tumor Treatment Planning',
    patient: 'John Doe',
    patientId: 'PT-1234',
    type: 'planning',
    status: 'in-progress',
    progress: 65,
    priority: 'high',
    dueDate: '2025-03-24',
    createdAt: '2025-03-20',
    assignedTo: 'Dr. Smith'
  },
  {
    id: 'task-002',
    name: 'Prostate Contour Generation',
    patient: 'Robert Johnson',
    patientId: 'PT-5678',
    type: 'contour',
    status: 'needs-attention',
    progress: 42,
    priority: 'high',
    dueDate: '2025-03-23',
    createdAt: '2025-03-19',
    assignedTo: 'Dr. Brown'
  },
  {
    id: 'task-003',
    name: 'Pathology Report Analysis',
    patient: 'Mary Williams',
    patientId: 'PT-9101',
    type: 'document',
    status: 'in-progress',
    progress: 90,
    priority: 'medium',
    dueDate: '2025-03-25',
    createdAt: '2025-03-21',
    assignedTo: 'Dr. Jones'
  },
  {
    id: 'task-004',
    name: 'Breast Cancer Contour Review',
    patient: 'Jane Smith',
    patientId: 'PT-1122',
    type: 'contour',
    status: 'paused',
    progress: 55,
    priority: 'medium',
    dueDate: '2025-03-26',
    createdAt: '2025-03-20',
    assignedTo: 'Dr. Smith'
  },
  {
    id: 'task-005',
    name: 'Lung Scan Analysis',
    patient: 'James Wilson',
    patientId: 'PT-3344',
    type: 'document',
    status: 'queued',
    progress: 0,
    priority: 'low',
    dueDate: '2025-03-28',
    createdAt: '2025-03-21',
    assignedTo: 'Dr. Johnson'
  },
  {
    id: 'task-006',
    name: 'Cervical Cancer Treatment Plan',
    patient: 'Sarah Davis',
    patientId: 'PT-5566',
    type: 'planning',
    status: 'in-progress',
    progress: 35,
    priority: 'high',
    dueDate: '2025-03-24',
    createdAt: '2025-03-20',
    assignedTo: 'Dr. Miller'
  },
];

// Summary statistics calculation
const getSummaryStats = (tasks: Task[]) => {
  return {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    needsAttention: tasks.filter(t => t.status === 'needs-attention').length,
    highPriority: tasks.filter(t => t.priority === 'high').length,
    averageCompletion: Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length)
  };
};

const ActiveTasksPage: React.FC = () => {
  // For a static demo, we'll use the mock data directly
  const tasks = mockTasks;
  const stats = getSummaryStats(tasks);
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Active Tasks</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            View and manage all currently active treatment and analysis tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Play className="mr-2 h-4 w-4" />
            Start New Task
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-green-100 dark:bg-green-900">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-red-100 dark:bg-red-900">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Needs Attention</p>
                <p className="text-2xl font-bold">{stats.needsAttention}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-yellow-100 dark:bg-yellow-900">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900">
                <RefreshCw className="h-5 w-5 text-purple-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Completion</p>
                <p className="text-2xl font-bold">{stats.averageCompletion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Search tasks by name, patient, or ID..." 
            className="pl-9 bg-white dark:bg-gray-800"
          />
        </div>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button variant="outline" className="sm:w-auto">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Sort
        </Button>
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-blue-600"
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            High Priority
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            Due Today
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>
            All tasks currently in the system that require action or are in progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-sm text-gray-500">Assigned to: {task.assignedTo}</div>
                  </TableCell>
                  <TableCell>
                    <div>{task.patient}</div>
                    <div className="text-xs text-gray-500">{task.patientId}</div>
                  </TableCell>
                  <TableCell>
                    <div className={cn("px-2 py-1 rounded-full inline-flex items-center text-xs font-medium", taskTypeColors[task.type])}>
                      {taskTypeIcons[task.type]}
                      <span className="ml-1 capitalize">{task.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {statusIcons[task.status]}
                      <span className="ml-1 capitalize">{task.status.replace('-', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-full">
                      <Progress value={task.progress} className="h-2" />
                      <div className="text-xs text-right mt-1">{task.progress}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-medium", priorityColors[task.priority])}>
                      {task.priority.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        {task.status === 'in-progress' 
                          ? <Pause className="h-4 w-4 text-yellow-500" /> 
                          : <Play className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveTasksPage;