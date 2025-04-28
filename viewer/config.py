import os
import tempfile
from dotenv import load_dotenv

# Load environment-specific .env file
ENV = os.getenv('ENVIRONMENT', 'lab')  # Default to 'local' if not set
load_dotenv(f'.env.{ENV}')
print(f'Loading environment: {ENV}')

# Environment-specific configurations
ENVIRONMENTS = {
    'local': {
        'orthanc_url': 'http://localhost:8042',  # Default local Orthanc
        'temp_root': os.path.join(tempfile.gettempdir(), 'dicom_viewer'),
    },
    'lab': {
        'orthanc_url': 'http://baymax-3:8055',  # Replace with actual lab server
        'temp_root': os.path.join(tempfile.gettempdir(), 'dicom_viewer'),
    }
}

# Get current environment config
current_env = ENVIRONMENTS[ENV]

# Orthanc server configuration
ORTHANC_URL = os.getenv("ORTHANC_URL", current_env['orthanc_url'])
ORTHANC_NAME = ORTHANC_URL.split('//')[1].split(':')[0] # Extract server name from URL
DATABASE_NAME = f'{ORTHANC_NAME}-reviews.db'
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD")

# Temporary file storage configuration
TEMP_ROOT = current_env['temp_root']

# roi labels from dashboard
lymphNodesGroup = [
    'LN_Ax_L1_L', 'LN_Ax_L1_R', 'LN_Ax_L2_L', 'LN_Ax_L2_R', 'LN_Ax_L3_L',
    'LN_Ax_L3_R', 'LN_IMN_L', 'LN_IMN_R', 'LN_Interpec_L', 'LN_Interpec_R',
    'LN_Neck_IA', 'LN_Neck_IB_L', 'LN_Neck_IB_R', 'LN_Neck_II_L',
    'LN_Neck_II_R', 'LN_Neck_III_L', 'LN_Neck_III_R', 'LN_Neck_IVA_L',
    'LN_Neck_IVA_R', 'LN_Neck_IVB_L', 'LN_Neck_IVB_R', 'LN_Neck_VIA',
    'LN_Neck_VIB', 'LN_Neck_VIIA_L', 'LN_Neck_VIIA_R', 'LN_Neck_VIIB_L',
    'LN_Neck_VIIB_R', 'LN_Neck_V_L', 'LN_Neck_V_R', 'LN_Supraclav_L',
    'LN_Supraclav_R'
]

headAndNeckGroup = [
    'Bone_Mandible', 'Brain', 'Brainstem', 'Cavity_Oral', 'Cerebellum_Ant',
    'Cerebellum_Post', 'Cochlea_L', 'Cochlea_R', 'Glnd_Lacrimal_L',
    'Glnd_Lacrimal_R', 'Glnd_Submand_L', 'Glnd_Submand_R', 'Larynx', 'Lips',
    'Musc_Constrict', 'OpticChiasm', 'OpticNrv_L', 'OpticNrv_R', 'Parotid_L',
    'Parotid_R', 'Pituitary', 'SpinalCord', 'ThecalSac', 'Thyroid', 'Trachea',
    'GTV_RtNeck', 'GTV_nose'
]

PROJECTS = {
    'localhost': {
        'medai': {
            'name': 'MedAI',
            'description': 'MedAI Quality Assessment Dataset',
            'label': 'medai',  # Matches existing Orthanc label
            'created_date': '2025-01-01',
            'status': 'active',
            'type': 'quality_assessment', 
            'roi_labels': ['all']
        },
        'contouring': { # Added contouring project
            'name': 'MedAI Contouring Review',
            'description': 'Contour Quality Assessment',
            'label': 'contouring',  # Matches existing Orthanc label
            'created_date': '2025-01-01',
            'status': 'active',
            'type': 'quality_assessment', 
            'roi_labels': ['all']
        },
        'planning': { # Added planning project
            'name': 'MedAI Planning Review',
            'description': 'Planning Quality Assessment',
            'label': 'planning',  # Matches existing Orthanc label
            'created_date': '2025-01-01',
            'status': 'active',
            'type': 'quality_assessment', 
            'roi_labels': ['all']
        }
    }, 
}


# Review configurations
QUALITY_RATINGS = {
    '5': 'Excellent (Clinical Quality)',
    '4': 'Good (Minor Imperfections)',
    '3': 'Acceptable (Usable with Preprocessing)',
    '2': 'Poor (Needs Work)',
    '1': 'Unusable'
}

QUALITY_ISSUES = [
    'positioning',
    'artifacts',
    'contrast',
    'noise',
    'incomplete_data'
]

# Site specific labels
SITE_LABELS = ['gtv']

# Databricks API key
DATABRICKS_API_KEY = os.getenv("DATABRICKS_API_KEY")