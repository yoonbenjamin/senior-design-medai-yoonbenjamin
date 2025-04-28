from datetime import datetime
import os
import io
import PyPDF2
import anthropic
from flask import Blueprint, json, request, jsonify
from dotenv import load_dotenv

anthropic_api = Blueprint("anthropic", __name__)
load_dotenv()

# Initialize Anthropic client
api_key = os.getenv("ANTHROPIC_API_KEY")
print(api_key)
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY environment variable is not set")

client = anthropic.Anthropic(api_key=api_key)


# def parse_pdf(file_storage):
#     """Parse a PDF file and return its text content."""
#     try:
#         pdf_file = io.BytesIO(file_storage.read())
#         pdf_reader = PyPDF2.PdfReader(pdf_file)

#         text_content = ""
#         for page in pdf_reader.pages:
#             text_content += page.extract_text()

#         return text_content
#     except Exception as e:
#         raise ValueError(f"Error parsing PDF: {str(e)}")


def is_pdf(filename):
    """Check if the given filename has a .pdf extension."""
    return filename.lower().endswith(".pdf")


def generate_summary(text):
    """Generate a summary using Anthropic's Claude API."""
    try:
        prompt = f"""
        Medical Report Analysis: Extract the following structured information from the report text.
        Provide ONLY a complete, valid JSON response with these keys.

        Report Text:
        {text}

        Output exactly in this JSON format:
        {{
            "disease_site": "Cancer type or null",
            "tumor_stage": "TNM stage or null",
            "laterality": "Left/Right/Bilateral or null",
            "patient_info": {{
                "age": numeric age or null,
                "sex": "Male/Female or null"
            }},
            "ebrt_relevance": true or false or null
        }}
        """

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text
    except Exception as e:
        return f"Error generating summary: {str(e)}"


def get_medical_classification(text):
    """Generate structured medical classifications using Claude."""
    try:
        prompt = f"""
        Medical Report Analysis: Extract the following structured information from the report text.
        Provide ONLY a complete, valid JSON response with these keys.

        Report Text:
        {text}

        Output exactly in this JSON format:
        {{
            "disease_site": "Cancer type or null",
            "tumor_stage": "TNM stage or null",
            "laterality": "Left/Right/Bilateral or null",
            "patient_info": {{
                "age": numeric age or null,
                "sex": "Male/Female or null"
            }},
            "ebrt_relevance": true or false or null
        }}
        """

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            return json.loads(response.content[0].text)
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse JSON response",
                "raw_response": response.content[0].text,
            }
    except Exception as e:
        return {"error": f"API request failed: {str(e)}"}


@anthropic_api.route("/anthropic-summarize", methods=["POST"])
def summarize_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        try:
            text = parse_pdf(file)
            summary = generate_summary(text)
            return jsonify({"summary": summary}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid file type"}), 400


@anthropic_api.route("/classify-medical-report", methods=["POST"])
def classify_medical_report():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        try:
            text = parse_pdf(file)
            classifications = get_medical_classification(text)
            return jsonify({"summary": classifications}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid file type"}), 400


# @anthropic_api.route("/anthropic-oneliner", methods=["POST"])
# def generate_oneliner():
#     if "file" not in request.files:
#         return jsonify({"error": "No file part"}), 400

#     file = request.files["file"]
#     if file.filename == "":
#         return jsonify({"error": "No selected file"}), 400

#     if file and is_pdf(file.filename):
#         try:
#             text = parse_pdf(file)

#             prompt = f"""
#             You are a highly skilled medical AI assistant. Generate a concise, accurate one-line summary
#             of the following medical text that captures key diagnoses and clinical implications:

#             {text}

#             The summary should be:
#             1. One sentence only
#             2. Highlight key diagnosis
#             3. Include critical clinical findings
#             4. Note important treatment implications
#             """

#             response = client.messages.create(
#                 model="claude-3-haiku-20240307",
#                 max_tokens=1000,
#                 messages=[{"role": "user", "content": prompt}],
#             )

#             return jsonify({"summary": response.content[0].text}), 200

#         except Exception as e:
#             return jsonify({"error": str(e)}), 500


#     return jsonify({"error": "Invalid file type"}), 400


@anthropic_api.route("/anthropic-oneliner", methods=["POST"])
def generate_oneliner():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    first_name = request.form.get("firstName", "").strip()
    last_name = request.form.get("lastName", "").strip()

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        try:
            text = parse_pdf(file)

            # Remove patient names from text
            cleaned_text = remove_patient_names(text, first_name, last_name)

            prompt = f"""
            You are a highly skilled medical AI assistant. Generate a concise, accurate one-line summary 
            of the following medical text that captures key diagnoses and clinical implications:

            {cleaned_text}

            The summary should be:
            1. One sentence only
            2. Highlight key diagnosis
            3. Include critical clinical findings
            4. Note important treatment implications
            """

            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            return jsonify({"summary": response.content[0].text}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid file type"}), 400


def remove_patient_names(text, first_name, last_name):
    import re

    if first_name:
        pattern_first = re.compile(re.escape(first_name), re.IGNORECASE)
        text = pattern_first.sub("[REDACTED]", text)

    if last_name:
        pattern_last = re.compile(re.escape(last_name), re.IGNORECASE)
        text = pattern_last.sub("[REDACTED]", text)

    return text


@anthropic_api.route("/improve-anthropic-oneliner", methods=["POST"])
def improve_oneliner():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    feedback = request.form.get("feedback")
    original_oneliner = request.form.get("original_oneliner")

    if not all([file, feedback, original_oneliner]):
        return jsonify({"error": "Missing required data"}), 400

    if file and is_pdf(file.filename):
        try:
            text = parse_pdf(file)

            prompt = f"""
            Original one-liner: {original_oneliner}
            
            User feedback: {feedback}
            
            Original text: {text}
            
            Based on the user's feedback, generate an improved one-line summary that:
            1. Addresses the feedback
            2. Maintains clinical accuracy
            3. Remains concise and clear
            4. Includes key medical implications
            """

            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            return jsonify({"improved_oneliner": response.content[0].text}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid file type"}), 400


# @anthropic_api.route("/anthropic-structured", methods=["POST"])
# def analyze_structured_data():
#     """Endpoint to analyze structured data using Claude."""
#     if "file" not in request.files:
#         return jsonify({"error": "No file part"}), 400

#     file = request.files["file"]
#     if file.filename == "":
#         return jsonify({"error": "No selected file"}), 400

#     try:
#         text = parse_pdf(file)
#         result = get_medical_classification(text)

#         response = {
#             "timestamp": datetime.now().isoformat(),
#             "file_name": file.filename,
#             "result": result
#         }

#         print(f"Sending response: {response}")  # Debug print
#         return jsonify(response), 200

# except Exception as e:
#     print(f"Error in analyze_structured_data: {str(e)}")  # Debug print
#     return jsonify({"error": str(e)}), 500


@anthropic_api.route("/anthropic-structured", methods=["POST"])
def analyze_structured_data():
    """Endpoint to analyze structured data using Claude."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    first_name = request.form.get("firstName", "").strip()
    last_name = request.form.get("lastName", "").strip()

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        text = parse_pdf(file)

        # Remove patient names from text
        cleaned_text = remove_patient_names(text, first_name, last_name)

        # Now pass cleaned_text to your analysis function
        result = get_medical_classification(cleaned_text)

        response = {
            "timestamp": datetime.now().isoformat(),
            "file_name": file.filename,
            "result": result,
        }

        print(f"Sending response: {response}")  # Debug print
        return jsonify(response), 200

    except Exception as e:
        print(f"Error in analyze_structured_data: {str(e)}")  # Debug print
        return jsonify({"error": str(e)}), 500


def parse_pdf(file_storage):
    """Parse a PDF file and return its text content."""
    try:
        pdf_file = io.BytesIO(file_storage.read())
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()

        return text_content
    except Exception as e:
        raise ValueError(f"Error parsing PDF: {str(e)}")


@anthropic_api.route("/select-anthropic-structured", methods=["POST"])
def select_model_result():
    """Endpoint to select and store Claude's result as the chosen classification."""
    data = request.json
    if not data or "model_name" not in data or "result" not in data:
        return jsonify({"error": "Missing required data"}), 400

    try:
        selected_result = {
            "timestamp": datetime.now().isoformat(),
            "model_name": data["model_name"],
            "selected_result": data["result"],
            "is_edited": data.get("is_edited", False),
        }

        return (
            jsonify(
                {
                    "message": "Classification result selected successfully",
                    "data": selected_result,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Error processing selection: {str(e)}"}), 500
