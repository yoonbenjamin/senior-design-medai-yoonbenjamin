from flask import Flask, request, jsonify
import os
import pymysql
import pymysql.cursors
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from datetime import date, datetime
from ollamaApis import ollama_api
from HuggingFace import hugging_face_bp
from LongEncodeHF import hf_bp
from anthropic_api import anthropic_api
from orthanc_api import orthanc_bp
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from flask import jsonify, send_file
import io

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure JWT
app.config["JWT_SECRET_KEY"] = "your-secret-key"
jwt = JWTManager(app)

app.register_blueprint(ollama_api)
app.register_blueprint(hugging_face_bp)
app.register_blueprint(hf_bp)
app.register_blueprint(anthropic_api)
app.register_blueprint(orthanc_bp)

load_dotenv()

# Database configuration
DB_HOST = "database-2.crs0e08mqp78.us-east-1.rds.amazonaws.com"
DB_USER = "admin"
DB_PASSWORD = "password"
DB_NAME = "meddb"

# S3 Configuration
S3_BUCKET = os.environ.get("S3_BUCKET", "medaibucket")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY")


# Initialize S3 client
def get_s3_client():
    try:
        # Try with explicit credentials first
        return boto3.client(
            "s3",
            region_name=S3_REGION,
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
        )
    except Exception as e:
        print(f"Error with explicit credentials: {e}")
        # Fall back to default credential chain
        return boto3.client("s3", region_name=S3_REGION)


# Function to list files in S3 bucket with prefix
def list_s3_files(prefix="PathologyReports/"):
    try:
        s3_client = get_s3_client()
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)

        if "Contents" in response:
            # Filter out folder objects (objects that end with /)
            # Also create a more useful structure for each file
            files = []
            for item in response["Contents"]:
                key = item["Key"]
                # Skip the folder itself
                if key == prefix or key.endswith("/"):
                    continue

                # Extract just the filename (remove prefix)
                name = key.split("/")[-1]

                files.append(
                    {
                        "key": key,
                        "name": name,
                        "size": item["Size"],
                        "last_modified": item["LastModified"].isoformat(),
                    }
                )
            return files
        return []
    except ClientError as e:
        print(f"Error listing S3 files: {e}")
        return []


# Function to get a file from S3
def get_s3_file(file_key):
    try:
        s3_client = get_s3_client()
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=file_key)
        return response["Body"].read()
    except ClientError as e:
        print(f"Error getting S3 file: {e}")
        return None


# Add these routes to app.py


@app.route("/pathology-reports", methods=["GET"])
def list_pathology_reports():
    """List all pathology reports available in S3 bucket"""
    files = list_s3_files()
    return jsonify({"reports": files}), 200


@app.route("/pathology-reports/<path:file_path>", methods=["GET"])
def get_pathology_report(file_path):
    """Get a specific pathology report from S3"""
    # Ensure the file path starts with the PathologyReports/ prefix
    if not file_path.startswith("PathologyReports/"):
        file_path = f"PathologyReports/{file_path}"

    file_content = get_s3_file(file_path)

    if file_content:
        # Create an in-memory file-like object
        file_obj = io.BytesIO(file_content)

        # Get the filename from the path
        filename = file_path.split("/")[-1]

        # Determine content type (assuming PDF for now)
        content_type = "application/pdf"

        # Send the file to the client
        return send_file(
            file_obj, mimetype=content_type, as_attachment=True, download_name=filename
        )
    else:
        return jsonify({"error": "File not found or error retrieving file"}), 404


@app.route("/pdf-viewer/<path:file_path>", methods=["GET"])
def view_pdf(file_path):
    """
    Endpoint to view a PDF directly in the browser instead of downloading it.
    This is used by the PDF viewer component.
    """
    # Ensure the file path starts with the PathologyReports/ prefix
    if not file_path.startswith("PathologyReports/"):
        file_path = f"PathologyReports/{file_path}"

    try:
        print(f"Attempting to retrieve file: {file_path}")
        file_content = get_s3_file(file_path)

        if file_content:
            # Create an in-memory file-like object
            file_obj = io.BytesIO(file_content)

            # Get the filename from the path
            filename = file_path.split("/")[-1]

            print(
                f"Successfully retrieved file: {filename}, size: {len(file_content)} bytes"
            )

            # Create a response with the PDF file
            response = send_file(
                file_obj,
                mimetype="application/pdf",
                as_attachment=False,  # This is key for viewing in browser
                download_name=filename,
            )

            # Add CORS headers explicitly
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"

            return response
        else:
            print(f"File not found or empty: {file_path}")
            return jsonify({"error": "File not found or error retrieving file"}), 404
    except Exception as e:
        print(f"Error processing PDF request: {e}")
        return jsonify({"error": f"Error processing PDF: {str(e)}"}), 500


@app.route("/upload-pathology-report", methods=["POST"])
def upload_pathology_report():
    """
    Upload a pathology report PDF and save it to S3 and database

    Request form data:
    - file: PDF file
    - patientId: Patient ID
    - firstName: Patient's first name (for verification)
    - lastName: Patient's last name (for verification)
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted"}), 400

    # Get patient information from form data
    patient_id = request.form.get("patientId")
    first_name = request.form.get("firstName")
    last_name = request.form.get("lastName")

    if not patient_id:
        return jsonify({"error": "Missing patient ID"}), 400

    try:
        # Verify patient exists in database
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            # Check if patient exists
            cursor.execute(
                "SELECT patient_id, first_name, last_name FROM patient WHERE patient_id = %s",
                (patient_id,),
            )
            patient_data = cursor.fetchone()

            if not patient_data:
                # Patient doesn't exist, create one if we have first and last name
                if first_name and last_name:
                    # This is a simplified version - in production, you'd want more validation
                    try:
                        cursor.execute(
                            "INSERT INTO patient (patient_id, first_name, last_name, birth_date, sex) VALUES (%s, %s, %s, %s, %s)",
                            (
                                patient_id,
                                first_name,
                                last_name,
                                "2000-01-01",
                                "Other",
                            ),  # Default values
                        )
                        connection.commit()
                    except Exception as e:
                        return (
                            jsonify(
                                {"error": f"Failed to create patient record: {str(e)}"}
                            ),
                            500,
                        )
                else:
                    return jsonify({"error": "Patient not found in database"}), 404

        # Upload file to S3
        s3_client = get_s3_client()
        file_name = f"PathologyReports/{patient_id}_{int(datetime.now().timestamp())}_{file.filename}"

        try:
            s3_client.upload_fileobj(file, S3_BUCKET, file_name)
            s3_url = f"s3://{S3_BUCKET}/{file_name}"
        except Exception as e:
            print(f"S3 upload error: {str(e)}")
            s3_url = None  # Continue even if S3 upload fails

        # Insert record into pathology_reports table with an empty string for cleaned_report_text
        # (since it cannot be NULL in the schema)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO pathology_reports 
                (patient_id, cleaned_report_text, pdf_s3_url) 
                VALUES (%s, %s, %s)
                """,
                (patient_id, "", s3_url),  # Using empty string instead of NULL
            )
            connection.commit()

            # Get the inserted report ID
            report_id = cursor.lastrowid

        return (
            jsonify(
                {
                    "message": "Report uploaded successfully",
                    "report_id": report_id,
                    "s3_url": s3_url,
                }
            ),
            201,
        )

    except Exception as e:
        print(f"Error uploading report: {str(e)}")
        return jsonify({"error": f"Failed to process report: {str(e)}"}), 500
    finally:
        if connection:
            connection.close()


def get_db_connection():
    try:
        return pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
        )
    except pymysql.MySQLError as e:
        print(f"Database connection error: {e}")
        return None  # Handle this properly when calling the function


def create_tables():
    connection = get_db_connection()
    if connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL
                );
            """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS patient (
                    patient_id INT AUTO_INCREMENT PRIMARY KEY,
                    first_name VARCHAR(255) NOT NULL,
                    last_name VARCHAR(255) NOT NULL,
                    birth_date DATE NOT NULL,
                    sex ENUM('Male', 'Female', 'Other') NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            """
            )
        connection.commit()
        connection.close()


create_tables()


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    connection = None
    print("Received data:", data)

    data["first_name"] = data.get("firstName", data.get("first_name"))
    data["last_name"] = data.get("lastName", data.get("last_name"))

    required_fields = ["first_name", "last_name", "username", "password"]

    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM users WHERE username = %s", (data["username"],)
            )
            existing_user = cursor.fetchone()

            if existing_user:
                return jsonify({"error": "Username already exists"}), 400

            hashed_password = generate_password_hash(data["password"])

            cursor.execute(
                "INSERT INTO users (first_name, last_name, username, password, organization) VALUES (%s, %s, %s, %s, %s)",
                (
                    data["first_name"],
                    data["last_name"],
                    data["username"],
                    hashed_password,
                    data.get("organization"),
                ),
            )
            connection.commit()

        return jsonify({"message": "User registered successfully"}), 201

    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
        return jsonify({"error": "Internal server error"}), 500

    finally:
        if connection:
            connection.close()


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    connection = None

    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor(cursor=pymysql.cursors.DictCursor) as cursor:
            cursor.execute(
                "SELECT username, first_name, last_name, organization, password FROM users WHERE username = %s",
                (data["username"],),
            )
            user = cursor.fetchone()

            if user and check_password_hash(user["password"], data["password"]):
                access_token = create_access_token(identity=user["username"])

                return (
                    jsonify(
                        {
                            "message": "Login successful",
                            "token": access_token,
                            "user": {
                                "username": user["username"],
                                "firstName": user["first_name"],
                                "lastName": user["last_name"],
                                "organization": user["organization"],
                            },
                        }
                    ),
                    200,
                )

            return jsonify({"error": "Invalid username or password"}), 400

    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
        return jsonify({"error": "Internal server error"}), 500

    finally:
        if connection:
            connection.close()


@app.route("/")
def home():
    return "Hello, welcome to the Med.AI API"


@app.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    return jsonify(agents), 200


@app.route("/patients", methods=["GET"])
def get_patients():
    connection = get_db_connection()

    if connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT patient_id, first_name, last_name, birth_date, sex, orthanic_id FROM patient"
            )
            patients = cursor.fetchall()

        connection.close()

        return jsonify(patients), 200

    return jsonify({"error": "Database connection failed"}), 500


@app.route("/patientss/<int:patient_id>", methods=["GET"])
def get_patient(patient_id):
    connection = get_db_connection()
    if connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM patient WHERE patient_id = %s", (patient_id))
            patient = cursor.fetchone()
            print(patient)
        connection.close()
        if patient:
            return jsonify(patient), 200
        return jsonify({"msg": "Patient not found"}), 404
    return jsonify({"error": "Database connection failed"}), 500


@app.route("/get-oneliner/<int:patient_id>", methods=["GET"])
def get_oneliner(patient_id):
    connection = get_db_connection()
    if connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM one_liners WHERE patient_id = %s", (patient_id))
            patient = cursor.fetchone()
            print(patient)
        connection.close()
        if patient:
            return jsonify(patient), 200
        return jsonify({"msg": "Patient not found"}), 404
    return jsonify({"error": "Database connection failed"}), 500


@app.route("/patients", methods=["POST"])
def add_patient():
    data = request.json
    connection = get_db_connection()

    if connection:
        try:
            # Start a transaction
            connection.begin()

            # Insert into patient table
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO patient (first_name, last_name, birth_date, sex) VALUES (%s, %s, %s, %s)",
                    (
                        data["first_name"],
                        data["last_name"],
                        data["birth_date"],
                        data["sex"],
                    ),
                )

                # Get the inserted patient's ID
                patient_id = cursor.lastrowid

                # Insert default progress (stage 0, status 0) for the new patient
                cursor.execute(
                    "INSERT INTO patient_progress (patient_id, stage, status) VALUES (%s, %s, %s)",
                    (patient_id, 0, 0),
                )

            # Commit the transaction
            connection.commit()
            connection.close()

            return (
                jsonify(
                    {"msg": "Patient added successfully", "patient_id": patient_id}
                ),
                201,
            )

        except Exception as e:
            # Rollback in case of error
            connection.rollback()
            connection.close()
            return jsonify({"error": f"Failed to add patient: {str(e)}"}), 500

    return jsonify({"error": "Database connection failed"}), 500


@app.route("/patients/<int:patient_id>", methods=["PUT"])
def update_patient(patient_id):
    data = request.json
    connection = get_db_connection()

    if connection:
        with connection.cursor() as cursor:
            # Check if patient exists
            cursor.execute("SELECT * FROM patient WHERE id = %s", (patient_id,))
            patient = cursor.fetchone()
            if not patient:
                connection.close()
                return jsonify({"msg": "Patient not found"}), 404

            # Update fields only if provided
            cursor.execute(
                """
                UPDATE patient 
                SET name = %s, age = %s, sex = %s, lastVisit = %s 
                WHERE id = %s
            """,
                (
                    data.get("name", patient["name"]),
                    data.get("age", patient["age"]),
                    data.get("sex", patient["sex"]),
                    data.get("lastVisit", patient["lastVisit"]),
                    patient_id,
                ),
            )

            connection.commit()
        connection.close()
        return jsonify({"msg": "Patient updated successfully"}), 200

    return jsonify({"error": "Database connection failed"}), 500


@app.route("/patients/<int:patient_id>", methods=["DELETE"])
def delete_patient(patient_id):
    connection = get_db_connection()

    if connection:
        with connection.cursor() as cursor:
            # Check if patient exists
            cursor.execute("SELECT * FROM patient WHERE id = %s", (patient_id,))
            patient = cursor.fetchone()
            if not patient:
                connection.close()
                return jsonify({"msg": "Patient not found"}), 404

            # Delete the patient
            cursor.execute("DELETE FROM patient WHERE id = %s", (patient_id,))
            connection.commit()

        connection.close()
        return jsonify({"msg": "Patient deleted successfully"}), 200

    return jsonify({"error": "Database connection failed"}), 500


@app.route("/agents", methods=["GET"])
@jwt_required()
def get_agents():
    return jsonify(agents), 200


@app.route("/agents/<int:agent_id>", methods=["GET"])
@jwt_required()
def get_agent(agent_id):
    agent = next((agent for agent in agents if agent["id"] == agent_id), None)
    if agent:
        return jsonify(agent), 200
    return jsonify({"msg": "Agent not found"}), 404


@app.route("/agents/<int:agent_id>", methods=["DELETE"])
@jwt_required()
def delete_agent(agent_id):
    global agents
    agents = [agent for agent in agents if agent["id"] != agent_id]
    return jsonify({"msg": "Agent deleted"}), 200


@app.route("/patient-progress/<int:patient_id>", methods=["GET"])
def get_patient_progress(patient_id):
    connection = get_db_connection()

    if connection:
        with connection.cursor() as cursor:
            # Check if patient exists
            cursor.execute(
                "SELECT patient_id FROM patient WHERE patient_id = %s", (patient_id,)
            )
            patient = cursor.fetchone()

            if not patient:
                connection.close()
                return jsonify({"error": "Patient not found"}), 404

            # Get progress data
            cursor.execute(
                "SELECT stage, status FROM patient_progress WHERE patient_id = %s",
                (patient_id,),
            )
            progress = cursor.fetchone()

            if not progress:
                # Create default progress entry (all tasks not started)
                progress = {"stage": 0, "status": 0}

            # Determine the status for each workflow based on stage and status
            document_status = (
                2 if progress["stage"] > 0 else progress["status"]
            )  # Completed if stage > 0
            contour_status = 0  # Default to not started
            planning_status = 0  # Default to not started

            if progress["stage"] == 1:
                contour_status = progress["status"]  # In progress or awaiting review
            elif progress["stage"] > 1:
                contour_status = 2  # Completed

            if progress["stage"] == 2:
                planning_status = progress["status"]  # In progress or awaiting review
            elif progress["stage"] > 2:
                planning_status = 2  # Completed

            result = {
                "document": document_status,
                "contour": contour_status,
                "planning": planning_status,
                "stage": progress["stage"],
                "status": progress["status"],
            }

        connection.close()
        return jsonify(result), 200

    return jsonify({"error": "Database connection failed"}), 500


@app.route("/update-patient-progress", methods=["POST"])
def update_patient_progress():
    data = request.json
    connection = get_db_connection()

    if (
        not data
        or "patient_id" not in data
        or "stage" not in data
        or "status" not in data
    ):
        return jsonify({"error": "Missing required data"}), 400

    if connection:
        with connection.cursor() as cursor:
            # Check if patient exists
            cursor.execute(
                "SELECT patient_id FROM patient WHERE patient_id = %s",
                (data["patient_id"],),
            )
            patient = cursor.fetchone()

            if not patient:
                connection.close()
                return jsonify({"error": "Patient not found"}), 404

            # Check if progress entry exists
            cursor.execute(
                "SELECT * FROM patient_progress WHERE patient_id = %s",
                (data["patient_id"],),
            )
            progress = cursor.fetchone()

            if progress:
                # Update existing entry
                cursor.execute(
                    "UPDATE patient_progress SET stage = %s, status = %s WHERE patient_id = %s",
                    (data["stage"], data["status"], data["patient_id"]),
                )
            else:
                # Create new entry
                cursor.execute(
                    "INSERT INTO patient_progress (patient_id, stage, status) VALUES (%s, %s, %s)",
                    (data["patient_id"], data["stage"], data["status"]),
                )

            connection.commit()

        connection.close()
        return jsonify({"message": "Patient progress updated successfully"}), 200

    return jsonify({"error": "Database connection failed"}), 500


@app.route("/save-oneliner", methods=["POST"])
def save_oneliner():
    """
    Save a selected one-liner to the database.

    Expected JSON payload:
    {
        "patient_id": int,      # Patient ID
        "report_id": int,       # Report ID
        "one_liner_text": str,  # The selected one-liner text
        "model": str            # The model that generated the one-liner (e.g., "Claude", "Llama", "Phi")
    }
    """
    try:
        data = request.json

        # Validate required fields
        if not all(
            k in data for k in ["patient_id", "report_id", "one_liner_text", "model"]
        ):
            return jsonify({"error": "Missing required fields"}), 400

        # Connect to database
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            # Check if an entry already exists for this report
            cursor.execute(
                "SELECT one_liner_id FROM one_liners WHERE report_id = %s",
                (data["report_id"],),
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing record
                cursor.execute(
                    """
                    UPDATE one_liners 
                    SET one_liner_text = %s, model = %s, created_at = CURRENT_TIMESTAMP
                    WHERE report_id = %s
                    """,
                    (data["one_liner_text"], data["model"], data["report_id"]),
                )
            else:
                # Insert new record
                cursor.execute(
                    """
                    INSERT INTO one_liners 
                    (patient_id, report_id, one_liner_text, model) 
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        data["patient_id"],
                        data["report_id"],
                        data["one_liner_text"],
                        data["model"],
                    ),
                )

            connection.commit()

        return (
            jsonify(
                {
                    "message": "One-liner saved successfully",
                    "one_liner_id": (
                        cursor.lastrowid if not existing else existing["one_liner_id"]
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Error saving one-liner: {str(e)}")
        return jsonify({"error": f"Failed to save one-liner: {str(e)}"}), 500
    finally:
        if connection:
            connection.close()

@app.route("/patient-reports/<int:patient_id>", methods=["GET"])
def get_patient_reports(patient_id):
    """
    Get all pathology reports for a specific patient
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT report_id, patient_id, pdf_s3_url, creation_time
                FROM pathology_reports
                WHERE patient_id = %s
                ORDER BY creation_time DESC
                """,
                (patient_id,),
            )

            reports = cursor.fetchall()

        connection.close()

        if not reports:
            return jsonify([]), 200  # Return empty array if no reports found

        return jsonify(reports), 200

    except Exception as e:
        print(f"Error fetching patient reports: {str(e)}")
        return jsonify({"error": f"Failed to fetch patient reports: {str(e)}"}), 500

@app.route("/add-oneliner", methods=["POST"])
def add_oneliner():
    data = request.json

    patient_id = data.get("patient_id")
    report_id = data.get("report_id")
    model_name = data.get("model_name")
    oneliner_text = data.get("oneliner_text")

    if not all([patient_id, report_id, model_name, oneliner_text]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            # Insert into one_liners table
            insert_query = """
                INSERT INTO one_liners (patient_id, report_id, one_liner_text, model)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(
                insert_query, (patient_id, report_id, oneliner_text, model_name)
            )

            # Check if patient already exists in patient_progress
            check_query = "SELECT 1 FROM patient_progress WHERE patient_id = %s LIMIT 1"
            cursor.execute(check_query, (patient_id,))
            exists = cursor.fetchone()

            # If patient doesn't exist, insert new entry into patient_progress
            if not exists:
                progress_insert_query = """
                    INSERT INTO patient_progress (patient_id, stage, status)
                    VALUES (%s, %s, %s)
                """
                cursor.execute(progress_insert_query, (patient_id, 0, 2))

        connection.commit()
        connection.close()

        return jsonify({"message": "One-liner added successfully"}), 200

    except Exception as e:
        print(f"Error inserting into database: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/patients-without-oneliner", methods=["GET"])
def patients_without_oneliner():
    try:
        query = """
        SELECT p.patient_id, p.first_name, p.last_name, p.birth_date, p.sex
        FROM patient p
        LEFT JOIN one_liners o ON p.patient_id = o.patient_id
        WHERE o.patient_id IS NULL;
        """
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            cursor.execute(query)
            patients = cursor.fetchall()

            patient_list = [
                {
                    "patient_id": patient["patient_id"],
                    "first_name": patient["first_name"],
                    "last_name": patient["last_name"],
                    "birth_date": (
                        patient["birth_date"].isoformat()
                        if isinstance(patient["birth_date"], (datetime, date))
                        else patient["birth_date"]
                    ),
                    "sex": patient["sex"],
                }
                for patient in patients
            ]

        connection.close()

        return jsonify(patient_list), 200

    except Exception as e:
        print(f"Error fetching patients: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/latest-report/<int:patient_id>", methods=["GET"])
def get_latest_report(patient_id):
    try:
        query = """
        SELECT report_id FROM pathology_reports
        WHERE patient_id = %s
        ORDER BY creation_time DESC
        LIMIT 1;
        """
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            cursor.execute(query, (patient_id,))
            result = cursor.fetchone()

        connection.close()

        print(f"Query result for patient_id {patient_id}: {result}")

        if result and "report_id" in result:
            return jsonify({"report_id": result["report_id"]}), 200
        else:
            return jsonify({"error": "No report found for this patient"}), 404

    except Exception as e:
        print(f"Error fetching latest report_id: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/get-structured-data/<int:patient_id>", methods=["GET"])
def get_structured_data(patient_id):
    """Get structured data for a specific patient"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            # First check if the patient exists
            cursor.execute(
                "SELECT patient_id FROM patient WHERE patient_id = %s",
                (patient_id,)
            )
            
            if not cursor.fetchone():
                connection.close()
                return jsonify({"error": "Patient not found"}), 404
            
            # Get the latest report_id for this patient
            cursor.execute(
                """
                SELECT report_id FROM pathology_reports
                WHERE patient_id = %s
                ORDER BY creation_time DESC
                LIMIT 1
                """,
                (patient_id,)
            )
            
            report_result = cursor.fetchone()
            if not report_result:
                connection.close()
                return jsonify({"error": "No reports found for this patient"}), 404
            
            report_id = report_result["report_id"]
            
            # Get structured data for this patient's latest report
            cursor.execute(
                """
                SELECT structured_data_id, patient_id, report_id, disease_site, 
                       tumor_stage, laterality, age, sex, ebrt_relevance, model,
                       creation_time
                FROM structured_data
                WHERE patient_id = %s AND report_id = %s
                ORDER BY creation_time DESC
                LIMIT 1
                """,
                (patient_id, report_id)
            )
            
            structured_data = cursor.fetchone()
            
        connection.close()
        
        if not structured_data:
            return jsonify({"error": "No structured data found for this patient"}), 404
            
        return jsonify(structured_data), 200

    except Exception as e:
        print(f"Error fetching structured data: {str(e)}")
        return jsonify({"error": f"Failed to fetch structured data: {str(e)}"}), 500


@app.route("/save-structured-data", methods=["POST"])
def save_structured_data():
    """
    Save structured data extracted from a pathology report.

    Expected JSON payload:
    {
        "patient_id": int,           # Patient ID
        "report_id": int,            # Report ID
        "disease_site": str,         # Disease site
        "tumor_stage": str,          # Tumor stage
        "laterality": str,           # Laterality
        "age": str,                  # Patient age
        "sex": str,                  # Patient sex
        "ebrt_relevance": str,       # EBRT relevance
        "model": str                 # The model that generated the data
    }
    """
    try:
        data = request.json

        # Validate required fields
        required_fields = ["patient_id", "report_id", "model"]
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            return (
                jsonify({"error": f"Missing required fields: {', '.join(missing)}"}),
                400,
            )

        # Connect to database
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        with connection.cursor() as cursor:
            # Check if an entry already exists for this report
            cursor.execute(
                "SELECT structured_data_id FROM structured_data WHERE report_id = %s",
                (data["report_id"],),
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing record
                cursor.execute(
                    """
                    UPDATE structured_data 
                    SET disease_site = %s, 
                        tumor_stage = %s, 
                        laterality = %s, 
                        age = %s, 
                        sex = %s, 
                        ebrt_relevance = %s, 
                        model = %s, 
                        creation_time = CURRENT_TIMESTAMP
                    WHERE report_id = %s
                    """,
                    (
                        data.get("disease_site", ""),
                        data.get("tumor_stage", ""),
                        data.get("laterality", ""),
                        data.get("age", ""),
                        data.get("sex", ""),
                        data.get("ebrt_relevance", ""),
                        data["model"],
                        data["report_id"],
                    ),
                )
                record_id = existing["structured_data_id"]
            else:
                # Insert new record
                cursor.execute(
                    """
                    INSERT INTO structured_data 
                    (patient_id, report_id, disease_site, tumor_stage, laterality, age, sex, ebrt_relevance, model) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        data["patient_id"],
                        data["report_id"],
                        data.get("disease_site", ""),
                        data.get("tumor_stage", ""),
                        data.get("laterality", ""),
                        data.get("age", ""),
                        data.get("sex", ""),
                        data.get("ebrt_relevance", ""),
                        data["model"],
                    ),
                )
                record_id = cursor.lastrowid

            # Also update patient progress
            # Check if patient already exists in patient_progress
            cursor.execute("SELECT 1 FROM patient_progress WHERE patient_id = %s LIMIT 1", 
                         (data["patient_id"],))
            exists = cursor.fetchone()

            # Update or insert into patient_progress
            if exists:
                cursor.execute(
                    """
                    UPDATE patient_progress 
                    SET stage = GREATEST(stage, 0), status = 2
                    WHERE patient_id = %s
                    """, 
                    (data["patient_id"],)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO patient_progress 
                    (patient_id, stage, status) VALUES (%s, 0, 2)
                    """, 
                    (data["patient_id"],)
                )

            connection.commit()

        return (
            jsonify(
                {
                    "message": "Structured data saved successfully",
                    "structured_data_id": record_id,
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Error saving structured data: {str(e)}")
        return jsonify({"error": f"Failed to save structured data: {str(e)}"}), 500
    finally:
        if connection:
            connection.close()



if __name__ == "__main__":
    app.run(debug=True, port=5001)
