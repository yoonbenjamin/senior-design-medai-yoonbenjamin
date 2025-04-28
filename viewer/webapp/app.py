import sys
from pathlib import Path
from datetime import datetime, date
from functools import lru_cache
import os
import traceback
import requests
from flask import Response
import io
import base64
import sqlite3
import json
import threading
from flask import session

# Add parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

# Now we can import from the parent directory
from config import ORTHANC_URL, ORTHANC_NAME, DATABASE_NAME, ORTHANC_USERNAME, ORTHANC_PASSWORD, PROJECTS
from data_manager import OrthancDataManager
from dicom_handler import DicomHandler
from flask import Flask, render_template, jsonify, request, flash, redirect, url_for

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.secret_key = 'dev'  # For flash messages

# Define cache directories
BASE_DIR = Path(__file__).parent.parent
CACHE_DIR = BASE_DIR / 'cache' / ORTHANC_NAME
TEMP_DIR = BASE_DIR / 'temp' / ORTHANC_NAME
DATABASE_PATH = os.path.join(BASE_DIR, 'dbs', 'user-tests.db')

# Create directories if they don't exist
CACHE_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Initialize data manager with config
data_manager = OrthancDataManager(
    orthanc_url=ORTHANC_URL,
    orthanc_username=ORTHANC_USERNAME,
    orthanc_password=ORTHANC_PASSWORD
)

def create_app():
    print("\nLoading environment:", os.getenv('ENVIRONMENT', 'local'))
    
    print("\nEnvironment Variables:")
    print(f"ENVIRONMENT: {os.getenv('ENVIRONMENT')}")
    print(f"ORTHANC_URL: {ORTHANC_URL}")
    print(f"ORTHANC_USERNAME: {ORTHANC_USERNAME}")
    print(f"ORTHANC_PASSWORD: {'*' * len(ORTHANC_PASSWORD) if ORTHANC_PASSWORD else 'None'}")
    
    # Ensure cache directory exists
    CACHE_DIR.mkdir(exist_ok=True)
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY='dev-key-for-development-only',
        SEND_FILE_MAX_AGE_DEFAULT=300,  # 5 minutes cache
        MAX_CONTENT_LENGTH=50 * 1024 * 1024  # 50MB max-size
    )
    
    # Initialize handler cache
    global handler_cache
    handler_cache = {}
    
    #  Initialize projects and sync with Orthanc upon start of app
    # data_manager.sync_development_data()

    return app

# Create the app instance
app = create_app()

# Global cache for DicomHandlers
dicom_handlers = {}
handler_cache = {}
handler_lock = threading.Lock()

@app.route('/api/sync-data')
def sync_development_data():
    """Sync development data with Orthanc, storing in database."""
    try:
        data_manager.sync_development_data()
        return jsonify({'status': 'success'})   
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
def get_or_create_handler(study_id, study_cache, roi_labels=None):
    """Thread-safe handler creation and caching"""
    with handler_lock:
        if study_id not in handler_cache:
            handler = DicomHandler(study_id, study_cache, roi_labels, debug=False)
            handler.load_study_data()
            handler_cache[study_id] = handler
        return handler_cache[study_id]
    
# Add cleanup route for handler cache
@app.route('/api/cleanup-cache', methods=['POST'])
def cleanup_handler_cache():
    """Clean up handler cache"""
    try:
        with handler_lock:
            handler_cache.clear()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
# Add health check route
@app.route('/api/health')
def health_check():
    """Quick health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'cache_size': len(handler_cache),
        'memory_usage': get_memory_usage()
    })

def get_memory_usage():
    """Get current memory usage"""
    import psutil
    process = psutil.Process()
    return {
        'rss': process.memory_info().rss / 1024 / 1024,  # MB
        'vms': process.memory_info().vms / 1024 / 1024   # MB
    }

@lru_cache(maxsize=128)
def get_slice_image(study_id, slice_index):
    """Cached slice image getter"""
    try:
        print(f"\nDEBUG: get_slice_image")
        print(f"Study ID: {study_id}")
        print(f"Slice Index: {slice_index}")
        
        if study_id not in dicom_handlers:
            study_cache = CACHE_DIR / study_cache
            print(f"Loading from cache: {study_cache}")
            
            # Get project ROI labels for this study
            with sqlite3.connect(DATABASE_PATH) as conn:
                cursor = conn.cursor()
                study = cursor.execute("""
                    SELECT project_id FROM studies WHERE study_id = ?
                """, (study_id,)).fetchone()
                
                if study:
                    project_id = study[0]
                    result = cursor.execute("""
                        SELECT roi_labels 
                        FROM projects 
                        WHERE project_id = ?
                    """, (project_id,)).fetchone()
                    
                    roi_labels = json.loads(result[0]) if result and result[0] else []
                    print(f"Using ROI labels: {roi_labels}")
                else:
                    roi_labels = []
            
            # Initialize handler with ROI labels
            dicom_handlers[study_id] = DicomHandler(study_id, study_cache, roi_labels)
            dicom_handlers[study_id].load_study_data()
            
            # Print the mapping between slice index and position
            positions = dicom_handlers[study_id].slice_positions
            print("\nSlice Index to Position Mapping:")
            for idx, pos in enumerate(positions):
                print(f"Index {idx:3d} -> Position {pos:8.2f}")
        
        return dicom_handlers[study_id].get_slice_image(slice_index=slice_index)
        
    except Exception as e:
        print(f"Error in get_slice_image: {str(e)}")
        traceback.print_exc()
        return None

@app.route('/')
def index():
    """Home page showing all projects"""
    print("\n=== Loading Home Page ===")
    try:
        # Verify database structure
        data_manager._verify_db()
        
        # Initialize projects and sync with Orthanc
        data_manager.init_projects()
        
        # Get all users for the dropdown
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            users = conn.execute('SELECT * FROM users').fetchall()
        
        # Get current user from session
        current_user = session.get('user_id')
        
        # Get projects (filtered by user if one is selected)
        if current_user:
            projects = data_manager.get_user_projects(current_user)
        else:
            projects = data_manager.get_all_projects()
            
        return render_template('index.html', 
                             projects=projects,
                             users=users,
                             current_user=current_user)
    except Exception as e:
        print(f"Error loading projects: {str(e)}")
        traceback.print_exc()
        flash(f'Error loading projects: {str(e)}', 'error')
        return render_template('index.html', projects=[], users=[])
    
@app.route('/set-user', methods=['POST'])
def set_user():
    """Set the current user"""
    user_id = request.form.get('user_id')
    if user_id:
        user_id = int(user_id)
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            user = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()
            if user:
                session['user_id'] = user_id
                session['username'] = user['username']  # Store username in session
    else:
        session.pop('user_id', None)
        session.pop('username', None)
    return redirect(url_for('index'))

# new project dashboard route with user_id
@app.route('/project/<project_name>')
def project_dashboard(project_name):
    """Project-specific dashboard"""
    try:
        # Get current user from session
        user_id = session.get('user_id')
        if not user_id:
            flash('Please select a user first', 'error')
            return redirect(url_for('index'))
        
        # Get project details
        project = data_manager.get_project(project_name)
        if not project:
            flash(f'Project {project_name} not found', 'error')
            return redirect(url_for('index'))
        
        project['project_id'] = project_name

        # Get studies by status with user_id
        unreviewed = data_manager.get_project_studies(project_name, status='unreviewed', user_id=user_id)
        in_progress = data_manager.get_project_studies(project_name, status='in_progress', user_id=user_id)
        completed = data_manager.get_project_studies(project_name, status='reviewed', user_id=user_id)

        # Get basic stats with user_id
        stats = data_manager.get_project_stats(project_name, user_id)
        
        return render_template('project_dashboard.html',
                             project=project,
                             unreviewed=unreviewed,
                             in_progress=in_progress,
                             completed=completed,
                             stats=stats,
                             session=session)
    except Exception as e:
        print(f"Error loading project dashboard: {str(e)}")
        traceback.print_exc()
        flash(f'Error loading project dashboard: {str(e)}', 'error')
        return redirect(url_for('index'))
    
# NEW review route that includes project_id
@app.route('/project/<project_id>/review/<study_id>')
def review_project_study(project_id, study_id):
    """Review a specific study within a project"""
    try:
        # Get study from database with project validation
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            study = conn.execute('''
                SELECT * FROM studies 
                WHERE study_id = ? AND project_id = ?
            ''', (study_id, project_id)).fetchone()
            
            if not study:
                flash('Study not found or does not belong to this project', 'error')
                return redirect(url_for('project_dashboard', project_name=project_id))
            
            study = dict(study)  # Convert row to dict
        
        # Get ROI labels - use caching
        roi_labels = get_cached_roi_labels(project_id)
        
        # Get study files if needed
        study_cache = CACHE_DIR / study_id
        if not study_cache.exists():
            data_manager.get_study_files(study_id, study_cache)
        
        # Initialize handler to get total slices
        handler = get_or_create_handler(study_id, study_cache, roi_labels)
        total_slices = len(handler.series_data) if handler.series_data else 0
        first_slice = handler.find_first_contour_slice()
        
        # Get project details
        project = data_manager.get_project(project_id)
        
        # Render template with minimal data
        return render_template('review.html',
                             study=study,
                             project={'id': project_id},
                             total_slices=total_slices,
                             roi_labels=roi_labels,
                             first_slice=first_slice)
                             
    except Exception as e:
        print(f"Error in review_project_study: {str(e)}")
        traceback.print_exc()
        flash(f'Error loading review page: {str(e)}', 'error')
        return redirect(url_for('project_dashboard', project_name=project_id))

# Update the review route to include project_id
@app.route('/api/project/<project_id>/study/<study_id>/prepare', methods=['POST'])
def prepare_study(project_id, study_id):
    """Prepare study files for viewing"""
    try:
        # Verify study belongs to project
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            study = cursor.execute("""
                SELECT study_id 
                FROM studies 
                WHERE study_id = ? AND project_id = ?
            """, (study_id, project_id)).fetchone()
            
            if not study:
                return jsonify({
                    'status': 'error',
                    'message': 'Study not found or does not belong to this project'
                }), 404
        
        # Get study cache path
        study_cache = CACHE_DIR / study_id
        
        # Only proceed if files aren't already cached
        if not study_cache.exists():
            data_manager.get_study_files(study_id, study_cache)

        roi_labels = get_cached_roi_labels(project_id)
        handler = get_or_create_handler(study_id, study_cache, roi_labels)

        return jsonify({
            'status': 'success',
            'message': 'Study prepared successfully'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
# Cache ROI labels
@lru_cache(maxsize=32)
def get_cached_roi_labels(project_id):
    """Get cached ROI labels for a project"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            result = cursor.execute("""
                SELECT roi_labels 
                FROM projects 
                WHERE project_id = ?
            """, (project_id,)).fetchone()
            
            return json.loads(result[0]) if result and result[0] else []
    except Exception:
        return []

@app.route('/get_slice/<study_id>/<int:slice_index>')
def get_raw_dicom_slice(study_id, slice_index):
    """Get a specific slice from the study as raw DICOM data"""
    try:
        # Get series list
        response = data_manager.session.get(f"{data_manager.orthanc_url}/studies/{study_id}/series")
        series_list = response.json()
        
        # Get first series instances
        response = data_manager.session.get(f"{data_manager.orthanc_url}/series/{series_list[0]}/instances")
        instances = response.json()
        
        if slice_index >= len(instances):
            return "Slice index out of range", 404
            
        # Get specific instance
        instance_id = instances[slice_index]
        
        # Get DICOM data
        response = data_manager.session.get(
            f"{data_manager.orthanc_url}/instances/{instance_id}/file", 
            stream=True
        )
        
        return Response(
            response.raw.read(),
            content_type='application/dicom',
            headers={'X-Content-Type-Options': 'nosniff'}
        )
        
    except Exception as e:
        print(f"Error getting slice: {str(e)}")
        return str(e), 500

@app.route('/get_slice_count/<study_id>')
def get_slice_count(study_id):
    """Get the total number of slices in a study"""
    try:
        # Get series list
        response = data_manager.session.get(f"{data_manager.orthanc_url}/studies/{study_id}/series")
        series_list = response.json()
        
        # Get first series instances
        response = data_manager.session.get(f"{data_manager.orthanc_url}/series/{series_list[0]}/instances")
        instances = response.json()
        
        return jsonify({'count': len(instances)})
        
    except Exception as e:
        print(f"Error getting slice count: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>/next-patient/<current_study_id>')
def get_next_patient(project_id, current_study_id):
    """API endpoint to get the next unreviewed patient"""
    try:
        unreviewed = data_manager.get_project_studies(project_id, status='unreviewed')
        # Find the next study after the current one
        for i, study in enumerate(unreviewed):
            if study['study_id'] == current_study_id and i + 1 < len(unreviewed):
                return jsonify({'nextStudyId': unreviewed[i + 1]['study_id']})
        return jsonify({'nextStudyId': None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>/patients/<status>')
def get_project_patients(project_id, status):
    """API endpoint to get patients for a project"""
    try:
        project_info = PROJECTS[ORTHANC_NAME].get(project_id)
        if not project_info:
            return jsonify([])
            
        patients = data_manager.get_project_patients(project_info['label'], status)
        return jsonify(patients)
    except Exception as e:
        print(f"Error getting patients: {str(e)}")
        return jsonify([])

@app.route('/api/check-orthanc')
def check_orthanc():
    """Debug endpoint to check Orthanc status"""
    data_manager.check_orthanc_connection()
    return jsonify({"message": "Check console for Orthanc status"})

@app.route('/api/studies/<study_id>/slices')
def get_study_slices(study_id):
    """Get relevant CT slices for a study"""
    try:
        min_slice = request.args.get('min', type=int)
        max_slice = request.args.get('max', type=int)
        
        # Get slices from Orthanc with structure overlay
        slices = data_manager.get_study_slices(study_id, min_slice, max_slice)
        return jsonify(slices)
    except Exception as e:
        print(f"Error getting slices: {str(e)}")
        return jsonify([])

@app.route('/api/study/<study_id>/slice/<int:slice_index>')
def get_slice(study_id, slice_index):
    """Optimized route for getting slice images"""
    try:
        # Get parameters once
        window = request.args.get('window', type=int, default=400)
        level = request.args.get('level', type=int, default=40)
        opacity = request.args.get('opacity', type=float, default=0.5)
        
        # Get study cache path
        study_cache = CACHE_DIR / study_id
        
        # Ensure cache directory exists
        if not study_cache.exists():
            with handler_lock:  # Thread-safe file operations
                if not study_cache.exists():
                    data_manager.get_study_files(study_id, study_cache)
        
        # Get handler from cache
        handler = get_or_create_handler(study_id, study_cache)
        
        # Get the slice image
        result = handler.get_slice_image(
            slice_index=slice_index,
            window=window,
            level=level,
            overlay_opacity=opacity
        )
        
        # Return minimal response
        if result and 'image' in result:
            return jsonify({
                'status': 'success',
                'image': result['image']
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to get image'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/study/<study_id>/info')
def get_study_info(study_id):
    """Get study information for viewer"""
    try:
        study_cache = CACHE_DIR / study_id
        dicom_handler = DicomHandler(study_id, study_cache)
        
        if not dicom_handler.is_loaded():
            data_manager.get_study_files(study_id, study_cache)
            dicom_handler.load_study_data()
            
        return jsonify(dicom_handler.get_series_info())
    except Exception as e:
        print(f"Error getting study info: {str(e)}")
        return jsonify({'error': str(e)}), 500

# New route for cleaning up project data
@app.route('/project/<project_id>/cleanup', methods=['POST'])
def cleanup_project_data(project_id):
    """Clean up temporary DICOM files for an entire project"""
    try:
        # Get all studies in project
        studies = data_manager.get_project_studies(project_id)
        for study in studies:
            data_manager.cleanup_study_files(study['id'])
        flash('Successfully cleaned up temporary files', 'success')
    except Exception as e:
        flash(f'Error cleaning up files: {str(e)}', 'error')
    
    return redirect(url_for('project_dashboard', project_id=project_id))
    
# new submit review route with user_id
@app.route('/api/submit-review', methods=['POST'])
def submit_review():
    """Submit a review"""
    try:
        review_data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'No user selected'
            }), 401
        
        if not review_data:
            return jsonify({
                'status': 'error',
                'message': 'No review data provided'
            }), 400
            
        required_fields = ['study_id', 'project_id', 'quality']
        if not all(field in review_data for field in required_fields):
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400

        current_date = date.today()
        review_data['review_date'] = current_date
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.execute('BEGIN TRANSACTION')
            
            # Update user-specific study status
            conn.execute('''
                INSERT INTO user_study_status (user_id, study_id, project_id, status)
                VALUES (?, ?, ?, 'reviewed')
                ON CONFLICT (user_id, study_id, project_id) 
                DO UPDATE SET status = 'reviewed', last_modified = (datetime('now', 'localtime'))
            ''', (user_id, review_data['study_id'], review_data['project_id']))
            
            # Insert review
            conn.execute('''
                INSERT INTO reviews (
                    study_id,
                    project_id,
                    user_id,
                    review_date,
                    quality_rating,
                    issues,
                    comments
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                review_data['study_id'],
                review_data['project_id'],
                user_id,
                review_data['review_date'],
                review_data['quality'],
                review_data.get('issues', ''),
                review_data.get('comments', '')
            ))
            
            conn.commit()
            
        return jsonify({
            'status': 'success',
            'message': 'Review submitted successfully'
        })
        
    except Exception as e:
        print(f"Error submitting review: {e}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
@app.route('/api/check-assignments')
def check_assignments():
    """Debug endpoint to check user assignments"""
    data_manager.check_user_assignments()
    return jsonify({"message": "Check console for assignments"})

@app.route('/api/check-database')
def check_database():
    """Debug endpoint to check database status"""
    try:
        print("\n=== Starting Database Status Check ===")
        
        # First verify the database file exists
        if not Path(DATABASE_PATH).exists():
            print("Database file not found!")
            return jsonify({
                'status': 'error',
                'message': 'Database file not found'
            }), 404
            
        print("Database file found: reviews.db")
        
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Get all tables
            print("\nQuerying tables...")
            tables = cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table'
                ORDER BY name;
            """).fetchall()
            
            if not tables:
                print("No tables found in database!")
                return jsonify({
                    'status': 'error',
                    'message': 'No tables found in database'
                }), 404
            
            table_info = {}
            print(f"\nFound {len(tables)} tables:")
            
            for table in tables:
                table_name = table[0]
                print(f"\nExamining table: {table_name}")
                
                # Get schema
                schema = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
                print(f"Columns in {table_name}:")
                for col in schema:
                    print(f"  - {col[1]} ({col[2]})")
                
                # Get row count
                count = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
                print(f"Row count: {count}")
                
                table_info[table_name] = {
                    'columns': [{'name': col[1], 'type': col[2]} for col in schema],
                    'row_count': count
                }
            
            print("\n=== Database Check Complete ===")
            
            return jsonify({
                'status': 'success',
                'database_exists': True,
                'tables': table_info
            })
            
    except sqlite3.Error as e:
        print(f"SQLite error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Database error: {str(e)}'
        }), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Unexpected error: {str(e)}'
        }), 500
    
# new route for getting review with user_id
@app.route('/api/review/<study_id>')
def get_review(study_id):
    """Get review details for a study for the current user"""
    try:
        # Get current user from session
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'No user selected'
            }), 401

        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Get review with user information
            review = cursor.execute("""
                SELECT 
                    r.*,
                    u.username as reviewer_name
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.study_id = ?
                AND r.user_id = ?
                ORDER BY r.review_date DESC
                LIMIT 1
            """, (study_id, user_id)).fetchone()
            
            if review:
                columns = [description[0] for description in cursor.description]
                review_dict = dict(zip(columns, review))
                
                # Format the review data for the frontend
                formatted_review = {
                    'study_id': review_dict['study_id'],
                    'quality_rating': review_dict['quality_rating'],
                    'reviewer': review_dict['reviewer_name'],  # Use username instead of user_id
                    'review_date': review_dict['last_modified'],
                    'comments': review_dict['comments'],
                    'issues': review_dict['issues']
                }
                
                return jsonify({
                    'status': 'success',
                    'review': formatted_review
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'No review found for this user and study'
                }), 404
                
    except Exception as e:
        print(f"Error getting review: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# new route for getting next study with user_id
@app.route('/api/project/<project_id>/next-study/<current_study_id>')
def get_next_study(project_id, current_study_id):
    """Get the next unreviewed study in the project for the current user"""
    try:
        # Get current user from session
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'No user selected'
            }), 401

        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Get next unreviewed study using user_study_status table
            next_study = cursor.execute("""
                SELECT s.study_id
                FROM studies s
                LEFT JOIN user_study_status uss ON 
                    s.study_id = uss.study_id 
                    AND s.project_id = uss.project_id
                    AND uss.user_id = ?
                WHERE s.project_id = ?
                AND (uss.status IS NULL OR uss.status != 'reviewed')
                AND s.study_id > ?
                ORDER BY s.study_id
                LIMIT 1
            """, (user_id, project_id, current_study_id)).fetchone()
            
            if not next_study:
                # If no studies after current one, try from beginning
                next_study = cursor.execute("""
                    SELECT s.study_id
                    FROM studies s
                    LEFT JOIN user_study_status uss ON 
                        s.study_id = uss.study_id 
                        AND s.project_id = uss.project_id
                        AND uss.user_id = ?
                    WHERE s.project_id = ?
                    AND (uss.status IS NULL OR uss.status != 'reviewed')
                    AND s.study_id < ?
                    ORDER BY s.study_id
                    LIMIT 1
                """, (user_id, project_id, current_study_id)).fetchone()
            
            return jsonify({
                'status': 'success',
                'next_study_id': next_study[0] if next_study else None
            })
            
    except Exception as e:
        print(f"Error getting next study: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
@app.route('/api/study/<study_id>/reset', methods=['POST'])
def reset_study_status(study_id):
    """Reset a study's review status to unreviewed"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Update study status back to unreviewed
            cursor.execute("""
                UPDATE studies 
                SET status = 'unreviewed'
                WHERE study_id = ?
            """, (study_id,))
            
            # Optionally, we can also mark the review as archived/invalid
            cursor.execute("""
                UPDATE reviews
                SET last_modified = (datetime('now', 'localtime')),
                    comments = comments || ' [RESET]'
                WHERE study_id = ?
            """, (study_id,))
            
            conn.commit()
            
            return jsonify({
                'status': 'success',
                'message': f'Study {study_id} reset to unreviewed'
            })
            
    except Exception as e:
        print(f"Error resetting study: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/project/<project_id>/update-roi-labels', methods=['POST'])
def update_project_roi_labels(project_id):
    """Update ROI labels for a project"""
    try:
        # First verify project exists
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            project = cursor.execute("""
                SELECT project_id FROM projects WHERE project_id = ?
            """, (project_id,)).fetchone()
            
            if not project:
                return jsonify({
                    'status': 'error',
                    'message': f'Project {project_id} not found'
                }), 404

        # For Nov24test project, use these specific structures
        if project_id == 'Nov24test':
            roi_labels = [
                "(p) gtv",
                "(p) ptv_apbi",
                "ptvp_3000"
            ]
            
            cursor.execute("""
                UPDATE projects 
                SET roi_labels = ? 
                WHERE project_id = ?
            """, (json.dumps(roi_labels), project_id))
            conn.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'ROI labels updated',
                'roi_labels': roi_labels
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Project {project_id} not configured for ROI labels'
            }), 400
            
    except Exception as e:
        print(f"Error updating ROI labels: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/check-roi-labels')
def check_roi_labels():
    """Debug endpoint to check ROI labels in projects"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            projects = cursor.execute("""
                SELECT project_id, roi_labels
                FROM projects
            """).fetchall()
            
            results = {}
            for project_id, roi_labels in projects:
                results[project_id] = {
                    'roi_labels': json.loads(roi_labels) if roi_labels else []
                }
            
            return jsonify({
                'status': 'success',
                'projects': results
            })
            
    except Exception as e:
        print(f"Error checking ROI labels: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# new route for getting project summary with user_id
@app.route('/api/project/<project_id>/summary')
def get_project_summary(project_id):
    """Get quality distribution and common issues summary for the current user's project reviews"""
    try:
        # Get current user from session
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'No user selected'
            }), 401

        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get quality distribution for current user
            quality_dist = cursor.execute('''
                SELECT quality_rating, COUNT(*) as count
                FROM reviews
                WHERE project_id = ? AND user_id = ?
                GROUP BY quality_rating
                ORDER BY quality_rating
            ''', (project_id, user_id)).fetchall()
            
            # Format quality distribution
            quality_distribution = {
                str(i): 0 for i in range(1, 6)  # Initialize all ratings with 0
            }
            for row in quality_dist:
                quality_distribution[str(row['quality_rating'])] = row['count']
            
            # Get common issues for current user
            issues_data = cursor.execute('''
                SELECT issues
                FROM reviews
                WHERE project_id = ? 
                AND user_id = ?
                AND issues IS NOT NULL 
                AND issues != ''
            ''', (project_id, user_id)).fetchall()
            
            # Process and count issues
            issues_count = {}
            for row in issues_data:
                issue = row['issues'].strip().lower()
                if issue:
                    issues_count[issue] = issues_count.get(issue, 0) + 1
            
            # Sort issues by frequency
            common_issues = dict(sorted(
                issues_count.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5])  # Get top 5 most common issues
            
            # Get total reviews for percentages for current user
            total_reviews = cursor.execute('''
                SELECT COUNT(*) as count
                FROM reviews
                WHERE project_id = ? AND user_id = ?
            ''', (project_id, user_id)).fetchone()['count']
            
            # Get user's name for the summary
            username = cursor.execute('''
                SELECT username 
                FROM users 
                WHERE user_id = ?
            ''', (user_id,)).fetchone()['username']
            
            return jsonify({
                'status': 'success',
                'summary': {
                    'quality_distribution': quality_distribution,
                    'common_issues': common_issues,
                    'total_reviews': total_reviews,
                    'username': username,
                    'quality_labels': {
                        '1': 'Unusable',
                        '2': 'Poor',
                        '3': 'Acceptable',
                        '4': 'Good',
                        '5': 'Excellent'
                    }
                }
            })
            
    except Exception as e:
        print(f"Error getting project summary: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
@app.route('/admin/check-stats')
def check_stats():
    """Admin endpoint to check database stats"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            stats = {
                'projects': {},
                'total_reviews': 0
            }
            
            # Get stats for each project
            projects = conn.execute('''
                SELECT p.project_id, p.name,
                       COUNT(DISTINCT s.study_id) as total_studies,
                       COUNT(DISTINCT r.review_id) as reviewed
                FROM projects p
                LEFT JOIN studies s ON p.project_id = s.project_id
                LEFT JOIN reviews r ON s.study_id = r.study_id
                GROUP BY p.project_id
            ''').fetchall()
            
            for p in projects:
                stats['projects'][p['name']] = {
                    'total': p['total_studies'],
                    'reviewed': p['reviewed'],
                    'completion': f"{(p['reviewed']/p['total_studies']*100):.1f}%" if p['total_studies'] > 0 else "0%"
                }
            
            return jsonify(stats)
            
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
