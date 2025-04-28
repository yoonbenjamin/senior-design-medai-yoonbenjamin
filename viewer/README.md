# RT Review Portal

A comprehensive web application for reviewing and managing radiotherapy (RT) studies. This portal allows medical professionals to efficiently review patient studies, assess quality, and manage project workflows.

## Features

### Dashboard
- Project-based organization 
- Overview of total cases, reviewed cases, and overall progress
- Quick access to pending reviews and completed assessments
- Filtering and search capabilities
- Grid and list view options for study management

### Study Review
- Interactive DICOM viewer with structure overlay support
- Navigation through study slices using mouse wheel or keyboard
- Quality assessment workflow with standardized ratings
- Support for comments and issue tracking

### Project Management
- Multiple project support with individual tracking
- Project-specific ROI label configuration
- Progress tracking and statistics
- Quality distribution visualization
- Review history and audit trail

### Technical Features
- Efficient DICOM handling with caching system
- Thread-safe operations for concurrent users
- Responsive design for various screen sizes
- Real-time data synchronization

## System Requirements

### Server Requirements
- Python 3.8+
- Flask 3.0+
- SQLite3
- PyDICOM
- OpenCV (cv2)
- NumPy
- Concurrent storage system (for caching)

### Client Requirements
- Modern web browser with HTML5 support
- JavaScript enabled
- Minimum screen resolution: 1280x720

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PatientPreProcess
```

2. Create and activate a virtual environment with python or conda:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies (requirements.txt not made yet):
```bash
pip install -r requirements.txt
```

4. Configure the environment:
```bash
cp config.example.py config.py
# Edit config.py with your settings, could also do manually
```

5. Start the development server:
```bash
python app.py
```

## Project Structure

```
PatientPreProcess/
├── app/
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   ├── templates/
│   └── __init__.py
├── cache/
├── temp/
├── config.py
├── data_manager.py
├── dicom_handler.py
└── requirements.txt
```

### Key Components

- `app/`: Main application directory
- `data_manager.py`: Handles data management and Orthanc integration
- `dicom_handler.py`: DICOM processing and visualization
- `cache/`: Study cache directory
- `temp/`: Temporary file storage
- `config.py`: Configuration settings

## Configuration

### Orthanc Configuration
```python
ORTHANC_URL = "http://localhost:8042"
ORTHANC_USERNAME = "username"
ORTHANC_PASSWORD = "password"
```

### Project Configuration
```python
PROJECTS = {
    "ORTHANC_NAME": {
        "project_id": {
            "name": "Project Name",
            "description": "Project Description",
            "label": "orthanc_label",
            "type": "quality_assessment",
            "roi_labels": ["label1", "label2"]
        }
    }
}
```

## Usage

### Project Dashboard
1. Access the main dashboard at `/`
2. Select a project to view details
3. Use filters to find specific studies
4. Start review process for pending studies

### Study Review
1. Open a study from the project dashboard
2. Navigate through slices using mouse wheel or keyboard
3. Complete quality assessment form
4. Submit review and proceed to next study

## API Endpoints

### Study Management
- `GET /api/study/<study_id>/info`: Get study information
- `GET /api/study/<study_id>/slice/<slice_index>`: Get specific slice
- `POST /api/submit-review`: Submit study review

### Project Management
- `GET /api/project/<project_id>/summary`: Get project statistics *(NOT IMPLEMENTED YET)*
- `GET /api/project/<project_id>/next-study/<current_study_id>`: Get next study
- `POST /api/project/<project_id>/update-roi-labels`: Update ROI labels

## Development

### Code Style
- Use type hints where applicable
- Document functions and classes
- Use meaningful variable names


### Database Management
- SQLite database with automatic schema updates
- Maintain backwards compatibility
- Regular backup recommendations

## TODO

### PRIORITIZED
1. Authentication and Authorization
   - [ ] User authentication system
   - [ ] Role-based access control
   - [ ] Single sign-on integration
   - [ ] Keep track of which users submit which reviews

2. Viewer Bug Fixes
   - [ ] Fix issue of not all CT slices loading or being displayed in correct order
   - So far, some bugs found were not all CT slices being loaded, order may be messed up, and only one slice was loaded. One cause was user clicking on study again before it was fully loaded, causing incomplete CT loading.
   - [ ] Completed Review buttons do not work, may have to do with new StudyLoadingManager created to address issue above
   - [ ] Start viewer at lowest slice with contour for faster review
   
3. Project Stats Page

3. UI/UX Improvements
   - [ ] Dark/light theme toggle
   - [ ] Customizable keyboard shortcuts
   - [ ] Better error handling and user feedback
   - [ ] Adjust window/level settings
   - [ ] Toggle structure visibility
   

### LATER
4. Performance Improvements
   - [ ] Implement WebSocket for real-time updates
   - [ ] Optimize image caching strategy
   - [ ] Add support for parallel processing

5. Documentation
   - [ ] API documentation using OpenAPI/Swagger
   - [ ] User manual
   - [ ] Administrator guide
   - [ ] Development guide

6. Testing
   - [ ] Unit test coverage
   - [ ] Integration tests
   - [ ] End-to-end testing
   - [ ] Performance testing

7. Security
   - [ ] Security audit
   - [ ] HIPAA compliance review
   - [ ] Data encryption at rest
   - [ ] Audit logging

8. Infrastructure
   - [ ] Docker containerization
   - [ ] CI/CD pipeline
   - [ ] Monitoring and alerting
   - [ ] Backup and recovery procedures