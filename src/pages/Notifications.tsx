import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  FileText,
  ExternalLink,
  BellRing,
  Eye,
  XCircle,
  Filter
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  agentType: 'intake' | 'contouring' | 'planning';
  status: 'unread' | 'read';
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [filterPriority, setFilterPriority] = useState<string[]>(['high', 'medium', 'low']);
  const [filterStatus, setFilterStatus] = useState<string[]>(['unread', 'read']);

  // Mock notifications data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Contours Ready for Review',
      message: 'Auto-generated contours for brain treatment are ready for review.',
      timestamp: '5 minutes ago',
      patientId: 'PT001',
      patientName: 'John Doe',
      agentType: 'contouring',
      status: 'unread',
      actionUrl: `${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/medai/review/PT001`,
      priority: 'high'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Treatment Plan Requires Attention',
      message: 'Generated plan exceeds dose constraints for OARs.',
      timestamp: '15 minutes ago',
      patientId: 'PT002',
      patientName: 'Jane Smith',
      agentType: 'planning',
      status: 'unread',
      actionUrl: `${import.meta.env.VITE_VIEWER_BASE_URL || 'http://localhost:8000/'}project/medai/review/PT002`,
      priority: 'high'
    },
    {
      id: '3',
      type: 'error',
      title: 'Patient Intake Processing Failed',
      message: 'Error processing intake documents. Manual review needed.',
      timestamp: '1 hour ago',
      patientId: 'PT003',
      patientName: 'Robert Brown',
      agentType: 'intake',
      status: 'read',
      priority: 'medium'
    }
  ];

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'intake':
        return <FileText className="h-5 w-5" />;
      case 'contouring':
        return <Target className="h-5 w-5" />;
      case 'planning':
        return <Zap className="h-5 w-5" />;
      default:
        return <BellRing className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab !== 'all' && notification.agentType !== activeTab) return false;
    if (!filterPriority.includes(notification.priority)) return false;
    if (!filterStatus.includes(notification.status)) return false;
    return true;
  });

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold">Notifications</h2>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setFilterStatus(['unread'])}
            >
              <Eye className="h-4 w-4" />
              Show Unread Only
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Notification Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <BellRing className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Notifications</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Require Attention</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                  <Eye className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pending Review</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Completed Today</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Content */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 gap-4 bg-gray-700">
                <TabsTrigger value="all">All Notifications</TabsTrigger>
                <TabsTrigger value="intake">Patient Intake</TabsTrigger>
                <TabsTrigger value="contouring">Auto-Contouring</TabsTrigger>
                <TabsTrigger value="planning">Treatment Planning</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors ${
                        notification.status === 'unread' ? 'border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="flex items-start gap-4 p-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(notification.type)}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold flex items-center gap-2">
                                {notification.title}
                                {getAgentIcon(notification.agentType)}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {notification.patientName} ({notification.patientId})
                              </p>
                            </div>
                            <span className="text-sm text-gray-400">
                              {notification.timestamp}
                            </span>
                          </div>
                          <p className="mt-2">{notification.message}</p>
                          {notification.actionUrl && (
                            <div className="mt-2 flex items-center gap-2 text-blue-400">
                              <ExternalLink className="h-4 w-4" />
                              <span className="text-sm">Review Required</span>
                            </div>
                          )}
                        </div>
                        <div className={`text-sm font-medium ${getPriorityColor(notification.priority)}`}>
                          {notification.priority.toUpperCase()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="intake" className="mt-4">
                <div className="space-y-4">
                  {filteredNotifications
                    .filter(n => n.agentType === 'intake')
                    .map(notification => (
                      // Same notification card structure as above
                      <Card key={notification.id}>...</Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="contouring" className="mt-4">
                <div className="space-y-4">
                  {filteredNotifications
                    .filter(n => n.agentType === 'contouring')
                    .map(notification => (
                      // Same notification card structure as above
                      <Card key={notification.id}>...</Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="planning" className="mt-4">
                <div className="space-y-4">
                  {filteredNotifications
                    .filter(n => n.agentType === 'planning')
                    .map(notification => (
                      // Same notification card structure as above
                      <Card key={notification.id}>...</Card>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;