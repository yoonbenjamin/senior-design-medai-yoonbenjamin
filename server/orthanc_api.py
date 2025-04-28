from flask import Blueprint, jsonify
import requests
from requests.auth import HTTPBasicAuth
import logging

orthanc_bp = Blueprint('orthanc', __name__)

# Orthanc server configuration
ORTHANC_URL = "http://localhost:8042"
ORTHANC_USERNAME = "medai"
ORTHANC_PASSWORD = "medai"

def get_orthanc_auth():
    return HTTPBasicAuth(ORTHANC_USERNAME, ORTHANC_PASSWORD)

@orthanc_bp.route("/orthanc/patients", methods=["GET"])
def get_orthanc_patients():
    try:
        # First, get all patient IDs
        response = requests.get(
            f"{ORTHANC_URL}/patients",
            auth=get_orthanc_auth()
        )
        response.raise_for_status()
        patient_ids = response.json()

        # Get detailed information for each patient
        patients = []
        for patient_id in patient_ids:
            patient_response = requests.get(
                f"{ORTHANC_URL}/patients/{patient_id}",
                auth=get_orthanc_auth()
            )
            patient_response.raise_for_status()
            patient_data = patient_response.json()
            
            # Extract relevant patient information
            patient = {
                "id": patient_id,
                "name": patient_data.get("MainDicomTags", {}).get("PatientName", "Unknown"),
                "patientId": patient_data.get("MainDicomTags", {}).get("PatientID", "Unknown"),
                "birthDate": patient_data.get("MainDicomTags", {}).get("PatientBirthDate", "Unknown"),
                "sex": patient_data.get("MainDicomTags", {}).get("PatientSex", "Unknown"),
                "studiesCount": len(patient_data.get("Studies", [])),
                "lastUpdate": patient_data.get("LastUpdate"),
                "orthancUrl": f"{ORTHANC_URL}/app/explorer.html#patient?uuid={patient_id}"
            }
            patients.append(patient)
        new_patients = [{
                "id": "0",
                "patientId": "0",
                "name": "John Doe",
                "birthDate": "2003-08-14",
                "age": 1,
                "sex": "M",
                "studiesCount": "1",
                "lastUpdate": "2023-09-15",
                "document": 0,
                "contour": 0,
                "planning": 0,
            },
            {
                "id": "2",
                "patientId": "1",
                "name": "Jane Smith",
                "birthDate": "1992-07-04",
                "age": 1,
                "sex": "F",
                "studiesCount": "3",
                "lastUpdate": "2023-09-20",
                "document": 1,
                "contour": 0,
                "planning": 0,
            },
            {
                "id": "3",
                "patientId": "2",
                "name": "Bob Johnson",
                "birthDate": "1981-06-28",
                "age": 1,
                "sex": "M",
                "studiesCount": "4",
                "lastUpdate": "2023-09-18",
                "document": 2,
                "contour": 1,
                "planning": 3,
            },
            {
                "id": "4",
                "patientId": "3",
                "name": "Ned Noody",
                "birthDate": "2002-11-25",
                "age": 22,
                "sex": "M",
                "studiesCount": "10",
                "lastUpdate": "2025-01-20",
                "document": 2,
                "contour": 1,
                "planning": 0,
            },
        ]
        patients.extend(new_patients)
        return jsonify(patients), 200

    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching patients from Orthanc: {str(e)}")
        return jsonify({"error": "Failed to fetch patients from Orthanc"}), 500

@orthanc_bp.route("/orthanc/patients/<patient_id>", methods=["GET"])
def get_orthanc_patient(patient_id):
    try:
        response = requests.get(
            f"{ORTHANC_URL}/patients/{patient_id}",
            auth=get_orthanc_auth()
        )
        response.raise_for_status()
        patient_data = response.json()
        
        # Format patient data
        patient = {
            "id": patient_id,
            "name": patient_data.get("MainDicomTags", {}).get("PatientName", "Unknown"),
            "patientId": patient_data.get("MainDicomTags", {}).get("PatientID", "Unknown"),
            "birthDate": patient_data.get("MainDicomTags", {}).get("PatientBirthDate", "Unknown"),
            "sex": patient_data.get("MainDicomTags", {}).get("PatientSex", "Unknown"),
            "studies": patient_data.get("Studies", []),
            "lastUpdate": patient_data.get("LastUpdate"),
            "orthancUrl": f"{ORTHANC_URL}/app/explorer.html#patient?uuid={patient_id}"
        }
        
        return jsonify(patient), 200

    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching patient from Orthanc: {str(e)}")
        return jsonify({"error": "Failed to fetch patient from Orthanc"}), 500