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
  Button
} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Calendar,
  Clock,
  Download,
  Eye,
  Filter,
  ArrowUpDown,
  Search,
  FileText,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
interface Task {
  id: string;
  name: string;
  patient: string;
  patientId: string;
  type: TaskType;
  completedDate: string;
  createdDate: string;
  completedBy: string;
  duration: string; // e.g. "2h 15m"
  accuracy: number; // e.g. 95 (percent)
  hasReport: boolean;
}

const mockTasks: Task[] = [
  {
    id: 'task-001',
    name: 'Brain Tumor Treatment Plan',
    patient: 'John Doe',
    patientId: 'PT-1234',
    type: 'planning',
    completedDate: '2025-03-20',
    createdDate: '2025-03-18',
    completedBy: 'Dr. Smith',
    duration: '3h 45m',
    accuracy: 98,
    hasReport: true
  },
  {
    id: 'task-002',
    name: 'Prostate Contour',
    patient: 'Robert Johnson',
    patientId: 'PT-5678',
    type: 'contour',
    completedDate: '2025-03-19',
    createdDate: '2025-03-17',
    completedBy: 'Dr. Brown',
    duration: '2h 30m',
    accuracy: 95,
    hasReport: true
  },
  {
    id: 'task-003',
    name: 'Pathology Report Review',
    patient: 'Mary Williams',
    patientId: 'PT-9101',
    type: 'document',
    completedDate: '2025-03-18',
    createdDate: '2025-03-17',
    completedBy: 'Dr. Jones',
    duration: '1h 15m',
    accuracy: 99,
    hasReport: true
  },
  {
    id: 'task-004',
    name: 'Breast Cancer Contour',
    patient: 'Jane Smith',
    patientId: 'PT-1122',
    type: 'contour',
    completedDate: '2025-03-17',
    createdDate: '2025-03-15',
    completedBy: 'Dr. Smith',
    duration: '4h 00m',
    accuracy: 97,
    hasReport: true
  },
  {
    id: 'task-005',
    name: 'Lung Scan Analysis',
    patient: 'James Wilson',
    patientId: 'PT-3344',
    type: 'document',
    completedDate: '2025-03-16',
    createdDate: '2025-03-16',
    completedBy: 'Dr. Johnson',
    duration: '0h 45m',
    accuracy: 100,
    hasReport: true
  },
  {
    id: 'task-006',
    name: 'Cervical Cancer Treatment Plan',
    patient: 'Sarah Davis',
    patientId: 'PT-5566',
    type: 'planning',
    completedDate: '2025-03-15',
    createdDate: '2025-03-13',
    completedBy: 'Dr. Miller',
    duration: '5h 20m',
    accuracy: 96,
    hasReport: true
  },
  {
    id: 'task-007',
    name: 'Thyroid Cancer Staging',
    patient: 'Michael Brown',
    patientId: 'PT-7788',
    type: 'document',
    completedDate: '2025-03-14',
    createdDate: '2025-03-13',
    completedBy: 'Dr. Taylor',
    duration: '2h 05m',
    accuracy: 98,
    hasReport: true
  },
  {
    id: 'task-008',
    name: 'Pancreatic Tumor Contouring',
    patient: 'Elizabeth Wilson',
    patientId: 'PT-9900',
    type: 'contour',
    completedDate: '2025-03-13',
    createdDate: '2025-03-11',
    completedBy: 'Dr. Davis',
    duration: '6h 30m',
    accuracy: 94,
    hasReport: true
  }
];

// Summary statistics calculation
const getSummaryStats = (tasks: Task[]) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  return {
    total: tasks.length,
    completedToday: tasks.filter(t => t.completedDate === today).length,
    completedYesterday: tasks.filter(t => t.completedDate === yesterday).length,
    avgAccuracy: Math.round(tasks.reduce((acc, t) => acc + t.accuracy, 0) / tasks.length),
    documentTasks: tasks.filter(t => t.type === 'document').length,
    contourTasks: tasks.filter(t => t.type === 'contour').length,
    planningTasks: tasks.filter(t => t.type === 'planning').length
  };
};

const CompletedTasksPage: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showReport, setShowReport] = useState(false);
  
  // For a static demo, we'll use the mock data directly
  const tasks = mockTasks;
  const stats = getSummaryStats(tasks);
  
  const handleViewReport = (task: Task) => {
    setSelectedTask(task);
    setShowReport(true);
  };
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Completed Tasks</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            Review and analyze successfully completed treatment and analysis tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Accuracy</p>
                <p className="text-2xl font-bold">{stats.avgAccuracy}%</p>
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

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Search completed tasks..." 
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
          <span className="text-sm text-gray-500 dark:text-gray-400">Time:</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-blue-600"
          >
            All Time
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            This Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            This Month
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
          <CardDescription>
            All tasks that have been successfully completed and are ready for review.
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
                <TableHead>Completed</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Completed By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-xs text-gray-500">Created: {new Date(task.createdDate).toLocaleDateString()}</div>
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
                      <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      <span>{new Date(task.completedDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      <span>{task.duration}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-full mr-2">
                      <Progress 
                        value={task.accuracy} 
                        className={cn(
                            "h-2",
                            task.accuracy > 95 ? "bg-green-500" : 
                            task.accuracy > 90 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        />
                      </div>
                      <span className="text-sm font-medium">{task.accuracy}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.completedBy}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewReport(task)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Dialog */}
      {selectedTask && (
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Task Completion Report</DialogTitle>
              <DialogDescription>
                {selectedTask.name} - {selectedTask.patient} ({selectedTask.patientId})
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {/* Task Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Type</div>
                  <div className="font-medium flex items-center mt-1">
                    {taskTypeIcons[selectedTask.type]}
                    <span className="ml-1 capitalize">{selectedTask.type}</span>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
                  <div className="font-medium mt-1">{new Date(selectedTask.completedDate).toLocaleDateString()}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Duration</div>
                  <div className="font-medium mt-1">{selectedTask.duration}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Accuracy</div>
                  <div className="font-medium mt-1">{selectedTask.accuracy}%</div>
                </div>
              </div>
              
              {/* Report Content - This would be dynamic in production */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-medium">Task Summary</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  This {selectedTask.type} task was completed on {new Date(selectedTask.completedDate).toLocaleDateString()} by {selectedTask.completedBy}. 
                  The process took {selectedTask.duration} to complete and achieved an accuracy of {selectedTask.accuracy}%.
                </p>
                
                <h3 className="text-lg font-medium mt-4">Key Results</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>AI-assisted processing completed with {selectedTask.accuracy}% accuracy</li>
                  <li>Processing time was {selectedTask.duration}</li>
                  <li>No critical errors were detected during the process</li>
                  <li>Results were validated and approved by {selectedTask.completedBy}</li>
                </ul>
                
                <h3 className="text-lg font-medium mt-4">Next Steps</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {selectedTask.type === 'document' && 'The processed document is ready for clinical use and has been added to the patient record.'}
                  {selectedTask.type === 'contour' && 'The generated contours are ready for review in the treatment planning system.'}
                  {selectedTask.type === 'planning' && 'The treatment plan is ready for review and approval by the medical team.'}
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReport(false)}>
                  Close
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CompletedTasksPage;