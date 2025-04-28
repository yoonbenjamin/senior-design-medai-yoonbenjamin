import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; 
import { ThemeProvider } from './components/theme-provider';
import { SidebarStateProvider } from './context/SidebarStateContext';
import MainLayout from './layouts/MainLayout';

import Login from './pages/Login';
import SignUp from './pages/SignUp';

import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import MyProfile from './pages/MyProfile'; 
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';

import PatientIntakeAgent from './pages/agents/PatientIntakeAgent';
import AutoContouringAgent from './pages/agents/AutoContouringAgent'
import GPTIntakeAgent from './pages/agents/intake_agents/GPTIntakeAgent';
import LlamaIntakeAgent from './pages/agents/intake_agents/LlamaIntakeAgent';
import ClaudeIntakeAgent from './pages/agents/intake_agents/ClaudeIntakeAgent';
import HuggingFaceIntakeAgent from './pages/agents/intake_agents/HuggingFaceIntakeAgent';
import StructuredIntakeAgent from './pages/agents/StructuredIntakeAgent';
import OnelinerIntakeAgent from './pages/agents/OnelinerIntakeAgent';
import TreatmentPlanningAgent from './pages/agents/TreatmentPlanningAgent';

import PatientsPage from './pages/PatientsPage';
import AddPatientPage from './pages/AddPatientPage';
import StructuredIntakeList from './pages/StructuredIntakeList';
import MedicalIntakeList from './pages/MedicalIntakeList';
import ActiveTasksPage from './pages/tasks/ActiveTasksPage';
import CompletedTasksPage from './pages/tasks/CompletedTasksPage';
import TaskQueuePage from './pages/tasks/TaskQueuePage';
import PathologyReportViewer from './pages/PathologyReportViewer';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarStateProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/signup" element={<SignUp />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<LandingPage />} />
                {/* Routes that require the sidebar */}
                <Route element={<MainLayout />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/patients" element={<PatientsPage />} />
                  <Route path="/patients-new" element={<AddPatientPage />} />
                  <Route path="/patient-list-s" element={<StructuredIntakeList />} />
                  <Route path="/patient-list-m" element={<MedicalIntakeList />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<MyProfile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/patient-intake-agent" element={<PatientIntakeAgent />} />
                  <Route path="/auto-contouring-agent" element={<AutoContouringAgent />} />
                  <Route path="/treatment-planning-agent" element={<TreatmentPlanningAgent />} />
                  <Route path="/gpt-intake-agent" element={<GPTIntakeAgent />} />
                  <Route path="/llama-intake-agent" element={<LlamaIntakeAgent />} />
                  <Route path="/claude-intake-agent" element={<ClaudeIntakeAgent />} />
                  <Route path="/hugging-face-intake-agent" element={<HuggingFaceIntakeAgent />} />
                  <Route path="/structured-intake-agent" element={<StructuredIntakeAgent />} />
                  <Route path="/oneliner-intake-agent" element={<OnelinerIntakeAgent />} />
                  <Route path="/tasks/active" element={<ActiveTasksPage />} />
                  <Route path="/tasks/completed" element={<CompletedTasksPage />} />
                  <Route path="/tasks/queue" element={<TaskQueuePage />} />
                  <Route path="/pathology-reports/:patientId" element={<PathologyReportViewer />} />

                  {/* Add any additional routes that require the sidebar here */}
                </Route>
              </Routes>
            </div>
          </Router>
        </SidebarStateProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;