import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  Brain,
  Target,
  Clipboard,
  Users,
  Timer,
  CheckCircle2,
  Clock,
  Server,
  Database,
  Gauge,
  Activity,
  TriangleAlert,
  Cpu,
  HardDrive,
  Workflow,
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

// Mock API call function (replace with actual API calls)
const fetchDashboardData = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500)); 
  // Return static data matching the new structure
  return {
    systemStatus: {
      overall: 'Online',
      api: 'Healthy',
      database: 'Connected',
      aiModels: 'Operational',
    },
    resourceUsage: {
      computeLoad: 78, // Percentage
      loadHistory: [
        { name: '10m ago', load: 65 },
        { name: '8m ago', load: 68 },
        { name: '6m ago', load: 72 },
        { name: '4m ago', load: 75 },
        { name: '2m ago', load: 76 },
        { name: 'Now', load: 78 },
      ],
      storageUsed: 100, // GB
      storageTotal: 500, // GB
    },
    aiPerformance: {
      overallAccuracy: 94.2,
      accuracyTrend: 0.1,
      avgConfidence: 88.5,
      performanceHistory: [
        { name: 'Mon', intake: 85, contour: 78, planning: 92 },
        { name: 'Tue', intake: 88, contour: 82, planning: 89 },
        { name: 'Wed', intake: 87, contour: 85, planning: 88 },
        { name: 'Thu', intake: 84, contour: 87, planning: 90 },
        { name: 'Fri', intake: 90, contour: 88, planning: 91 },
      ]
    },
    processingMetrics: {
      throughputToday: 2, // Patients
      avgProcessingTime: 12.3, // Minutes
      queueDepth: 15,
    },
    recentEvents: [
      { id: 1, timestamp: '2 mins ago', type: 'ModelUpdate', message: 'Contouring model v1.2 deployed.', level: 'info' },
      { id: 2, timestamp: '15 mins ago', type: 'HighLoad', message: 'System load reached 90%.', level: 'warning' },
      { id: 3, timestamp: '1 hour ago', type: 'Maintenance', message: 'Database maintenance completed.', level: 'info' },
    ],
  };
};

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // Handle error state, maybe show an error message
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'text-green-500 dark:text-green-400';
      case 'degraded':
      case 'unhealthy':
      case 'disconnected':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'offline':
      case 'error':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
     switch (status?.toLowerCase()) {
      case 'online':
      case 'healthy':
      case 'connected':
      case 'operational':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'degraded':
      case 'unhealthy':
      case 'disconnected':
        return <TriangleAlert className="h-5 w-5" />;
      case 'offline':
      case 'error':
        return <TriangleAlert className="h-5 w-5" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  }

  if (!loading && !dashboardData) {
    return <div className="p-6 text-center text-red-500">Failed to load dashboard data.</div>;
  }

  // Render complete skeleton layout if loading
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">System Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatusCardSkeleton />
          <StatusCardSkeleton />
          <StatusCardSkeleton />
          <StatusCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <ResourceCardSkeleton />
          <ResourceCardSkeleton isChart={false} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <AIPerformanceSkeleton />
          <ProcessingMetricsSkeleton />
          <Card className="lg:col-span-3 bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                <EventListItemSkeleton />
                <EventListItemSkeleton />
                <EventListItemSkeleton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Destructure data only when not loading and data is present
  const { systemStatus, resourceUsage, aiPerformance, processingMetrics, recentEvents } = dashboardData;
  const storagePercentage = resourceUsage.storageTotal > 0 ? (resourceUsage.storageUsed / resourceUsage.storageTotal) * 100 : 0;

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">System Dashboard</h1>

      {/* System Status At-a-Glance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <>
          <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Overall Status</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center ${getStatusColor(systemStatus.overall)}`}>
                {getStatusIcon(systemStatus.overall)}
                <span className="ml-2">{systemStatus.overall || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">API Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center ${getStatusColor(systemStatus.api)}`}>
                {getStatusIcon(systemStatus.api)}
                <span className="ml-2">{systemStatus.api || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center ${getStatusColor(systemStatus.database)}`}>
                {getStatusIcon(systemStatus.database)}
                <span className="ml-2">{systemStatus.database || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">AI Models</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center ${getStatusColor(systemStatus.aiModels)}`}>
                {getStatusIcon(systemStatus.aiModels)}
                <span className="ml-2">{systemStatus.aiModels || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
        </>
      </div>

      {/* Resource Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <>
          <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base font-semibold text-gray-700 dark:text-gray-200">
                <Cpu className="h-5 w-5 mr-2 text-blue-500" /> Compute Load
              </CardTitle>
              <CardDescription>{resourceUsage.computeLoad}% Current Utilization</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 pr-6 pb-4">
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={resourceUsage.loadHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ fontSize: '12px', padding: '4px 8px' }} />
                    <Area type="monotone" dataKey="load" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base font-semibold text-gray-700 dark:text-gray-200">
                <HardDrive className="h-5 w-5 mr-2 text-purple-500" /> Storage Usage
              </CardTitle>
              <CardDescription>{resourceUsage.storageUsed.toLocaleString()} GB used of {resourceUsage.storageTotal.toLocaleString()} GB</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-4 px-6">
              <Progress value={storagePercentage} className="h-3 [&>div]:bg-purple-500" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{(resourceUsage.storageTotal - resourceUsage.storageUsed).toLocaleString()} GB Free</span>
                <span>{storagePercentage.toFixed(1)}% Used</span>
              </div>
            </CardContent>
          </Card>
        </>
      </div>

      {/* AI Performance & Processing Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <>
          {/* AI Performance Section */}
          <Card className="lg:col-span-2 bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base font-semibold text-gray-700 dark:text-gray-200">
                <Brain className="h-5 w-5 mr-2 text-teal-500" /> AI Model Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Performance Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Overall Accuracy</span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-2xl font-bold text-gray-800 dark:text-white">{aiPerformance.overallAccuracy.toFixed(1)}%</span>
                  <p className={`text-xs ${aiPerformance.accuracyTrend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {aiPerformance.accuracyTrend >= 0 ? '+' : ''}{aiPerformance.accuracyTrend.toFixed(1)}% from yesterday
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Avg. Confidence</span>
                    <Gauge className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-2xl font-bold text-gray-800 dark:text-white">{aiPerformance.avgConfidence.toFixed(1)}%</span>
                  <p className="text-xs text-muted-foreground">
                    Based on recent tasks
                  </p>
                </div>
              </div>
              {/* Performance Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Performance Trend by Stage</h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={aiPerformance.performanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} domain={[70, 100]} /> {/* Adjust domain based on expected values */}
                      <Tooltip contentStyle={{ fontSize: '12px', padding: '4px 8px' }} />
                      <Line type="monotone" dataKey="intake" stroke="#2563eb" name="Intake" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="contour" stroke="#9333ea" name="Contour" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}/>
                      <Line type="monotone" dataKey="planning" stroke="#4f46e5" name="Planning" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Metrics Section */}
          <Card className="lg:col-span-1 bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base font-semibold text-gray-700 dark:text-gray-200">
                <Workflow className="h-5 w-5 mr-2 text-orange-500" /> Processing Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Throughput (Today)</span>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{processingMetrics.throughputToday}</p>
                  <span className="text-xs text-muted-foreground">Patients Processed</span>
                </div>
                <Users className="h-8 w-8 text-orange-400" />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Avg. Process Time</span>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{processingMetrics.avgProcessingTime} min</p>
                  <span className="text-xs text-muted-foreground">Per Patient</span>
                </div>
                <Timer className="h-8 w-8 text-orange-400" />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Current Queue</span>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{processingMetrics.queueDepth}</p>
                  <span className="text-xs text-muted-foreground">Tasks Waiting</span>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          {/* Recent System Events Section */}
          <Card className="lg:col-span-3 bg-white dark:bg-gray-800/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-base font-semibold text-gray-700 dark:text-gray-200">
                <Activity className="h-5 w-5 mr-2 text-gray-500" /> Recent System Events
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4">
              {recentEvents && recentEvents.length > 0 ? (
                <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {recentEvents.map((event: any) => {
                    let Icon = Activity;
                    let colorClass = 'text-gray-500 dark:text-gray-400';
                    let bgClass = 'bg-gray-100 dark:bg-gray-700';

                    switch (event.level) {
                      case 'info':
                        Icon = CheckCircle2;
                        colorClass = 'text-blue-500 dark:text-blue-400';
                        bgClass = 'bg-blue-50 dark:bg-blue-900/30';
                        break;
                      case 'warning':
                        Icon = TriangleAlert;
                        colorClass = 'text-yellow-600 dark:text-yellow-400';
                        bgClass = 'bg-yellow-50 dark:bg-yellow-900/30';
                        break;
                      case 'error':
                        Icon = TriangleAlert; // Or another specific error icon
                        colorClass = 'text-red-600 dark:text-red-400';
                        bgClass = 'bg-red-50 dark:bg-red-900/30';
                        break;
                    }

                    return (
                      <li key={event.id} className={`flex items-start p-3 rounded-lg ${bgClass}`}>
                        <div className={`flex-shrink-0 mt-0.5 mr-3 p-1 rounded-full ${colorClass}`}> 
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${colorClass}`}>{event.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{event.timestamp}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-4">No recent system events found.</p>
              )}
            </CardContent>
          </Card>
        </>
      </div>

    </div>
  );
};

// --- Skeleton Components ---

const StatusCardSkeleton: React.FC = () => (
  <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-7 w-1/2 mt-1" />
    </CardContent>
  </Card>
);

const ResourceCardSkeleton: React.FC<{isChart?: boolean}> = ({ isChart = true }) => (
  <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
    <CardHeader>
      <Skeleton className="h-5 w-1/3 mb-1" />
      <Skeleton className="h-4 w-2/3" />
    </CardHeader>
    <CardContent className={`${isChart ? 'pl-2 pr-6 pb-4' : 'pt-2 pb-4 px-6'}`}>
      {isChart ? (
        <Skeleton className="h-[100px] w-full" /> 
      ) : (
        <Skeleton className="h-3 w-full" />
      )}
    </CardContent>
  </Card>
);

const AIPerformanceSkeleton: React.FC = () => (
  <Card className="lg:col-span-2 bg-white dark:bg-gray-800/60 shadow-sm">
    <CardHeader>
      <Skeleton className="h-6 w-1/2" />
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    </CardContent>
  </Card>
);

const ProcessingMetricsSkeleton: React.FC = () => (
  <Card className="lg:col-span-1 bg-white dark:bg-gray-800/60 shadow-sm">
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
          <div className="space-y-1.5 w-2/3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const EventListItemSkeleton: React.FC = () => (
  <li className="flex items-start p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-0.5 mr-3" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  </li>
);

export default Dashboard;