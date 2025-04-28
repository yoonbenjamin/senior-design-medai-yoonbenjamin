from datetime import datetime
from flask import Blueprint, json, request, jsonify
import requests
import PyPDF2
import io
import re

ollama_api = Blueprint("ollama", __name__)


def parse_pdf(file_storage):
    """
    Parse a PDF file and return its text content.

    :param file_storage: A FileStorage object (from Flask's request.files)
    :return: A string containing the text content of the PDF
    """
    try:
        # Read the file into a BytesIO object
        pdf_file = io.BytesIO(file_storage.read())

        # Create a PDF reader object
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        # Extract text from each page
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()

        return text_content
    except Exception as e:
        raise ValueError(f"Error parsing PDF: {str(e)}")


def is_pdf(filename):
    """
    Check if the given filename has a .pdf extension.

    :param filename: The name of the file
    :return: True if the file is a PDF, False otherwise
    """
    return filename.lower().endswith(".pdf")


# Function to generate a summary using the llamma API
def ollama_summary(text):
    url = "http://localhost:11434/api/generate"

    # Prepare the prompt for the model
    prompt = f"""
        You are a highly skilled medical AI designed to assist physicians by summarizing detailed pathology reports into concise, accurate, and clinically useful "medical one-liners."
        These summaries should highlight the key findings, diagnoses, and any critical information that will aid in clinical decision-making.
        The output must be precise, medically sound, and appropriate for use in a real clinical setting.
        The format should be a one-sentence summary that includes the patient's diagnosis and key implications for treatment or follow-up. 
        Ensure that the language is clear, professional, and adheres to medical standards.

        Input text:
        \n\n{text}\n\n: 
        
        Output: 
        A concise one-liner summarizing the diagnosis, relevant pathology findings, and clinical implications. 
    """

    payload = {
        "model": "mistral:latest",  # model
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0},
    }

    # Send a request to the Ollama API
    response = requests.post(url, json=payload)

    if response.status_code == 200:
        return response.json().get("response", "No summary generated.")
    else:
        return f"Error generating summary: {response.status_code}"


def get_relevant_medical_history(text):
    """
    Generates a summary of relevant medical history, including prior treatment, chemotherapy,
    surgeries, and medications, based on input medical data.

    Args:
        text (str): Input medical text (e.g., pathology, radiology reports).

    Returns:
        str: Summary of relevant medical history.
    """
    url = "http://localhost:11434/api/generate"

    # Prepare the prompt for the model
    prompt = (
        f"Given the following medical text:\n\n{text}\n\n"
        "Extract and summarize relevant prior medical history, including:\n"
        "- Prior treatment history (e.g., radiation, immunotherapy, etc.)\n"
        "- Prior chemotherapy (e.g., drug names, cycles, outcomes)\n"
        "- Surgical history (e.g., type of surgery, dates if available)\n"
        "- Medications that may affect radiology/oncology treatment.\n"
        "Provide a concise summary suitable for use in a clinical context."
    )
    payload = {
        "model": "mistral:latest",
        "prompt": prompt,
        "stream": False,
    }

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        return response.json().get("response", "No relevant medical history extracted.")
    else:
        return f"Error generating medical history summary: {response.status_code}"


def get_medical_summary(text):
    """
    Generates an improved summary of relevant medical history, including prior treatment,
    chemotherapy, surgeries, medications, and other critical insights, based on input medical data.

    Args:
        text (str): Input medical text (e.g., pathology, radiology reports).

    Returns:
        str: Improved summary of relevant medical history.
    """
    url = "http://localhost:11434/api/generate"

    # Improved prompt for the model
    prompt = (
        f"Given the following detailed medical text:\n\n{text}\n\n"
        "Summarize the patient's prior medical history, focusing on:\n"
        "- Key treatment milestones (e.g., radiation, immunotherapy, surgeries).\n"
        "- Outcomes of prior treatments (e.g., response to chemotherapy or radiation).\n"
        "- Relevant surgical history (e.g., type, date, outcomes).\n"
        "- Current and past medications relevant to treatment.\n"
        "- Clinical implications for future treatments based on the patient's history.\n\n"
        "Format the response as a concise summary suitable for use by oncologists or radiologists. "
        "Use bullet points where appropriate for clarity. Ensure the information is actionable, medically accurate, "
        "and includes critical findings for clinical decision-making (DONT: "
        "RESPOND WITH TEXT COPIED VERBATIM, INCLUDE ANY INFORMATION WITH "
        "NAMES IN YOUR RESPONSE)."
    )
    payload = {
        "model": "mistral:latest",
        "prompt": prompt,
        "stream": False,
    }

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        return response.json().get("response", "No improved medical summary generated.")
    else:
        return f"Error generating improved medical summary: {response.status_code}"


##############################################################################


# routes
@ollama_api.route("/improve-summary", methods=["POST"])
def improve_summary():
    if (
        "file" not in request.files
        or "feedback" not in request.form
        or "initial_summary" not in request.form
    ):
        return jsonify({"error": "Missing required data"}), 400

    file = request.files["file"]
    feedback = request.form["feedback"]
    initial_summary = request.form["initial_summary"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        try:
            text = parse_pdf(file)

            # Include the feedback and initial summary in the new prompt
            prompt = f"""
                Original Medical Summary:
                {initial_summary}

                User Feedback:
                {feedback}

                Based on the above summary and feedback, refine the output to better meet the user's expectations.
                The summary should remain concise, clinically relevant, and align with medical standards.

                Input Text:
                {text}
            """
            payload = {
                "model": "mistral:latest",
                "prompt": prompt,
                "stream": False,
            }

            # Send the new prompt to the LLM
            url = "http://localhost:11434/api/generate"
            response = requests.post(url, json=payload)

            if response.status_code == 200:
                improved_summary = response.json().get(
                    "response", "No improved summary generated."
                )
                return jsonify({"improved_summary": improved_summary}), 200
            else:
                return (
                    jsonify({"error": f"LLM request failed: {response.status_code}"}),
                    500,
                )

        except Exception as e:
            return jsonify({"error": f"Error processing the request: {str(e)}"}), 500

    return jsonify({"error": "Invalid file type"}), 400


@ollama_api.route("/summarize-pdf", methods=["POST"])
def summarize_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        # Extract text from the uploaded PDF
        text = parse_pdf(file)

        # Generate summaries with two different prompts
        summary1 = get_relevant_medical_history(text)  # First prompt
        summary2 = get_medical_summary(text)  # Second prompt

        return jsonify({"summary1": summary1, "summary2": summary2}), 200

    return jsonify({"error": "Invalid file type"}), 400


def clean_and_parse_json(raw_response):
    """
    Attempt to clean and parse JSON with multiple fallback strategies.

    :param raw_response: Raw text response from Ollama
    :return: Parsed dictionary of medical classifications
    """
    print(raw_response)
    # Default structure to return if parsing fails
    default_structure = {
        "disease_site": None,
        "tumor_stage": None,
        "laterality": None,
        "patient_info": {"age": None, "sex": None},
        "ebrt_relevance": None,
    }

    # Attempt 1: Direct JSON parsing
    try:
        return json.loads(raw_response)
    except json.JSONDecodeError:
        print("Initial JSON parsing failed. Attempting cleanup...")

    # Attempt 2: Remove trailing incomplete data
    try:
        # Find the last complete JSON object
        match = re.search(r"\{[^{}]*\}", raw_response, re.DOTALL)
        if match:
            cleaned_json = match.group(0)
            return json.loads(cleaned_json)
    except (json.JSONDecodeError, AttributeError):
        print("Cleaned JSON parsing failed.")

    # Attempt 3: Manual extraction using regex
    try:
        # Extract key-value pairs using regex
        extracted_data = {}

        # Disease Site
        site_match = re.search(r'"disease_site"\s*:\s*"([^"]*)"', raw_response)
        extracted_data["disease_site"] = site_match.group(1) if site_match else None

        # Tumor Stage
        stage_match = re.search(r'"tumor_stage"\s*:\s*"([^"]*)"', raw_response)
        extracted_data["tumor_stage"] = stage_match.group(1) if stage_match else None

        # Laterality
        lateral_match = re.search(r'"laterality"\s*:\s*"([^"]*)"', raw_response)
        extracted_data["laterality"] = lateral_match.group(1) if lateral_match else None

        # Patient Info (Age)
        age_match = re.search(r'"age"\s*:\s*(\d+|null)', raw_response)
        extracted_data["patient_info"] = {
            "age": (
                int(age_match.group(1))
                if age_match and age_match.group(1) != "null"
                else None
            ),
            "sex": None,
        }

        # EBRT Relevance
        ebrt_match = re.search(
            r'"ebrt_relevance"\s*:\s*(true|false|null)', raw_response
        )
        extracted_data["ebrt_relevance"] = ebrt_match.group(1) if ebrt_match else None

        return extracted_data
    except Exception as e:
        print(f"Manual extraction failed: {e}")

    # Fallback to default structure
    return default_structure


def ollama_medical_classification(text, model_name="mistral:latest"):
    """
    Generate structured medical classifications from a PDF text using Ollama.
    """
    url = "http://localhost:11434/api/generate"

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

    Important:
    - Use null if information is not found
    - Ensure valid JSON syntax only
    - Be concise and precise
    """

    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0},
    }

    print(f"Sending request to model {model_name}")  # Debug print
    response = requests.post(url, json=payload)

    if response.status_code == 200:
        try:
            response_data = response.json()
            raw_response = response_data.get("response", "")

            print(f"Raw response from {model_name}:", raw_response)  # Debug print

            # Clean and parse the response
            classifications = clean_and_parse_json(raw_response)

            print(
                f"Cleaned response from {model_name}:", classifications
            )  # Debug print
            return classifications

        except Exception as e:
            print(f"Error processing {model_name} response:", str(e))  # Debug print
            return {
                "error": f"Processing failed: {str(e)}",
                "raw_response": raw_response,
            }
    else:
        return {
            "error": f"API request failed with status {response.status_code}",
            "details": response.text,
        }


# The route remains the same as in the previous implementation
@ollama_api.route("/classify-medical-report", methods=["POST"])
def classify_medical_report():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        # Extract text from the uploaded PDF
        text = parse_pdf(file)

        # Generate structured medical classifications
        classifications = ollama_medical_classification(text)

        return jsonify(classifications), 200

    return jsonify({"error": "Invalid file type"}), 400


#################################################################
###################### new model aggregation##################
#################################################################


def compare_medical_classifications(classifications_list):
    """
    Compare multiple medical classifications for consistency and return structured output.

    Args:
        classifications_list (list): List of dictionaries containing medical classifications

    Returns:
        dict: Structured JSON response containing classifications and comparison results
    """
    # Define the default structure for each classification
    default_structure = {
        "disease_site": None,
        "tumor_stage": None,
        "laterality": None,
        "patient_info": {"age": None, "sex": None},
        "ebrt_relevance": None,
    }

    # Initialize response structure
    response = {
        "classifications": {},
        "is_consistent": True,
        "differences": {},
        "error": None,
    }

    # Handle empty or single classification case
    if not classifications_list or len(classifications_list) < 2:
        response["error"] = "Insufficient classifications for comparison"
        return response

    # Add classifications to response with index
    for idx, classification in enumerate(classifications_list):
        # Check if classification contains an error
        if "error" in classification:
            response["error"] = (
                f"Classification {idx} failed: {classification['error']}"
            )
            response["classifications"][f"classification_{idx}"] = default_structure
            continue

        # Ensure classification matches default structure
        structured_classification = default_structure.copy()
        structured_classification.update(
            {
                k: v
                for k, v in classification.items()
                if k in default_structure and k != "patient_info"
            }
        )

        # Handle patient_info separately
        if "patient_info" in classification and isinstance(
            classification["patient_info"], dict
        ):
            structured_classification["patient_info"].update(
                {
                    k: v
                    for k, v in classification["patient_info"].items()
                    if k in default_structure["patient_info"]
                }
            )

        response["classifications"][f"classification_{idx}"] = structured_classification

    # Compare classifications if no errors occurred
    if not response["error"]:
        reference = response["classifications"]["classification_0"]

        for idx in range(1, len(classifications_list)):
            current = response["classifications"][f"classification_{idx}"]

            for key in default_structure.keys():
                if key == "patient_info":
                    for sub_key in default_structure[key].keys():
                        ref_value = reference[key].get(sub_key)
                        curr_value = current[key].get(sub_key)

                        if ref_value != curr_value:
                            diff_key = f"patient_info.{sub_key}"
                            if diff_key not in response["differences"]:
                                response["differences"][diff_key] = []
                            response["differences"][diff_key].append(
                                {
                                    "classification_index": idx,
                                    "reference_value": ref_value,
                                    "current_value": curr_value,
                                }
                            )
                else:
                    ref_value = reference.get(key)
                    curr_value = current.get(key)

                    if ref_value != curr_value:
                        if key not in response["differences"]:
                            response["differences"][key] = []
                        response["differences"][key].append(
                            {
                                "classification_index": idx,
                                "reference_value": ref_value,
                                "current_value": curr_value,
                            }
                        )

        response["is_consistent"] = len(response["differences"]) == 0

    return response


@ollama_api.route("/aggregate-classified-medical-report", methods=["POST"])
def aggregate_classified_medical_report():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        text = parse_pdf(file)

        # Get classifications from different models
        classifications = [
            ollama_medical_classification(text, "mistral:latest"),
            ollama_medical_classification(text, "llama3.2:latest"),
            ollama_medical_classification(text, "phi3:mini"),
        ]

        # Compare and get structured response
        response = compare_medical_classifications(classifications)
        return jsonify(response), 200

    return jsonify({"error": "Invalid file type"}), 400


# @ollama_api.route("/structured-data/analyze", methods=["POST"])
# def analyze_structured_data():
#     """Endpoint to analyze structured data using Llama and Phi models."""
#     if "file" not in request.files:
#         return jsonify({"error": "No file part"}), 400

#     file = request.files["file"]
#     if file.filename == "":
#         return jsonify({"error": "No selected file"}), 400

#     if file and is_pdf(file.filename):
#         try:
#             text = parse_pdf(file)

#             # Get classifications from Llama and Phi models
#             models = {
#                 "llama": "llama3.2:latest",
#                 "phi": "phi3:mini"
#             }

#             results = {}
#             for model_name, model_id in models.items():
#                 results[model_name] = ollama_medical_classification(text, model_id)

#             response = {
#                 "timestamp": datetime.now().isoformat(),
#                 "file_name": file.filename,
#                 "results": results,
#                 "models_used": list(models.keys())
#             }

#             return jsonify(response), 200

#         except Exception as e:
#             return jsonify({"error": str(e)}), 500


#     return jsonify({"error": "Invalid file type"}), 400


@ollama_api.route("/structured-data/analyze", methods=["POST"])
def analyze_structured_data():
    """Endpoint to analyze structured data using Llama and Phi models."""
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

            # Get classifications from Llama and Phi models
            models = {"llama": "llama3.2:latest", "phi": "phi3:mini"}

            results = {}
            for model_name, model_id in models.items():
                results[model_name] = ollama_medical_classification(
                    cleaned_text, model_id
                )

            response = {
                "timestamp": datetime.now().isoformat(),
                "file_name": file.filename,
                "results": results,
                "models_used": list(models.keys()),
            }

            return jsonify(response), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Invalid file type"}), 400


def remove_patient_names(text, first_name, last_name):
    """Remove patient's first and last name from the text."""
    import re

    if first_name:
        pattern_first = re.compile(re.escape(first_name), re.IGNORECASE)
        text = pattern_first.sub("[REDACTED]", text)

    if last_name:
        pattern_last = re.compile(re.escape(last_name), re.IGNORECASE)
        text = pattern_last.sub("[REDACTED]", text)

    return text


@ollama_api.route("/structured-data/select", methods=["POST"])
def select_model_result():
    """Endpoint to select and store a specific model's result as the chosen classification."""
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


@ollama_api.route("/structured-data/feedback", methods=["POST"])
def submit_feedback():
    """
    Endpoint to submit feedback about the analysis results
    """
    data = request.json
    if not data or "model_name" not in data or "feedback" not in data:
        return jsonify({"error": "Missing required feedback data"}), 400

    try:
        # Here you would typically store the feedback in your database
        feedback_record = {
            "timestamp": datetime.now().isoformat(),
            "model_name": data["model_name"],
            "feedback": data["feedback"],
            "accuracy_rating": data.get("accuracy_rating"),
            "comments": data.get("comments"),
        }

        return (
            jsonify(
                {"message": "Feedback submitted successfully", "data": feedback_record}
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Error submitting feedback: {str(e)}"}), 500


# Add these functions to your existing ollamaApis.py


def generate_oneliner_with_model(text, model_name):
    """Generate a one-liner summary using specified Ollama model."""
    url = "http://localhost:11434/api/generate"
    prompt = f"""
    You are a highly skilled medical AI assistant. Generate a concise, accurate one-line summary 
    of the following medical text that captures key diagnoses and clinical implications:

    {text}

    The summary should be:
    1. One sentence only
    2. Highlight key diagnosis
    3. Include critical clinical findings
    4. Note important treatment implications
    """

    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0},
    }

    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            return response.json().get("response", "No summary generated.")
        else:
            return f"Error generating summary: {response.status_code}"
    except Exception as e:
        print(f"Error with {model_name}: {str(e)}")
        return f"Error generating {model_name} summary"


# @ollama_api.route("/generate-oneliners", methods=["POST"])
# def generate_oneliners():
#     """Generate one-liner summaries from multiple Ollama models."""
#     if "file" not in request.files:
#         return jsonify({"error": "No file part"}), 400

#     file = request.files["file"]
#     if file.filename == "":
#         return jsonify({"error": "No selected file"}), 400

#     if file and is_pdf(file.filename):
#         try:
#             # Extract text from the uploaded PDF
#             text = parse_pdf(file)

#             # Get responses from Llama and Phi models
#             llama_response = generate_oneliner_with_model(text, "llama3.2:latest")
#             phi_response = generate_oneliner_with_model(text, "phi3:mini")

#             return (
#                 jsonify(
#                     {"llama_response": llama_response, "phi_response": phi_response}
#                 ),
#                 200,
#             )

#         except Exception as e:
#             return jsonify({"error": f"Error processing the request: {str(e)}"}), 500

#     return jsonify({"error": "Invalid file type"}), 400


@ollama_api.route("/generate-oneliners", methods=["POST"])
def generate_oneliners():
    """Generate one-liner summaries from multiple Ollama models."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    first_name = request.form.get("firstName", "").strip()
    last_name = request.form.get("lastName", "").strip()

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and is_pdf(file.filename):
        try:
            # Extract text from the uploaded PDF
            text = parse_pdf(file)

            # Remove patient names from text
            cleaned_text = remove_patient_names(text, first_name, last_name)

            # Get responses from Llama and Phi models
            llama_response = generate_oneliner_with_model(
                cleaned_text, "llama3.2:latest"
            )
            phi_response = generate_oneliner_with_model(cleaned_text, "phi3:mini")

            return (
                jsonify(
                    {"llama_response": llama_response, "phi_response": phi_response}
                ),
                200,
            )

        except Exception as e:
            return jsonify({"error": f"Error processing the request: {str(e)}"}), 500

    return jsonify({"error": "Invalid file type"}), 400


@ollama_api.route("/improve-oneliner", methods=["POST"])
def improve_oneliner():
    """Improve a one-liner based on user feedback using Llama model."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    feedback = request.form.get("feedback")
    model_name = request.form.get("model_name")
    original_oneliner = request.form.get("original_oneliner")

    if not all([file, feedback, model_name, original_oneliner]):
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

            # Use Llama for improvements instead of Mistral
            payload = {
                "model": "llama3.2:latest",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0},
            }

            response = requests.post(
                "http://localhost:11434/api/generate", json=payload
            )
            if response.status_code != 200:
                return jsonify({"error": "Failed to generate improved summary"}), 500

            improved_oneliner = response.json().get("response", "")
            return jsonify({"improved_oneliner": improved_oneliner}), 200

        except Exception as e:
            return jsonify({"error": f"Error processing the request: {str(e)}"}), 500

    return jsonify({"error": "Invalid file type"}), 400


@ollama_api.route("/select-oneliner", methods=["POST"])
def select_oneliner():
    """Store the selected one-liner and associated metadata."""
    data = request.json
    if not data or "model_name" not in data or "oneliner" not in data:
        return jsonify({"error": "Missing required data"}), 400

    try:
        # Here you would typically store the selected one-liner in your database
        # For now, we'll just log it and return a success response
        print(f"Selected model: {data['model_name']}")
        print(f"Selected one-liner: {data['oneliner']}")

        selected_result = {
            "timestamp": datetime.now().isoformat(),
            "model_name": data["model_name"],
            "oneliner": data["oneliner"],
        }

        return (
            jsonify(
                {"message": "One-liner selected successfully", "data": selected_result}
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Error processing selection: {str(e)}"}), 500
