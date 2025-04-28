import axios, { AxiosInstance, AxiosError } from 'axios';
import { Patient, Agent } from '../types';
import staticPatientsData from '../data/staticPatients.json'; // Import static data

const API_URL = import.meta.env.VITE_API_URL;
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Define expected response types
interface LoginResponse {
  token: string;
  user: {
    username: string;
    firstName: string;
    lastName: string;
    organization?: string;
  };
}

interface ApiErrorData {
  error?: string;
  message?: string;
}

// Custom error types
class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Create a custom axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (adds token)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  // This typically shouldn't fail unless there's a config issue
  console.error("Request Interceptor Error:", error);
  return Promise.reject(new NetworkError('Request setup failed'));
});

// Response interceptor (returns response.data directly, handles errors)
axiosInstance.interceptors.response.use((response) => {
  return response.data;
}, (error: AxiosError<ApiErrorData>) => {
  if (error.response) {
    if (error.response.status === 401) {
      return Promise.reject(new UnauthorizedError(error.response.data?.error || 'Unauthorized'));
    }
    const errorMessage = error.response.data?.error || error.response.data?.message || 'An error occurred';
    return Promise.reject(new ApiError(errorMessage, error.response.status));
  } else if (error.request) {
    // Network error (no response received)
    return Promise.reject(new NetworkError('No response received from server'));
  } else {
    // Other errors (e.g., setting up the request)
    return Promise.reject(new NetworkError(error.message || 'Request setup failed'));
  }
});

// Global error handler
const handleApiError = (error: Error) => {
  // Basic console logging, can be expanded
  console.error(`Error handled by handleApiError: [${error.name}] ${error.message}`);
  if (error instanceof ApiError && error.status) {
      console.error(`  Status: ${error.status}`);
  }
  // Optionally trigger UI feedback (e.g., toast notification)
};

// Helper function to map static data to Patient type
const mapStaticToPatient = (staticPatient: any): Patient => {
  const patientBase: Partial<Patient> = {
    patient_id: staticPatient.patient_id,
    first_name: staticPatient.first_name,
    last_name: staticPatient.last_name,
    birth_date: staticPatient.birth_date,
    sex: staticPatient.sex,
    orthanic_id: staticPatient.orthanic_id,
    name: `${staticPatient.first_name} ${staticPatient.last_name}`,
    mrn: staticPatient.mrn,
    studyDate: staticPatient.studyDate,
    modality: staticPatient.modality,
    anatomicalSites: staticPatient.anatomicalSites,
    treatmentSite: staticPatient.treatmentSite,
    prescription: staticPatient.prescription,
    priority: staticPatient.priority,
    document: staticPatient.document,
    contour: staticPatient.contour,
    planning: staticPatient.planning,
    stage: staticPatient.stage,
    status: staticPatient.status,
    progress: staticPatient.progress,
    lastUpdate: staticPatient.lastUpdate,
    dosimetricValues: staticPatient.dosimetricValues,
    id: staticPatient.patient_id.toString(),
  };
  return patientBase as Patient;
};

// Define types for the new API responses (based on PathologyReportViewer usage)
interface PathologyReport {
  report_id: number;
  patient_id: number;
  pdf_s3_url: string;
  creation_time: string;
  name?: string; // Optional, as it might be added client-side
}

interface OneLiner {
  one_liner_id: number;
  patient_id: number;
  report_id: number;
  one_liner_text: string;
  model: string;
  created_at?: string;
}

interface StructuredData {
  structured_data_id: number;
  patient_id: number;
  report_id: number;
  disease_site: string | null;
  tumor_stage: string | null;
  laterality: string | null;
  age: string | null;
  sex: string | null;
  ebrt_relevance: string | null;
  model: string | null;
  creation_time?: string;
}

export const api = {
  // Get patient progress
  async getPatientProgress(patientId: number | string): Promise<any> {
    if (IS_DEMO_MODE) {
      console.log('[DEMO MODE] Using static patient progress for ID:', patientId);
      const patient = (staticPatientsData as any[]).find(p => p.patient_id.toString() === patientId.toString());
      if (patient) {
        return Promise.resolve({
          document: patient.document ?? 0,
          contour: patient.contour ?? 0,
          planning: patient.planning ?? 0,
          stage: patient.stage ?? 0,
          status: patient.status ?? 0,
          orthanic_id: patient.orthanic_id,
          progress: patient.progress,
          lastUpdate: patient.lastUpdate,
          treatmentSite: patient.treatmentSite,
          prescription: patient.prescription,
          dosimetricValues: patient.dosimetricValues
        });
      } else {
        console.warn('[DEMO MODE] Patient not found in static data for ID:', patientId);
        return Promise.reject(new ApiError('Patient not found in static data', 404));
      }
    }
    try {
      // Remove explicit type hint, use assertion on result
      const progressData = await axiosInstance.get(`/patient-progress/${patientId}`);
      return progressData; // Interceptor returns data, type is likely inferred as 'any'
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  // Update patient progress
  async updatePatientProgress(patientId: number | string, stage: number, status: number): Promise<any> {
    try {
      return await axiosInstance.post('/update-patient-progress', {
        patient_id: patientId,
        stage,
        status
      });
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  // Authentication
  async register(username: string, password: string) {
    try {
      return await axiosInstance.post('/register', { username, password });
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    if (IS_DEMO_MODE) {
      console.log('[DEMO MODE] Attempting login...');
      if (username === 'medai' && password === 'medai') {
        console.log('[DEMO MODE] Demo credentials matched.');
        const demoUser: LoginResponse['user'] = {
          username: 'medai',
          firstName: 'Med.ai',
          lastName: 'Reviewer',
          organization: 'Demo Org'
        };
        const demoToken = 'demo-mode-token-' + Date.now(); // Simple mock token
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser)); // Also store user info if needed by AuthContext

        return Promise.resolve({ token: demoToken, user: demoUser });
      } else {
        console.warn('[DEMO MODE] Invalid demo credentials.');
        // Reject with an UnauthorizedError to mimic API behavior
        return Promise.reject(new UnauthorizedError('Invalid username or password'));
      }
    }

    // Original non-demo mode logic
    try {
      const responseData = await axiosInstance.post('/login', { username, password });
      const loginData = responseData as unknown as LoginResponse; // Keep the assertion for now
      if (loginData && loginData.token) {
        localStorage.setItem('token', loginData.token);
        // Store user details returned from the actual API
        if (loginData.user) {
           localStorage.setItem('user', JSON.stringify(loginData.user));
        }
      } else {
        console.error('Login response did not contain expected token field.');
        throw new ApiError('Invalid login response format', 500);
      }
      return loginData;
    } catch (error) {
      // Clear potentially stale user info on login failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      handleApiError(error as Error);
      throw error;
    }
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    if (IS_DEMO_MODE) {
      console.log('[DEMO MODE] Using static patients data.');
      const mappedPatients = (staticPatientsData as any[]).map(mapStaticToPatient);
      return Promise.resolve(mappedPatients);
    }
    try {
      const patientsData = await axiosInstance.get('/patients');
      return patientsData as unknown as Patient[];
    } catch (error) {
      console.warn('Failed to fetch patients from API:', error);
      handleApiError(error as Error);
      throw error;
    }
  },

  async getPatient(id: string): Promise<Patient> {
    if (IS_DEMO_MODE) {
      console.log('[DEMO MODE] Getting single static patient for ID:', id);
      const staticPatient = (staticPatientsData as any[]).find(p => p.patient_id.toString() === id);
      if (staticPatient) {
        return Promise.resolve(mapStaticToPatient(staticPatient));
      } else {
        console.warn('[DEMO MODE] Patient not found in static data for ID:', id);
        return Promise.reject(new ApiError('Patient not found in static data', 404));
      }
    }
    try {
      const patientData = await axiosInstance.get(`/patientss/${id}`);
      return patientData as unknown as Patient;
    } catch (error) {
      console.warn(`Failed to fetch patient ${id} from API:`, error);
      handleApiError(error as Error);
      throw error;
    }
  },

  // Method to get reports for a specific patient
  async getPatientReports(patientId: string): Promise<PathologyReport[]> {
      if (IS_DEMO_MODE) {
          console.log('[DEMO MODE] Getting static reports for patient ID:', patientId);
          const patient = (staticPatientsData as any[]).find(p => p.patient_id.toString() === patientId);
          if (patient && patient.demoPdfPath) { // Check if patient and demo path exist
              // Use the demoPdfPath from the static data
              const mockReport: PathologyReport = {
                  report_id: 9901, // Keep mock ID or generate
                  patient_id: patient.patient_id,
                  // Construct a URL or path that the backend viewer endpoint can understand.
                  // Assuming the viewer endpoint needs the path relative to its serving root.
                  // We'll represent it here in a way that getViewerUrl can parse.
                  // Let's use a custom scheme `demo-pdf://` to signify it's a local demo path.
                  pdf_s3_url: `demo-pdf://${patient.demoPdfPath}`, 
                  creation_time: new Date().toISOString(),
                  // Extract name from the demo path
                  name: patient.demoPdfPath.split('/').pop() || 'demo_report.pdf'
              };
              return Promise.resolve([mockReport]); // Return as an array
          }
          console.log('[DEMO MODE] No patient or demoPdfPath found for reports, ID:', patientId);
          return Promise.resolve([]); // Return empty if patient or path not found
      }
      try {
          const reportData = await axiosInstance.get(`/patient-reports/${patientId}`);
          return reportData as unknown as PathologyReport[];
      } catch (error) {
          console.warn(`Failed to fetch reports for patient ${patientId} from API:`, error);
          handleApiError(error as Error);
          throw error;
      }
  },

  // Method to get one-liner for a specific patient
  async getOneLiner(patientId: string): Promise<OneLiner> {
      if (IS_DEMO_MODE) {
          console.log('[DEMO MODE] Getting static one-liner for patient ID:', patientId);
          // Find the patient and return mock one-liner data or throw not found
          const patient = (staticPatientsData as any[]).find(p => p.patient_id.toString() === patientId);
          if (patient) {
              // TODO: Add representative static one-liner data to staticPatients.json
              const mockOneLiner: OneLiner = {
                  one_liner_id: 8801,
                  patient_id: patient.patient_id,
                  report_id: 9901, // Corresponds to the mock report above
                  one_liner_text: `This is a static one-liner for ${patient.name}. Patient presents with conditions relevant to the demo. Stage: ${patient.stage}, Status: ${patient.status}.`,
                  model: 'StaticModel v1'
              };
              return Promise.resolve(mockOneLiner);
          }
          console.warn('[DEMO MODE] Patient not found for one-liner, ID:', patientId);
          return Promise.reject(new ApiError('Patient not found in static data for one-liner', 404));
      }
      try {
          const oneLinerData = await axiosInstance.get(`/get-oneliner/${patientId}`);
          return oneLinerData as unknown as OneLiner;
      } catch (error) {
          console.warn(`Failed to fetch one-liner for patient ${patientId} from API:`, error);
           // Handle 404 specifically if needed (patient might not have a one-liner)
          if (error instanceof ApiError && error.status === 404) {
             console.log(`No one-liner found for patient ${patientId}.`);
             // Depending on desired behavior, you might resolve with null or re-throw
             // Re-throwing to match potential expectation of the caller
             throw error;
          }
          handleApiError(error as Error);
          throw error;
      }
  },

  // Method to get structured data for a specific patient
  async getStructuredData(patientId: string): Promise<StructuredData> {
      if (IS_DEMO_MODE) {
          console.log('[DEMO MODE] Getting static structured data for patient ID:', patientId);
          const patient = (staticPatientsData as any[]).find(p => p.patient_id.toString() === patientId);
          if (patient) {
              // TODO: Add representative static structured data to staticPatients.json
              const mockStructuredData: StructuredData = {
                  structured_data_id: 7701,
                  patient_id: patient.patient_id,
                  report_id: 9901,
                  disease_site: patient.treatmentSite || 'Unknown',
                  tumor_stage: 'T2N0M0 (Static)',
                  laterality: 'Left (Static)',
                  age: Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toString(),
                  sex: patient.sex,
                  ebrt_relevance: 'Relevant (Static)',
                  model: 'StaticExtractor v1'
              };
              return Promise.resolve(mockStructuredData);
          }
          console.warn('[DEMO MODE] Patient not found for structured data, ID:', patientId);
          return Promise.reject(new ApiError('Patient not found in static data for structured data', 404));
      }
      try {
          const structuredData = await axiosInstance.get(`/get-structured-data/${patientId}`);
          return structuredData as unknown as StructuredData;
      } catch (error) {
          console.warn(`Failed to fetch structured data for patient ${patientId} from API:`, error);
          if (error instanceof ApiError && error.status === 404) {
             console.log(`No structured data found for patient ${patientId}.`);
             throw error; // Re-throw 404
          }
          handleApiError(error as Error);
          throw error;
      }
  },

  // New Orthanc-specific methods
  async getOrthancPatients(): Promise<Patient[]> {
    try {
      return await axiosInstance.get('/orthanc/patients');
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  async getOrthancPatient(id: string): Promise<Patient> {
    try {
      return await axiosInstance.get(`/orthanc/patients/${id}`);
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  async addPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    try {
      return await axiosInstance.post('/patients', patient);
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  async updatePatient(patient: Patient): Promise<Patient> {
    try {
      return await axiosInstance.put(`/patients/${patient.id}`, patient);
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  async deletePatient(id: string): Promise<void> {
    try {
      return await axiosInstance.delete(`/patients/${id}`);
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  // Agents
  async getAgents(): Promise<Agent[]> {
    try {
      return await axiosInstance.get('/dashboard');
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },

  // Tasks
  async startTask(taskData: any) {
    try {
      return await axiosInstance.post('/start-task', taskData);
    } catch (error) {
      handleApiError(error as Error);
      throw error;
    }
  },
};

export interface StructuredDataResult {
  disease_site: string | null;
  tumor_stage: string | null;
  laterality: string | null;
  patient_info: {
    age: number | null;
    sex: string | null;
  };
  ebrt_relevance: boolean | null;
}

export interface AnalysisResponse {
  timestamp: string;
  file_name: string;
  results: {
    [key: string]: StructuredDataResult;
  };
  models_used: string[];
}

export interface FeedbackSubmission {
  model_name: string;
  feedback: string;
  accuracy_rating?: number;
  comments?: string;
}

// Add these methods to your api object
export const structuredDataApi = {
  async analyzeDocument(file: File): Promise<AnalysisResponse> {
      try {
          const formData = new FormData();
          formData.append('file', file);

          // Get Ollama response (Llama and Phi)
          const ollamaResponse = await fetch('http://127.0.0.1:5001/structured-data/analyze', {
              method: 'POST',
              body: formData,
          });

          // Get Claude response
          const claudeResponse = await fetch('http://127.0.0.1:5001/anthropic-structured', {
              method: 'POST',
              body: formData,
          });

          if (!ollamaResponse.ok || !claudeResponse.ok) {
              throw new Error('Failed to analyze document');
          }

          const ollamaData = await ollamaResponse.json();
          const claudeData = await claudeResponse.json();

          // Combine the responses
          return {
              timestamp: new Date().toISOString(),
              file_name: file.name,
              results: {
                  claude: claudeData.result,
                  llama: ollamaData.results.llama,
                  phi: ollamaData.results.phi
              },
              models_used: ['claude', 'llama', 'phi']
          };
      } catch (error) {
          console.error('Error in analyzeDocument:', error);
          throw error;
      }
  },

  async selectModelResult(modelName: string, result: StructuredDataResult, isAnthropicModel: boolean = false) {
      try {
          const endpoint = isAnthropicModel 
              ? 'http://127.0.0.1:5001/select-anthropic-structured'
              : 'http://127.0.0.1:5001/structured-data/select';

          const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  model_name: modelName,
                  result: result,
              }),
          });

          if (!response.ok) {
              throw new Error('Failed to select model result');
          }

          return await response.json();
      } catch (error) {
          console.error('Error in selectModelResult:', error);
          throw error;
      }
  },

  async submitFeedback(feedback: FeedbackSubmission) {
      try {
          const response = await fetch('http://127.0.0.1:5001/structured-data/feedback', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(feedback),
          });

          if (!response.ok) {
              throw new Error('Failed to submit feedback');
          }

          return await response.json();
      } catch (error) {
          console.error('Error in submitFeedback:', error);
          throw error;
      }
  },

  // Add this to the api object in api.ts
  async getStructuredData(patientId: number | string): Promise<StructuredData> {
    try {
      const response = await axios.get(`${API_URL}/get-structured-data/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching structured data:', error);
      throw error;
    }
  },
};