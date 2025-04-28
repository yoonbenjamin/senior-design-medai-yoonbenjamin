import requests
from datetime import datetime
import json
from config import ORTHANC_URL, ORTHANC_NAME, ORTHANC_USERNAME, ORTHANC_PASSWORD, DATABASE_NAME, PROJECTS
import tempfile
import traceback
from pathlib import Path
import os
import shutil
import sqlite3

# Define base directories
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECTS_DIR = os.path.join(BASE_DIR, 'projects')
TEMP_DIR = os.path.join(BASE_DIR, 'temp')
# DATABASE_PATH = os.path.join(BASE_DIR, 'dbs', DATABASE_NAME)
DATABASE_PATH = os.path.join(BASE_DIR, 'dbs', 'user-tests.db')
class OrthancDataManager:
    def __init__(self, orthanc_url, orthanc_username, orthanc_password):
        """Initialize OrthancDataManager"""
        self.orthanc_url = orthanc_url
        self.orthanc_username = orthanc_username
        self.orthanc_password = orthanc_password
        
        # Initialize session for requests
        self.session = requests.Session()
        self.session.auth = (orthanc_username, orthanc_password)
        
        # Define cache directories
        self.cache_dir = Path(BASE_DIR) / 'cache' / ORTHANC_NAME
        self.cache_dir.mkdir(exist_ok=True)
        
        # Initialize SQLite database
        self._init_db()
        
        # Test connection
        self._test_connection()

    def _init_db(self):
        """Initialize database if it doesn't exist"""
        # db_file = Path(DATABASE_NAME)
        db_file = Path(DATABASE_PATH)
        
        # Only initialize if database doesn't exist
        if not db_file.exists():
            print("\nCreating new database...")
            self._create_schema()
        else:
            print("\nUsing existing database")
            self._create_schema()

    def _create_schema(self):
        """Create database schema"""
        print("\nInitializing database...")
        with sqlite3.connect(DATABASE_PATH) as conn:
            # Create tables if they don't exist
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT,
                    role TEXT DEFAULT 'reviewer'
            )
            ''')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_date TEXT,
                    status TEXT DEFAULT 'active',
                    type TEXT,
                    roi_labels TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS reviews (
                    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    study_id TEXT,
                    project_id TEXT,
                    user_id INTEGER,
                    review_date TEXT,
                    quality_rating INTEGER,
                    issues TEXT,            
                    comments TEXT,
                    last_modified TEXT DEFAULT (datetime('now', 'localtime')),  
                    FOREIGN KEY (study_id) REFERENCES studies (study_id),
                    FOREIGN KEY (project_id) REFERENCES projects (project_id),
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    CHECK (quality_rating BETWEEN 1 AND 5)  
            )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS studies (
                    unique_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    study_id TEXT,
                    project_id TEXT,
                    patient_id TEXT,
                    patient_name TEXT,
                    study_date TEXT,
                    study_description TEXT,
                    orthanc_id TEXT,
                    cache_path TEXT,
                    FOREIGN KEY (project_id) REFERENCES projects (project_id),
                    CONSTRAINT unique_study_project UNIQUE (study_id, project_id)
                )
            ''')

            # Create new table for user-specific study status
            conn.execute('''
                CREATE TABLE IF NOT EXISTS user_study_status (
                    user_id INTEGER,
                    study_id TEXT,
                    project_id TEXT,
                    status TEXT DEFAULT 'unreviewed',
                    last_modified TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (user_id) REFERENCES users(user_id),
                    FOREIGN KEY (study_id, project_id) REFERENCES studies(study_id, project_id),
                    PRIMARY KEY (user_id, study_id, project_id)
                )
            ''')

             # Add user_projects table for project assignments
            conn.execute('''
                CREATE TABLE IF NOT EXISTS user_projects (
                    user_id INTEGER,
                    project_id TEXT,
                    PRIMARY KEY (user_id, project_id),
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    FOREIGN KEY (project_id) REFERENCES projects (project_id)
                )
            ''')

            # Insert some default users
            conn.execute('''
                INSERT OR IGNORE INTO users (username, password, role)
                VALUES 
                    ('admin', 'admin123', 'admin'),
                    ('mcbethr', 'mcbethr', 'reviewer'),
                    ('ross', 'ross', 'reviewer'),
                    ('medai', 'medai', 'reviewer')
            ''')

            
            # Initialize default projects if they don't exist
            for project_id, project in PROJECTS[ORTHANC_NAME].items():
                conn.execute('''
                    INSERT OR IGNORE INTO projects 
                    (project_id, name, description, type, roi_labels)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    project_id,
                    project.get('name', ''),
                    project.get('description', ''),
                    project.get('type', 'quality_assessment'),
                    json.dumps(project.get('roi_labels', []))
                ))
            
            conn.commit()
        self.init_user_projects()

    def _get_default_study_info(self):
        """Return default study information when actual data cannot be retrieved"""
        return {
            'patient_name': 'Unknown',
            'patient_id': 'Unknown',
            'study_date': '',
            'study_description': 'Unknown',
            'total_slices': 0,
            'accession_number': '',
            'modality': 'Unknown'
        }

    def _test_connection(self):
        """Test connection to Orthanc server"""
        try:
            response = requests.get(
                f"{self.orthanc_url}/system",
                auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Failed to connect to Orthanc: {str(e)}")
            raise

    def get_projects(self):
        """Get list of all projects with their stats"""
        try:
            from config import PROJECTS
            projects_data = []
            
            for project_id, project_info in PROJECTS[ORTHANC_NAME].items():
                print(f"Processing project: {project_id}")
                
                try:
                    # Get studies with this project label from Orthanc
                    url = f"{self.orthanc_url}/studies"
                    params = {'labels': project_info['label']}
                    auth = (self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
                    
                    print(f"Requesting URL: {url} with params: {params}")
                    response = requests.get(url, params=params, auth=auth)
                    
                    if response.status_code != 200:
                        print(f"Error response from Orthanc: {response.status_code} - {response.text}")
                        studies = []
                    else:
                        studies = response.json()
                    
                    print(f"Found {len(studies)} studies for project {project_id}")
                    
                    # Initialize counters
                    total = len(studies)
                    reviewed = 0
                    
                    # Only try to get labels if we have studies
                    if total > 0:
                        for study_id in studies:
                            labels = self.get_study_labels(study_id)
                            if any(label.startswith('quality_') for label in labels):
                                reviewed += 1
                    
                    project_data = {
                        'id': project_id,
                        'name': project_info['name'],
                        'description': project_info['description'],
                        'total': total,
                        'reviewed': reviewed,
                        'remaining': total - reviewed,
                        'progress': (reviewed / total * 100) if total > 0 else 0,
                        'status': project_info.get('status', 'active')
                    }
                    projects_data.append(project_data)
                    
                except Exception as e:
                    print(f"Error processing project {project_id}: {str(e)}")
                    # Add project with zero counts rather than failing
                    project_data = {
                        'id': project_id,
                        'name': project_info['name'],
                        'description': project_info['description'],
                        'total': 0,
                        'reviewed': 0,
                        'remaining': 0,
                        'progress': 0,
                        'status': project_info.get('status', 'active')
                    }
                    projects_data.append(project_data)
            
            return projects_data
        except Exception as e:
            print(f"Error in get_projects: {str(e)}")
            return []

    # old get_project_stats with no user_id
    def get_project_stats(self, project_id):
        """Get basic statistics for a project"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            
            stats = {}
            
            # Get study counts
            counts = conn.execute('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
                    SUM(CASE WHEN status = 'unreviewed' THEN 1 ELSE 0 END) as unreviewed,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
                FROM studies
                WHERE project_id = ?
            ''', (project_id,)).fetchone()
            
            stats.update({
                'total': counts['total'],
                'reviewed': counts['reviewed'] or 0,
                'unreviewed': counts['unreviewed'] or 0,
                'in_progress': counts['in_progress'] or 0,
                'progress': (counts['reviewed'] / counts['total'] * 100) if counts['total'] > 0 else 0
            })
            
            return stats
        
    # new get_project_stats with user_id
    def get_project_stats(self, project_id, user_id):
        """Get project statistics for a specific user"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            
            stats = conn.execute('''
                SELECT 
                    COUNT(DISTINCT s.study_id) as total_studies,
                    COUNT(DISTINCT CASE WHEN uss.status = 'reviewed' THEN s.study_id END) as reviewed,
                    COUNT(DISTINCT CASE WHEN uss.status = 'unreviewed' THEN s.study_id END) as unreviewed,
                    COUNT(DISTINCT CASE WHEN uss.status = 'in_progress' THEN s.study_id END) as in_progress
                FROM studies s
                LEFT JOIN user_study_status uss ON 
                    s.study_id = uss.study_id 
                    AND s.project_id = uss.project_id
                    AND uss.user_id = ?
                WHERE s.project_id = ?
            ''', (user_id, project_id)).fetchone()
            
            # Convert to dictionary and add calculated fields
            stats_dict = dict(stats)
            total = stats_dict['total_studies'] or 0
            reviewed = stats_dict['reviewed'] or 0
            
            # Add progress calculation
            stats_dict['progress'] = (reviewed / total * 100) if total > 0 else 0
            stats_dict['total'] = total  # Add this for consistency with template
            
            return stats_dict

    def get_user_projects(self, user_id):
        """Get projects assigned to a specific user with their review progress"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            projects = []
            
            # Get assigned projects for user
            rows = conn.execute('''
                SELECT p.*, up.user_id
                FROM projects p
                JOIN user_projects up ON p.project_id = up.project_id
                WHERE up.user_id = ?
            ''', (user_id,)).fetchall()
            
            for row in rows:
                # Get statistics for each project specific to this user
                stats = conn.execute('''
                    SELECT 
                        COUNT(DISTINCT s.study_id) as total,
                        COUNT(DISTINCT CASE WHEN uss.status = 'reviewed' THEN s.study_id END) as reviewed
                    FROM studies s
                    LEFT JOIN user_study_status uss ON 
                        s.study_id = uss.study_id 
                        AND s.project_id = uss.project_id
                        AND uss.user_id = ?
                    WHERE s.project_id = ?
                ''', (user_id, row['project_id'])).fetchone()
                
                total = stats['total'] or 0
                reviewed = stats['reviewed'] or 0
                
                project_data = {
                    'project_id': row['project_id'],
                    'name': row['name'],
                    'description': row['description'],
                    'type': row['type'],
                    'total': total,
                    'reviewed': reviewed,
                    'progress': (reviewed / total * 100) if total > 0 else 0,
                    'roi_labels': json.loads(row['roi_labels']) if row['roi_labels'] else []
                }
                projects.append(project_data)
                
            return projects

    def assign_project_to_user(self, user_id, project_id):
        """Assign a project to a user"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.execute('''
                INSERT OR IGNORE INTO user_projects (user_id, project_id)
                VALUES (?, ?)
            ''', (user_id, project_id))
            conn.commit()
    
    def assign_projects_to_user(self, user_id, project_ids):
        """
        Assign multiple projects to a user
        Args:
            user_id: ID of the user
            project_ids: List of project IDs to assign
        """
        try:
            with sqlite3.connect(DATABASE_PATH) as conn:
                # First remove all existing assignments for this user
                conn.execute('''
                    DELETE FROM user_projects
                    WHERE user_id = ?
                ''', (user_id,))
                
                # Then add new assignments
                conn.executemany('''
                    INSERT INTO user_projects (user_id, project_id)
                    VALUES (?, ?)
                ''', [(user_id, project_id) for project_id in project_ids])
                
                conn.commit()
                print(f"Successfully assigned projects to user {user_id}")
                
        except Exception as e:
            print(f"Error assigning projects: {str(e)}")
            traceback.print_exc()
            raise


    def get_study_counts_by_date(self, project_id, start_date=None, end_date=None):
        """Get study counts grouped by date"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            query = '''
                SELECT 
                    DATE(study_date) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed
                FROM studies
                WHERE project_id = ?
            '''
            params = [project_id]
            
            if start_date:
                query += ' AND study_date >= ?'
                params.append(start_date)
            if end_date:
                query += ' AND study_date <= ?'
                params.append(end_date)
                
            query += ' GROUP BY DATE(study_date) ORDER BY date'
            
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    def get_reviewer_performance(self, project_id, reviewer=None):
        """Get reviewer performance metrics"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            query = '''
                SELECT 
                    reviewer,
                    COUNT(*) as total_reviews,
                    AVG(quality_rating) as avg_rating,
                    COUNT(DISTINCT DATE(review_date)) as active_days,
                    MAX(review_date) as last_review,
                    MIN(review_date) as first_review
                FROM reviews
                WHERE project_id = ?
            '''
            params = [project_id]
            
            if reviewer:
                query += ' AND reviewer = ?'
                params.append(reviewer)
                
            query += ' GROUP BY reviewer'
            
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    def search_studies(self, project_id, filters=None):
        """
        Search studies with flexible filtering
        
        Args:
            project_id: Project identifier
            filters: Dict of filter conditions:
                - status: List of statuses
                - date_range: (start_date, end_date)
                - quality_rating: List of ratings
                - reviewer: List of reviewers
                - search_term: Search in patient name/ID
        """
        with sqlite3.connect(DATABASE_PATH) as conn:
            query = '''
                SELECT s.*, r.quality_rating, r.reviewer, r.review_date
                FROM studies s
                LEFT JOIN reviews r ON s.study_id = r.study_id
                WHERE s.project_id = ?
            '''
            params = [project_id]
            
            if filters:
                if 'status' in filters:
                    query += ' AND s.status IN ({})'.format(
                        ','.join('?' * len(filters['status']))
                    )
                    params.extend(filters['status'])
                    
                if 'date_range' in filters:
                    start, end = filters['date_range']
                    query += ' AND s.study_date BETWEEN ? AND ?'
                    params.extend([start, end])
                    
                if 'quality_rating' in filters:
                    query += ' AND r.quality_rating IN ({})'.format(
                        ','.join('?' * len(filters['quality_rating']))
                    )
                    params.extend(filters['quality_rating'])
                    
                if 'reviewer' in filters:
                    query += ' AND r.reviewer IN ({})'.format(
                        ','.join('?' * len(filters['reviewer']))
                    )
                    params.extend(filters['reviewer'])
                    
                if 'search_term' in filters:
                    query += ''' AND (
                        s.patient_name LIKE ? OR 
                        s.patient_id LIKE ? OR 
                        s.study_description LIKE ?
                    )'''
                    search_term = f'%{filters["search_term"]}%'
                    params.extend([search_term] * 3)
            
            query += ' ORDER BY s.study_date DESC'
            
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    def get_project_patients(self, project_label):
        """Get all patients for a project with their status"""
        try:
            # Get all studies with this project label
            response = requests.get(
                f"{self.orthanc_url}/studies",
                params={'labels': project_label},
                auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            )
            response.raise_for_status()
            studies = response.json()
            
            patients = []
            for study_id in studies:
                study_details = self.get_study_details(study_id)
                if study_details:
                    # Add to patient list
                    patients.append(study_details)
            
            return patients
            
        except Exception as e:
            print(f"Error getting project patients: {str(e)}")
            return []

    def get_study_details(self, study_id):
        """Get detailed study information"""
        try:
            # Get study information from Orthanc
            response = requests.get(
                f"{self.orthanc_url}/studies/{study_id}",
                auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            )
            response.raise_for_status()
            study = response.json()
            
            # Get labels
            labels = self.get_study_labels(study_id)
            
            # Determine status from labels
            status = 'unreviewed'
            if any(label.startswith('quality_') for label in labels):
                status = 'completed'
            elif 'in_progress' in labels:
                status = 'in_progress'
            
            # Extract patient and study information
            patient_tags = study.get('PatientMainDicomTags', {})
            main_tags = study.get('MainDicomTags', {})
            
            return {
                'id': study_id,
                'patient_name': patient_tags.get('PatientName', 'Unknown'),
                'patient_id': patient_tags.get('PatientID', 'Unknown'),
                'study_date': main_tags.get('StudyDate', 'Unknown'),
                'study_description': main_tags.get('StudyDescription', 'No description'),
                'status': status,
                'labels': labels,
                'quality_rating': next((label.split('_')[1] for label in labels 
                                     if label.startswith('quality_')), None)
            }
            
        except Exception as e:
            print(f"Error getting study details: {str(e)}")
            return None

    def get_study_labels(self, study_id):
        """Get labels for a specific study"""
        try:
            url = f"{self.orthanc_url}/studies/{study_id}/labels"
            auth = (self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            
            response = requests.get(url, auth=auth)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Error getting study labels: {str(e)}")
            return []

    # old update_study_status with no user_id
    def update_study_status(self, study_id, review_data):
        """Update study quality rating and metadata"""
        try:
            # Store review data
            metadata = {
                'quality_rating': review_data['status'],
                'quality_issues': review_data.get('issues', []),
                'comments': review_data.get('comments', ''),
                'review_timestamp': datetime.now().isoformat(),
                'reviewer': 'AI_Team',
                'version': '1.0'
            }

            # Store as attachment
            response = requests.put(
                f"{self.orthanc_url}/studies/{study_id}/attachments/AI_Review",
                data=json.dumps(metadata),
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()

            # Add quality rating label
            quality_label = f"quality_{review_data['status']}"
            requests.put(
                f"{self.orthanc_url}/studies/{study_id}/labels/{quality_label}",
                data=''
            )

            print(f"Successfully updated study {study_id} with review data")
            return True

        except Exception as e:
            print(f"Error updating study status: {str(e)}")
            raise

    # new update_study_status with user_id
    def update_study_status(self, study_id, project_id, user_id, status):
        """Update study status for a specific user"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.execute('''
                INSERT INTO user_study_status (user_id, study_id, project_id, status)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id, study_id, project_id) 
                DO UPDATE SET status = ?, last_modified = (datetime('now', 'localtime'))
            ''', (user_id, study_id, project_id, status, status))
            conn.commit()

    # old get_all_projects with no user_id
    # def get_all_projects(self):
    #     """Get all active projects with their statistics"""
    #     print("\nFetching all projects...")
    #     with sqlite3.connect(DATABASE_PATH) as conn:
    #         conn.row_factory = sqlite3.Row
    #         projects = []
            
    #         cursor = conn.execute('SELECT * FROM projects WHERE status = ?', ('active',))
    #         all_projects = cursor.fetchall()
    #         print(f"Found {len(all_projects)} projects in database")
            
    #         for project in all_projects:
    #             # Get statistics for each project
    #             stats = conn.execute('''
    #                 SELECT 
    #                     COUNT(*) as total,
    #                     SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed
    #                 FROM studies 
    #                 WHERE project_id = ?
    #             ''', (project['project_id'],)).fetchone()
                
    #             total = stats['total'] or 0
    #             reviewed = stats['reviewed'] or 0
                
    #             project_data = {
    #                 'project_id': project['project_id'],
    #                 'name': project['name'],
    #                 'description': project['description'],
    #                 'type': project['type'],
    #                 'total': total,
    #                 'reviewed': reviewed,
    #                 'progress': (reviewed / total * 100) if total > 0 else 0,
    #                 'roi_labels': json.loads(project['roi_labels']) if project['roi_labels'] else []
    #             }
    #             projects.append(project_data)
    #             # print(f"Project data: {project_data}")
                
    #         return projects

    # new get_all_projects with user_id
    def get_all_projects(self):
        """Get all active projects with their overall statistics"""
        print("\nFetching all projects...")
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            projects = []
            
            # Get all active projects
            cursor = conn.execute('''
                SELECT * FROM projects
            ''')
            all_projects = cursor.fetchall()
            print(f"Found {len(all_projects)} projects in database")
            
            for project in all_projects:
                # Get overall statistics using the user_study_status table
                stats = conn.execute('''
                    SELECT 
                        COUNT(DISTINCT s.study_id) as total,
                        COUNT(DISTINCT CASE WHEN uss.status = 'reviewed' THEN s.study_id END) as reviewed
                    FROM studies s
                    LEFT JOIN user_study_status uss ON 
                        s.study_id = uss.study_id 
                        AND s.project_id = uss.project_id
                    WHERE s.project_id = ?
                ''', (project['project_id'],)).fetchone()
                
                total = stats['total'] or 0
                reviewed = stats['reviewed'] or 0
                
                project_data = {
                    'project_id': project['project_id'],
                    'name': project['name'],
                    'description': project['description'],
                    'type': project['type'],
                    'total': total,
                    'reviewed': reviewed,
                    'progress': (reviewed / total * 100) if total > 0 else 0,
                    'roi_labels': json.loads(project['roi_labels']) if project['roi_labels'] else []
                }
                projects.append(project_data)
                
            return projects
    
    # Add this helper method to data_manager.py
    def check_user_assignments(self):
        """Print current user-project assignments"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            
            print("\nCurrent User-Project Assignments:")
            rows = conn.execute('''
                SELECT u.username, u.role, GROUP_CONCAT(p.name) as projects
                FROM users u
                LEFT JOIN user_projects up ON u.user_id = up.user_id
                LEFT JOIN projects p ON up.project_id = p.project_id
                GROUP BY u.user_id
            ''').fetchall()
            
            for row in rows:
                print(f"\nUser: {row['username']} ({row['role']})")
                print(f"Assigned Projects: {row['projects'] or 'None'}")

    def check_orthanc_connection(self):
        """Test Orthanc connection and list all studies"""
        try:
            # Check if Orthanc is responding
            system_response = requests.get(f"{self.orthanc_url}/system")
            if not system_response.ok:
                print("Cannot connect to Orthanc")
                return
                
            print("Connected to Orthanc successfully")
            
            # List all studies
            studies_response = requests.get(f"{self.orthanc_url}/studies")
            if not studies_response.ok:
                print("Cannot fetch studies")
                return
                
            studies = studies_response.json()
            print(f"\nFound {len(studies)} total studies")
            
            # Get details for each study
            for study_id in studies:
                study_response = requests.get(f"{self.orthanc_url}/studies/{study_id}")
                if study_response.ok:
                    study = study_response.json()
                    print("\nStudy Details:")
                    print(f"ID: {study_id}")
                    print(f"Patient Name: {study.get('PatientMainDicomTags', {}).get('PatientName', 'Unknown')}")
                    print(f"Patient ID: {study.get('PatientMainDicomTags', {}).get('PatientID', 'Unknown')}")
                    
                    # Get labels
                    labels_response = requests.get(f"{self.orthanc_url}/studies/{study_id}/labels")
                    if labels_response.ok:
                        labels = labels_response.json()
                        print(f"Labels: {labels}")
                    else:
                        print("No labels found")
                else:
                    print(f"Cannot fetch details for study {study_id}")
                    
        except Exception as e:
            print(f"Error checking Orthanc: {str(e)}")

    def get_study_slices(self, study_id, min_slice, max_slice):
        """Get CT slices with structure overlay within bounds"""
        try:
            # Get structure bounds from RT struct
            structure_bounds = self.get_structure_bounds(study_id)
            
            # Get slices within range
            slices = []
            for slice_num in range(min_slice, max_slice + 1):
                if slice_num < structure_bounds['min'] - 3 or slice_num > structure_bounds['max'] + 3:
                    continue
                    
                # Get slice image with structure overlay
                slice_url = f"{self.orthanc_url}/studies/{study_id}/preview?slice={slice_num}"
                slices.append({
                    'url': slice_url,
                    'number': slice_num
                })
                
            return slices
        except Exception as e:
            print(f"Error getting slices: {str(e)}")
            return []

    def get_study_ct_files(self, study_id):
        """Get list of CT file paths for a study"""
        try:
            # Create study-specific temp directory
            study_temp_dir = self.temp_base_dir / study_id
            study_temp_dir.mkdir(exist_ok=True)
            
            # Check if files already exist
            existing_files = list(study_temp_dir.glob('*.dcm'))
            if existing_files:
                print(f"Found {len(existing_files)} existing CT files")
                return sorted([str(f) for f in existing_files])
                
            # If no existing files, download them
            response = requests.get(
                f"{self.orthanc_url}/studies/{study_id}/series",
                auth=self.auth
            )
            
            if not response.ok:
                print(f"Error getting series list: {response.text}")
                return []
                
            series_list = response.json()
            ct_files = []
            
            for series in series_list:
                series_id = series['ID']
                series_response = requests.get(
                    f"{self.orthanc_url}/series/{series_id}",
                    auth=self.auth
                )
                
                if not series_response.ok:
                    continue
                    
                series_data = series_response.json()
                
                if series_data.get('MainDicomTags', {}).get('Modality') == 'CT':
                    print(f"Found CT series: {series_id}")
                    
                    for idx, instance_id in enumerate(series_data.get('Instances', [])):
                        file_response = requests.get(
                            f"{self.orthanc_url}/instances/{instance_id}/file",
                            auth=self.auth
                        )
                        
                        if file_response.ok:
                            # Save with index for proper ordering
                            file_path = study_temp_dir / f'slice_{idx:04d}.dcm'
                            with open(file_path, 'wb') as f:
                                f.write(file_response.content)
                            ct_files.append(str(file_path))
                            print(f"Saved slice {idx} to {file_path}")
            
            print(f"Retrieved {len(ct_files)} CT files")
            return sorted(ct_files)
            
        except Exception as e:
            print(f"Error getting CT files: {str(e)}")
            traceback.print_exc()
            return []
            
    def cleanup_study_files(self, study_id):
        """Remove temporary files for a study"""
        try:
            study_temp_dir = self.temp_base_dir / study_id
            if study_temp_dir.exists():
                shutil.rmtree(study_temp_dir)
                print(f"Cleaned up temporary files for study {study_id}")
        except Exception as e:
            print(f"Error cleaning up study files: {str(e)}")

    def get_review_status(self, study_id):
        """Get review status for a study"""
        return self.review_db.get(study_id)
    
    def save_review(self, study_id, rating, comments=None):
        """Save review for a study"""
        self.review_db[study_id] = {
            'rating': rating,
            'comments': comments,
            'review_date': datetime.now()
        }
        return True

    def update_review(self, study_id, rating, comments=None):
        """Update existing review"""
        if study_id in self.review_db:
            self.review_db[study_id].update({
                'rating': rating,
                'comments': comments,
                'review_date': datetime.now()
            })
            return True
        return False

    def update_study_review(self, study_id, review_data):
        """Update study review in database"""
        try:
            with sqlite3.connect(DATABASE_PATH) as conn:
                cursor = conn.cursor()
                
                # First update the study status
                cursor.execute("""
                    UPDATE studies 
                    SET status = 'reviewed'
                    WHERE study_id = ?
                """, (study_id,))
                
                # Then insert the review
                cursor.execute("""
                    INSERT INTO reviews (
                        study_id, 
                        project_id,
                        reviewer,
                        quality_rating,
                        comments,
                        issues,
                        review_date,
                        last_modified
                    ) VALUES (?, ?, ?, ?, ?, ?, (datetime('now', 'localtime')), (datetime('now', 'localtime')))
                """, (
                    study_id,
                    review_data['project_id'],
                    review_data['reviewer'],
                    review_data['quality'],
                    review_data['comments'],
                    review_data['issues']
                ))
                
                conn.commit()
                print(f"Review saved for study {study_id}")
                
        except Exception as e:
            print(f"Error updating review: {str(e)}")
            traceback.print_exc()
            raise

    def get_study_review(self, study_id):
        """Get review data for a study from Orthanc labels and metadata"""
        try:
            labels = self.get_study_labels(study_id)
            quality_rating = next((label.split('_')[1] for label in labels 
                                 if label.startswith('quality_')), None)
            
            # Get review metadata from Orthanc attachment
            response = requests.get(
                f"{self.orthanc_url}/studies/{study_id}/attachments/review",
                auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            )
            
            metadata = {}
            if response.status_code == 200:
                metadata = response.json()
            
            return {
                'quality_rating': quality_rating,
                'comments': metadata.get('comments', ''),
                'issues': metadata.get('issues', []),
                'reviewer': metadata.get('reviewer', 'Unknown'),
                'review_date': metadata.get('review_date', 'Unknown')
            }
        except Exception as e:
            print(f"Error getting study review: {str(e)}")
            return None

    def _update_study_labels(self, study_id, labels_to_add):
        """Update study labels in Orthanc"""
        try:
            # Get existing labels
            current_labels = self.get_study_labels(study_id)
            
            # Remove any existing quality labels
            current_labels = [l for l in current_labels 
                            if not l.startswith('quality_')]
            
            # Add new labels
            new_labels = list(set(current_labels + labels_to_add))
            
            # Update in Orthanc
            response = requests.put(
                f"{self.orthanc_url}/studies/{study_id}/labels",
                json=new_labels,
                auth=(self.orthanc_username, self.orthanc_password) 
                    if self.orthanc_username else None
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error updating labels: {str(e)}")
            return False

    def get_study_files(self, study_id, target_dir):
        """Download study files from Orthanc"""
        try:
            # Get all series for this study
            response = requests.get(
                f"{self.orthanc_url}/studies/{study_id}",
                auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            )
            response.raise_for_status()
            study_info = response.json()
            
            # Get series list from study info
            series_list = study_info.get('Series', [])
            if not series_list:
                raise Exception("No series found in study")
                
            # Create target directory
            target_dir = Path(target_dir)
            target_dir.mkdir(parents=True, exist_ok=True)
            
            for series_id in series_list:
                # Get series details using ID directly
                series_response = requests.get(
                    f"{self.orthanc_url}/series/{series_id}",
                    auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
                )
                series_response.raise_for_status()
                series_info = series_response.json()
                
                # Create modality-specific directory
                modality = series_info.get('MainDicomTags', {}).get('Modality', 'UNKNOWN')
                modality_dir = target_dir / modality
                modality_dir.mkdir(exist_ok=True)
                
                # Get instance IDs from series info
                instance_ids = series_info.get('Instances', [])
                
                # Download each instance
                for instance_id in instance_ids:
                    instance_response = requests.get(
                        f"{self.orthanc_url}/instances/{instance_id}/file",
                        auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
                    )
                    instance_response.raise_for_status()
                    
                    # Save to cache
                    file_path = modality_dir / f"{instance_id}.dcm"
                    file_path.write_bytes(instance_response.content)
                    
            return True
            
        except Exception as e:
            print(f"Error getting study files: {str(e)}")
            return False

    def _get_series_info(self, series_id):
        """Get series information directly using series ID"""
        try:
            # Make sure we're using just the ID string
            if isinstance(series_id, dict):
                series_id = series_id.get('ID', '')
            elif isinstance(series_id, str):
                # If it's a string but looks like a dict, try to extract ID
                if series_id.startswith('{'):
                    import json
                    try:
                        series_dict = json.loads(series_id.replace("'", '"'))
                        series_id = series_dict.get('ID', '')
                    except:
                        pass
            
            response = requests.get(
                f"{self.orthanc_url}/series/{series_id}",
                auth=(self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting series info: {str(e)}")
            return None

    def get_study_info(self, study_id):
        """Get study information in a safe format"""
        try:
            url = f"{self.orthanc_url}/studies/{study_id}"
            auth = (self.orthanc_username, self.orthanc_password) if self.orthanc_username else None
            
            print(f"Fetching study info for {study_id}")
            
            response = requests.get(url, auth=auth)
            if response.status_code != 200:
                print(f"Error response from Orthanc: {response.status_code}")
                return self._get_default_study_info()
                
            study_data = response.json()
            print(f"Received study data: {study_data.keys()}")
            
            # Get the CT series specifically
            series_list = study_data.get('Series', [])
            ct_series = []
            
            # Get detailed series info to find CT series
            for series_id in series_list:
                series_url = f"{self.orthanc_url}/series/{series_id}"
                series_response = requests.get(series_url, auth=auth)
                if series_response.status_code == 200:
                    series_info = series_response.json()
                    if series_info.get('MainDicomTags', {}).get('Modality') == 'CT':
                        ct_series.append(series_info)
            
            if not ct_series:
                print("No CT series found")
                return self._get_default_study_info()
                
            # Use the first CT series for slice count
            first_ct = ct_series[0]
            total_slices = len(first_ct.get('Instances', []))
            
            # Extract and format the data we need
            patient_tags = study_data.get('PatientMainDicomTags', {})
            study_tags = study_data.get('MainDicomTags', {})
            
            formatted_info = {
                'patient_name': patient_tags.get('PatientName', 'Unknown'),
                'patient_id': patient_tags.get('PatientID', 'Unknown'),
                'study_date': study_tags.get('StudyDate', ''),
                'study_description': study_tags.get('StudyDescription', 'Unknown'),
                'total_slices': total_slices,
                'accession_number': study_tags.get('AccessionNumber', ''),
                'modality': study_tags.get('Modality', 'Unknown')
            }
            
            print(f"Formatted info: {formatted_info}")
            return formatted_info
            
        except Exception as e:
            print(f"Error getting study info: {str(e)}")
            traceback.print_exc()  # Add traceback for better debugging
            return self._get_default_study_info()

# old project studies function no user
    # def get_project_studies(self, project_id, status=None):
    #     """Get all studies for a project, optionally filtered by status"""
    #     # print(f"\nFetching studies for project {project_id} with status {status}")
        
    #     with sqlite3.connect(DATABASE_PATH) as conn:
    #         conn.row_factory = sqlite3.Row
            
    #         query = '''
    #             SELECT * FROM studies 
    #             WHERE project_id = ?
    #         '''
    #         params = [project_id]
            
    #         if status == 'unreviewed':
    #             query += ' AND status = ?'
    #             params.append(status)
    #         elif status == 'in_progress':
    #             pass
    #         elif status == 'reviewed':
    #             query = '''
    #                 SELECT * FROM reviews
    #                 WHERE project_id = ?
    #             '''            
    #         studies = conn.execute(query, params).fetchall()
    #         result = [dict(study) for study in studies]
            
    #         # print(f"Found {len(result)} studies")
    #         # for study in result:
    #         #     print(f"Study: {study}")
            
    #         return result
        
    # new project study function with user
    def get_project_studies(self, project_id, status=None, user_id=None):
        """Get studies for a project with user-specific status"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            if status == 'reviewed':
                completed = conn.execute('''
                    SELECT 
                        s.*,
                        r.quality_rating,
                        r.last_modified as review_date,
                        r.comments,
                        u.username as reviewer
                    FROM studies s
                    JOIN reviews r ON s.study_id = r.study_id AND s.project_id = r.project_id
                    JOIN users u ON r.user_id = u.user_id
                    WHERE s.project_id = ? 
                    AND r.user_id = ?
                    ORDER BY review_date DESC
                ''', (project_id, user_id)).fetchall()
                return [dict(row) for row in completed]
            query = '''
                SELECT 
                    s.*,
                    COALESCE(uss.status, 'unreviewed') as status,
                    r.quality_rating,
                    r.comments,
                    r.last_modified as review_date
                FROM studies s
                LEFT JOIN user_study_status uss ON 
                    s.study_id = uss.study_id 
                    AND s.project_id = uss.project_id
                    AND uss.user_id = ?
                LEFT JOIN reviews r ON 
                    s.study_id = r.study_id 
                    AND s.project_id = r.project_id
                    AND r.user_id = ?
                WHERE s.project_id = ?
            '''
            params = [user_id, user_id, project_id]
            
            if status:
                query += ' AND COALESCE(uss.status, \'unreviewed\') = ?'
                params.append(status)
                
            # query += ' ORDER BY s.study_date DESC'
            
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    def add_project(self, project_id, name, description, created_date, status='active', project_type='quality_assessment', roi_labels=None):
        """Add a new project to the database"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            try:
                conn.execute('''
                    INSERT INTO projects (project_id, name, description, created_date, status, type, roi_labels)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, name, description, created_date, status, project_type, 
                     json.dumps(roi_labels) if roi_labels else None))
                return True
            except sqlite3.IntegrityError:
                print(f"Project {project_id} already exists")
                return False

    def get_project(self, project_id):
        """Get project details"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            project = conn.execute('''
                SELECT * FROM projects WHERE project_id = ?
            ''', (project_id,)).fetchone()
            
            if project:
                return dict(project)
            return None

    def add_study(self, study_id, project_id, patient_info, orthanc_id, cache_path=None):
        """Add a new study to the database"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            try:
                conn.execute('''
                    INSERT INTO studies (
                        study_id, project_id, patient_id, patient_name, 
                        study_date, study_description, orthanc_id, cache_path
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    study_id, project_id, 
                    patient_info.get('patient_id'), 
                    patient_info.get('patient_name'),
                    patient_info.get('study_date'), 
                    patient_info.get('study_description'),
                    orthanc_id, cache_path
                ))
                return True
            except sqlite3.IntegrityError:
                print(f"Study {study_id} already exists")
                return False

    def get_project_studies_by_status(self, project_id):
        """Get studies grouped by status for project dashboard"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            return {
                'unreviewed': [dict(row) for row in conn.execute('''
                    SELECT s.*, r.quality_rating 
                    FROM studies s 
                    LEFT JOIN reviews r ON s.study_id = r.study_id
                    WHERE s.project_id = ? AND s.status = 'unreviewed'
                ''', (project_id,)).fetchall()],
                'in_progress': [dict(row) for row in conn.execute('''
                    SELECT s.*, r.quality_rating 
                    FROM studies s 
                    LEFT JOIN reviews r ON s.study_id = r.study_id
                    WHERE s.project_id = ? AND s.status = 'in_progress'
                ''', (project_id,)).fetchall()],
                'completed': [dict(row) for row in conn.execute('''
                    SELECT s.*, r.quality_rating 
                    FROM studies s 
                    LEFT JOIN reviews r ON s.study_id = r.study_id
                    WHERE s.project_id = ? AND s.status = 'reviewed'
                ''', (project_id,)).fetchall()]
            }

    def init_projects(self):
        """Initialize projects from config in the database"""
        print("\nInitializing projects from config...")
        with sqlite3.connect(DATABASE_PATH) as conn:
            for project_id, info in PROJECTS[ORTHANC_NAME].items():
                try:
                    print(f"Adding project: {project_id}")
                    conn.execute('''
                        INSERT OR REPLACE INTO projects 
                        (project_id, name, description, created_date, status, type, roi_labels)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        project_id,
                        info['name'],
                        info.get('description', ''),
                        info.get('created_date', ''),
                        info.get('status', 'active'),
                        info.get('type', 'quality_assessment'),
                        json.dumps(info.get('roi_labels', []))
                    ))
                    conn.commit()
                    print(f"Successfully added project: {project_id}")
                except Exception as e:
                    print(f"Error initializing project {project_id}: {str(e)}")

    def init_user_projects(self):
        """Initialize default project assignments for users"""
        try:
            print("\nInitializing user project assignments...")
            
            # Define default assignments
            assignments = {
                1: ['Nov24test', 'Dec24study'],  # admin gets these projects
                2: ['q2ln3', '2425Q2_HN_Nodes'],  # reviewer1 gets these
                3: ['2425Q2_HN_Nodes'],  # reviewer2 gets this one
                4: ['medai', 'planning', 'contouring']  # reviewer3 gets this one
            }
            
            for user_id, project_ids in assignments.items():
                self.assign_projects_to_user(user_id, project_ids)
                print(f"Assigned projects {project_ids} to user {user_id}")
                
        except Exception as e:
            print(f"Error initializing user projects: {str(e)}")
            traceback.print_exc()

    def _verify_db(self):
        """Verify database tables and schema"""
        print("\nVerifying database schema...")
        with sqlite3.connect(DATABASE_PATH) as conn:
            # Check projects table
            projects = conn.execute("SELECT * FROM sqlite_master WHERE type='table' AND name='projects'").fetchone()
            if projects:
                print("Projects table exists")
                columns = conn.execute("PRAGMA table_info(projects)").fetchall()
                print("Projects columns:", [col[1] for col in columns])
            else:
                print("Projects table missing!")

            # Check studies table
            studies = conn.execute("SELECT * FROM sqlite_master WHERE type='table' AND name='studies'").fetchone()
            if studies:
                print("Studies table exists")
                columns = conn.execute("PRAGMA table_info(studies)").fetchall()
                print("Studies columns:", [col[1] for col in columns])
            else:
                print("Studies table missing!")

    def sync_project_studies(self, project_id, batch_size=100, start_date=None, end_date=None):
        """
        Sync studies for a specific project with batching and filtering
        
        Args:
            project_id: The project identifier to sync
            batch_size: Number of studies to process in each batch
            start_date: Optional start date filter (YYYYMMDD format)
            end_date: Optional end date filter (YYYYMMDD format)
        """
        print(f"\nSyncing studies for project: {project_id}")
        
        try:
            # Verify project exists
            if project_id not in PROJECTS[ORTHANC_NAME]:
                raise ValueError(f"Project {project_id} not found in configuration")
            
            # Get studies with project label
            studies = self.orthanc.studies.find_by_label(project_id)
            total_studies = len(studies)
            print(f"Found {total_studies} studies with label {project_id}")
            
            # Process in batches
            with sqlite3.connect(DATABASE_PATH) as conn:
                for i in range(0, total_studies, batch_size):
                    batch = studies[i:i + batch_size]
                    print(f"Processing batch {i//batch_size + 1} ({len(batch)} studies)")
                    
                    for study_id in batch:
                        try:
                            study = self.orthanc.studies.get(study_id)
                            main_dicom = study.get('MainDicomTags', {})
                            
                            # Apply date filter if specified
                            study_date = main_dicom.get('StudyDate', '')
                            if start_date and study_date < start_date:
                                continue
                            if end_date and study_date > end_date:
                                continue
                            
                            # Insert or update study
                            conn.execute('''
                                INSERT OR REPLACE INTO studies (
                                    study_id, project_id, patient_id, patient_name,
                                    study_date, study_description, orthanc_id, status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                study_id,
                                project_id,
                                main_dicom.get('PatientID', 'Unknown'),
                                main_dicom.get('PatientName', 'Unknown'),
                                study_date,
                                main_dicom.get('StudyDescription', ''),
                                study_id,
                                'unreviewed'
                            ))
                            
                        except Exception as e:
                            print(f"Error processing study {study_id}: {str(e)}")
                    
                    # Commit each batch
                    conn.commit()
                    print(f"Completed batch {i//batch_size + 1}")
                    
            print(f"Sync completed for project {project_id}")
            
        except Exception as e:
            print(f"Error syncing project {project_id}: {str(e)}")
            raise

    def sync_selected_projects(self, project_ids=None, **kwargs):
        """
        Sync multiple projects
        
        Args:
            project_ids: List of project IDs to sync. If None, uses active projects from config
            **kwargs: Additional arguments passed to sync_project_studies
        """
        if project_ids is None:
            project_ids = [pid for pid, info in PROJECTS[ORTHANC_NAME].items() 
                          if info.get('status') == 'active']
        
        for project_id in project_ids:
            self.sync_project_studies(project_id, **kwargs)

    def generate_project_report(self, project_id):
        """Generate a comprehensive project report"""
        stats = self.get_project_stats(project_id)
        reviewer_perf = self.get_reviewer_performance(project_id)
        
        report = {
            'project': self.get_project(project_id),
            'summary': {
                'total_studies': stats['total_studies'],
                'completion_rate': (
                    stats['status_counts'].get('reviewed', 0) / 
                    stats['total_studies'] * 100 if stats['total_studies'] > 0 else 0
                ),
                'active_reviewers': len(reviewer_perf),
                'quality_stats': {
                    'average': sum(
                        rating * count 
                        for rating, count in stats['quality_distribution'].items()
                    ) / sum(stats['quality_distribution'].values()) 
                    if stats['quality_distribution'] else 0,
                    'distribution': stats['quality_distribution']
                }
            },
            'reviewer_performance': reviewer_perf,
            'recent_activity': stats['recent_activity']
        }
        
        return report

    def sync_development_data(self):
        """Sync data from development Orthanc instance"""
        try:
            print("\nSyncing development data from Orthanc...")
            
            # Get studies from Orthanc
            response = self.session.get(f"{self.orthanc_url}/studies")
            response.raise_for_status()
            studies = response.json()
            
            print(f"Found {len(studies)} studies in development Orthanc")
            
            with sqlite3.connect(DATABASE_PATH) as conn:
                for study_id in studies:
                    try:
                        # Get study details
                        response = self.session.get(f"{self.orthanc_url}/studies/{study_id}")
                        response.raise_for_status()
                        study = response.json()
                        
                        # Get labels
                        response = self.session.get(f"{self.orthanc_url}/studies/{study_id}/labels")
                        response.raise_for_status()
                        labels = response.json()
                        
                        print(f"\nProcessing study {study_id}")
                        print(f"Labels: {labels}")
                        print(f"Study data: {json.dumps(study, indent=2)}")
                        print(f"Available Projects: {PROJECTS[ORTHANC_NAME].keys()}")
                        
                        # Find matching project from labels
                        project_ids = []
                        for label in labels:
                            if label in PROJECTS[ORTHANC_NAME]:
                                project_ids.append(label)
                        print(f"Matching projects: {project_ids}")

                        for project_id in project_ids:
                            # Get patient info from MainDicomTags
                            main_dicom = study.get('MainDicomTags', {})
                            series = study.get('Series', [])
                            patient_dicom = study.get('PatientMainDicomTags', {})

                            # Try to get patient ID from first series if not in study tags
                            if not main_dicom.get('PatientID'):
                                for series_id in series:
                                    try:
                                        series_response = self.session.get(f"{self.orthanc_url}/series/{series_id}")
                                        series_response.raise_for_status()
                                        series_data = series_response.json()
                                        series_tags = series_data.get('MainDicomTags', {})
                                        if series_tags.get('PatientID'):
                                            main_dicom['PatientID'] = series_tags['PatientID']
                                            break
                                    except Exception as e:
                                        print(f"Error getting series data: {str(e)}")
                            
                            patient_id = main_dicom.get('PatientID', patient_dicom.get('PatientID', 'Unknown'))
                            patient_name = main_dicom.get('PatientName', patient_dicom.get('PatientName', 'Unknown'))

                            print(f"Adding study {study_id} to project: {project_id}")
                            print(f"DICOM tags: {json.dumps(main_dicom, indent=2)}")
                            
                            # Before the insert, check if the combination exists
                            existing = conn.execute('''
                                SELECT 1 FROM studies WHERE study_id = ? AND project_id = ?
                            ''', (study_id, project_id)).fetchone()

                            if not existing:
                                # removed status from the insert for new schema
                                conn.execute('''
                                    INSERT OR IGNORE INTO studies (
                                        study_id, project_id, patient_id, patient_name,
                                        study_date, study_description, orthanc_id
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                                ''', (
                                    study_id,
                                    project_id,
                                    patient_id,
                                    patient_name,
                                    main_dicom.get('StudyDate', ''),
                                    main_dicom.get('StudyDescription', ''),
                                    study_id,
                                ))
                                print(f"Successfully added study {study_id} with status 'unreviewed'")

                            else:
                                print(f"Study {study_id} with project {project_id} already exists.")

                        # else:
                        #     print(f"No matching project found for study {study_id}")
                            
                    except Exception as e:
                        print(f"Error processing study {study_id}: {str(e)}")
                        traceback.print_exc()
                
                conn.commit()
                print("\nDevelopment data sync completed")
                
        except Exception as e:
            print(f"Error syncing development data: {str(e)}")
            raise

    def get_study(self, study_id):
        """Get study details"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            study = conn.execute('''
                SELECT * FROM studies WHERE study_id = ?
            ''', (study_id,)).fetchone()
            
            if study:
                return dict(study)
            return None

    def get_review(self, study_id):
        """Get review data for a study"""
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            review = conn.execute('''
                SELECT * FROM reviews 
                WHERE study_id = ?
                ORDER BY review_date DESC
                LIMIT 1
            ''', (study_id,)).fetchone()
            
            if review:
                return dict(review)
            return None
