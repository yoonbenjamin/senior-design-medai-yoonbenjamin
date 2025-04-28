//types.ts file
export interface Patient {
  id: string;
  name: string;
  age?: number;
  lastVisit?: string;
  document?: number; // 0, 1, 2, or 3
  contour?: number;
  planning?: number;
  stage?: number;   
  status?: number;
  [key: string]: any;
  patientId?: string;
  birthDate?: string;
  sex?: string;
  studiesCount?: number;
  lastUpdate?: string;
  orthancUrl?: string;
  orthanic_id?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Agent {
  id: number;
  name: string;
  task: string;
  assigned_user: number;
  assigned_patient: number;
}

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

export interface ModelAnalysisResponse {
  timestamp: string;
  file_name: string;
  results: {
      llama: StructuredDataResult;
      phi: StructuredDataResult;
  };
  models_used: string[];
}