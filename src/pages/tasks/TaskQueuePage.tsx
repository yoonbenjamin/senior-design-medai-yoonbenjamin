import React, { useState } from 'react';
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
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Clock,
  Calendar,
  Play,
  Pause,
  ArrowUpDown,
  FileText,
  Target,
  Zap,
  Search,
  Filter,
  User,
  AlertCircle,
  Timer,
  Trash2,
  Edit,
  Workflow
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Define priority types and colors
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

// Mock tasks data
interface QueuedTask {
  id: string;
  name: string;
  patient: string;
  patientId: string;
  type: TaskType;
  priority: Priority;
  createdAt: string;
  estimatedDuration: string;
  scheduledFor: string;
  assignedTo: string | null;
  dependencies: string[];
  status: 'queued' | 'scheduled';
}

const mockTasks: QueuedTask[] = [
  {
    id: 'task-001',
    name: 'Brain Tumor Treatment Planning',
    patient: 'John Doe',
    patientId: 'PT-1234',
    type: 'planning',
    priority: 'high',
    createdAt: '2025-03-21',
    estimatedDuration: '4h',
    scheduledFor: '2025-03-23',
    assignedTo: 'Dr. Smith',
    dependencies: ['task-002'],
    status: 'scheduled'
  },
  {
    id: 'task-002',
    name: 'Brain Contour Generation',
    patient: 'John Doe',
    patientId: 'PT-1234',
    type: 'contour',
    priority: 'high',
    createdAt: '2025-03-21',
    estimatedDuration: '2h',
    scheduledFor: '2025-03-22',
    assignedTo: 'Dr. Johnson',
    dependencies: ['task-003'],
    status: 'scheduled'
  },
  {
    id: 'task-003',
    name: 'Brain CT Analysis',
    patient: 'John Doe',
    patientId: 'PT-1234',
    type: 'document',
    priority: 'high',
    createdAt: '2025-03-20',
    estimatedDuration: '1h',
    scheduledFor: '2025-03-22',
    assignedTo: 'Dr. Williams',
    dependencies: [],
    status: 'scheduled'
  },
  {
    id: 'task-004',
    name: 'Prostate Contour Generation',
    patient: 'Robert Johnson',
    patientId: 'PT-5678',
    type: 'contour',
    priority: 'medium',
    createdAt: '2025-03-21',
    estimatedDuration: '3h',
    scheduledFor: '',
    assignedTo: null,
    dependencies: [],
    status: 'queued'
  },
  {
    id: 'task-005',
    name: 'Lung Cancer Pathology Analysis',
    patient: 'Mary Williams',
    patientId: 'PT-9101',
    type: 'document',
    priority: 'medium',
    createdAt: '2025-03-20',
    estimatedDuration: '1h',
    scheduledFor: '',
    assignedTo: null,
    dependencies: [],
    status: 'queued'
  },
  {
    id: 'task-006',
    name: 'Breast Cancer Treatment Planning',
    patient: 'Jane Smith',
    patientId: 'PT-1122',
    type: 'planning',
    priority: 'low',
    createdAt: '2025-03-19',
    estimatedDuration: '5h',
    scheduledFor: '',
    assignedTo: null,
    dependencies: [],
    status: 'queued'
  },
  {
    id: 'task-007',
    name: 'Cervical Cancer Contour Review',
    patient: 'Sarah Davis',
    patientId: 'PT-5566',
    type: 'contour',
    priority: 'low',
    createdAt: '2025-03-18',
    estimatedDuration: '2h',
    scheduledFor: '',
    assignedTo: null,
    dependencies: [],
    status: 'queued'
  }
];

// Staff members for assignment
const mockStaff = [
  { id: 'staff-001', name: 'Dr. Smith', specialty: 'Radiation Oncology' },
  { id: 'staff-002', name: 'Dr. Johnson', specialty: 'Medical Physics' },
  { id: 'staff-003', name: 'Dr. Williams', specialty: 'Radiology' },
  { id: 'staff-004', name: 'Dr. Brown', specialty: 'Radiation Oncology' },
  { id: 'staff-005', name: 'Dr. Davis', specialty: 'Medical Physics' },
  { id: 'staff-006', name: 'Dr. Miller', specialty: 'Pathology' },
  { id: 'staff-007', name: 'Dr. Wilson', specialty: 'Radiology' }
];

// Summary statistics calculation
const getQueueStats = (tasks: QueuedTask[]) => {
  return {
    total: tasks.length,
    queued: tasks.filter(t => t.status === 'queued').length,
    scheduled: tasks.filter(t => t.status === 'scheduled').length,
    highPriority: tasks.filter(t => t.priority === 'high').length,
    documentTasks: tasks.filter(t => t.type === 'document').length,
    contourTasks: tasks.filter(t => t.type === 'contour').length,
    planningTasks: tasks.filter(t => t.type === 'planning').length,
  };
};

const TaskQueuePage: React.FC = () => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // For a static demo, we'll use the mock data directly
  const tasks = mockTasks;
  const stats = getQueueStats(tasks);
  
  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(task => task.id));
    }
  };
  
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    if (activeTab === 'queued') return task.status === 'queued';
    if (activeTab === 'scheduled') return task.status === 'scheduled';
    return true;
  });
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Task Queue</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            Manage and assign upcoming tasks for patients.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            disabled={selectedTasks.length === 0}
            className="hidden sm:flex items-center"
          >
            <User className="mr-2 h-4 w-4" />
            Assign
          </Button>
          <Button 
            variant="outline" 
            disabled={selectedTasks.length === 0}
            className="hidden sm:flex items-center"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Play className="mr-2 h-4 w-4" />
            Start Next Task
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <Card className="col-span-1">
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
        
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-yellow-100 dark:bg-yellow-900">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
                <p className="text-2xl font-bold">{stats.queued}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-green-100 dark:bg-green-900">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 xl:col-span-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">Tasks By Type</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total: {stats.total}</div>
            </div>
            <div className="mt-3 flex items-center space-x-4">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-blue-500 mr-1"></div>
                <span className="text-sm">Document ({stats.documentTasks})</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-purple-500 mr-1"></div>
                <span className="text-sm">Contour ({stats.contourTasks})</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-indigo-500 mr-1"></div>
                <span className="text-sm">Planning ({stats.planningTasks})</span>
              </div>
            </div>
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div 
                className="flex-none bg-blue-500" 
                style={{ width: `${(stats.documentTasks / stats.total) * 100}%` }} 
              />
              <div 
                className="flex-none bg-purple-500" 
                style={{ width: `${(stats.contourTasks / stats.total) * 100}%` }} 
              />
              <div 
                className="flex-none bg-indigo-500" 
                style={{ width: `${(stats.planningTasks / stats.total) * 100}%` }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Queue Tabs and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Task Queue Management</CardTitle>
          <CardDescription>
            View, schedule, and assign upcoming tasks for processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All Tasks ({stats.total})</TabsTrigger>
                <TabsTrigger value="queued">Queued ({stats.queued})</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled ({stats.scheduled})</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    placeholder="Search..." 
                    className="pl-9 max-w-xs h-9"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="h-9">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sort
                </Button>
              </div>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => handleSelectTask(task.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{task.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{task.name}</div>
                        <div className="text-xs text-gray-500">Created: {new Date(task.createdAt).toLocaleDateString()}</div>
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
                        <span className={cn("font-medium", priorityColors[task.priority])}>
                          {task.priority.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Timer className="h-3.5 w-3.5 mr-1 text-gray-500" />
                          <span>{task.estimatedDuration}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium inline-block text-center",
                          task.status === 'scheduled' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          {task.status === 'scheduled' 
                            ? `Scheduled for ${new Date(task.scheduledFor).toLocaleDateString()}` 
                            : 'Waiting for assignment'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assignedTo 
                          ? <div className="flex items-center">
                              <User className="h-3.5 w-3.5 mr-1 text-gray-500" />
                              <span>{task.assignedTo}</span>
                            </div>
                          : <Select>
                              <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue placeholder="Assign staff..." />
                              </SelectTrigger>
                              <SelectContent>
                                {mockStaff.map(staff => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {task.status === 'queued' ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Calendar className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Play className="h-4 w-4 text-green-500" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Pause className="h-4 w-4 text-yellow-500" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="queued" className="mt-0">
              {/* Same table structure but with filtered data for queued tasks */}
              <Table>
                {/* Table content for queued tasks */}
              </Table>
            </TabsContent>
            
            <TabsContent value="scheduled" className="mt-0">
              {/* Same table structure but with filtered data for scheduled tasks */}
              <Table>
                {/* Table content for scheduled tasks */}
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Task Dependencies Visualization - Static for demo */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Dependencies</CardTitle>
          <CardDescription>
            Visualize task relationships and clinical workflow sequence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <Workflow className="h-12 w-12 text-blue-500 mb-3" />
            <h3 className="text-lg font-medium mb-1">Workflow Visualization</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-xl mb-6">
              This visualization shows interdependencies between tasks for patient treatment workflows.
            </p>
            
            {/* Static workflow visualization for demo purposes */}
            <div className="relative w-full max-w-3xl">
              {/* Task nodes */}
              <div className="flex justify-between mb-16 relative">
                {/* Document analysis node */}
                <div className="w-64 p-4 rounded-lg bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 shadow-md relative">
                  <div className="flex items-center mb-2">
                    {taskTypeIcons.document}
                    <span className="ml-2 font-medium">Brain CT Analysis</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Patient: John Doe</div>
                  <div className="text-xs text-gray-500 mt-1">Assigned to Dr. Williams</div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 rounded-full bg-blue-500 text-white text-xs px-2 py-1">
                    Step 1
                  </div>
                </div>
                
                {/* Contour generation node */}
                <div className="w-64 p-4 rounded-lg bg-purple-100 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 shadow-md relative">
                  <div className="flex items-center mb-2">
                    {taskTypeIcons.contour}
                    <span className="ml-2 font-medium">Brain Contour Generation</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Patient: John Doe</div>
                  <div className="text-xs text-gray-500 mt-1">Assigned to Dr. Johnson</div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 rounded-full bg-purple-500 text-white text-xs px-2 py-1">
                    Step 2
                  </div>
                </div>
                
                {/* Treatment planning node */}
                <div className="w-64 p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 shadow-md relative">
                  <div className="flex items-center mb-2">
                    {taskTypeIcons.planning}
                    <span className="ml-2 font-medium">Treatment Planning</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Patient: John Doe</div>
                  <div className="text-xs text-gray-500 mt-1">Assigned to Dr. Smith</div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 rounded-full bg-indigo-500 text-white text-xs px-2 py-1">
                    Step 3
                  </div>
                </div>
              </div>
              
              {/* Connector lines */}
              <div className="absolute top-[50px] left-[100px] w-[calc(100%-200px)] h-0 border-t-2 border-dashed border-gray-400 dark:border-gray-600">
                {/* Left arrow */}
                <div className="absolute right-0 top-0 transform -translate-y-1/2 w-3 h-3 border-t-2 border-r-2 border-gray-400 dark:border-gray-600 rotate-45"></div>
              </div>
              
              {/* Timeline at bottom */}
              <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full relative mt-8">
                <div className="absolute top-0 left-0 h-full w-1/3 bg-green-500 rounded-l-full flex items-center justify-center text-white text-sm font-medium">
                  Completed
                </div>
                <div className="absolute top-0 left-1/3 h-full w-1/3 bg-yellow-500 flex items-center justify-center text-white text-sm font-medium">
                  In Progress
                </div>
                <div className="absolute top-0 right-0 h-full w-1/3 bg-gray-400 dark:bg-gray-600 rounded-r-full flex items-center justify-center text-white text-sm font-medium">
                  Pending
                </div>
                
                {/* Timeline markers */}
                <div className="absolute -top-6 left-[16.5%] text-xs text-gray-500">Mar 22</div>
                <div className="absolute -top-6 left-[50%] text-xs text-gray-500">Mar 23</div>
                <div className="absolute -top-6 left-[83%] text-xs text-gray-500">Mar 24</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Batch Actions for Selected Tasks */}
      {selectedTasks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 z-10">
          <span className="text-sm font-medium">{selectedTasks.length} tasks selected</span>
          <div className="h-6 border-r border-gray-600"></div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700">
              <User className="mr-2 h-4 w-4" />
              Assign
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700">
              <Play className="mr-2 h-4 w-4" />
              Start
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskQueuePage;