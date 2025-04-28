from flask import Flask, Blueprint, jsonify, request
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import io
import fitz  # PyMuPDF
import re

# Initialize Flask app
app = Flask(__name__)

# Define the Blueprint
hugging_face_bp = Blueprint("hugging_face", __name__)

# Load BioBART tokenizer and model
model_name = "GanjinZero/biobart-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Create the pipeline
summarizer = pipeline("text2text-generation", model=model, tokenizer=tokenizer)


def fix_summary(summary):
    """
    Remove prompt-related content from the generated summary.
    """
    # Find where the summary starts by looking for the prompt's end
    prompt_end = summary.split("\n---\n")[
        1
    ]  # Get the patient summary part after the prompt

    return prompt_end


def fix_improved_summary(improved_summary):
    fixed = improved_summary.replace("Original Summary: ", "").strip()
    return fixed


@hugging_face_bp.route("/summarize-text", methods=["POST"])
def summarize_text():
    """
    Endpoint to summarize patient-specific input text.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        # Parse and preprocess the PDF content
        input_text = preprocess_text(parse_pdf(file))
        patient_summary = extract_patient_data(input_text)

        if not patient_summary:
            return (
                jsonify({"error": "No relevant patient data found in the document."}),
                400,
            )

        prompts = [
            (
                "You are a medical summarization assistant. Output an informative medical one-liner that is clinical quality:\n\n"
                "---\n"
                f"{patient_summary}\n"
                "---"
            ),
            (
                "You are a medical summarization assistant. Generate a "
                "medically-focused summary for this patient data concisely (DONT: "
                "RESPOND WITH TEXT COPIED VERBATIM, INCLUDE ANY INFORMATION WITH "
                "NAMES IN YOUR RESPONSE):\n\n"
                "---\n"
                f"{patient_summary}\n"
                "---"
            ),
        ]

        # Generate raw summary
        summaries = [
            summarizer(prompt, max_length=150, min_length=50, do_sample=False)[0][
                "generated_text"
            ]
            for prompt in prompts
        ]

        return (
            jsonify(
                {
                    "summary1": fix_summary(prompts[0]),
                    "summary2": fix_summary(prompts[1]),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@hugging_face_bp.route("/improve-summary-hf", methods=["POST"])
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

    try:
        input_text = preprocess_text(parse_pdf(file))
        prompt = (
            f"Original Summary:\n{initial_summary}\n\n"
            f"User Feedback:\n{feedback}\n\n"
            f"Patient Data:\n{input_text}\n\n"
            f"Refine the summary based on the feedback and patient data."
        )

        improved_summary = summarizer(
            prompt, max_length=150, min_length=50, do_sample=False
        )[0]["generated_text"]

        return (
            jsonify({"improved_summary": fix_improved_summary(improved_summary)}),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


def parse_pdf(file_storage):
    """
    Parse a PDF file and return its text content.
    """
    try:
        pdf_file = io.BytesIO(file_storage.read())
        pdf_document = fitz.open(stream=pdf_file, filetype="pdf")
        text_content = ""
        for page in pdf_document:
            text_content += page.get_text()
        return text_content.strip()
    except Exception as e:
        raise ValueError(f"Error parsing PDF: {str(e)}")


def preprocess_text(text):
    """
    Clean and preprocess text before summarization.
    """
    # Remove extra spaces, non-ASCII characters, and redundant newlines
    text = re.sub(r"\s+", " ", text)  # Collapse multiple spaces
    text = re.sub(r"[^\x00-\x7F]+", " ", text)  # Remove non-ASCII characters
    return text.strip()


def extract_patient_data(text):
    """
    Extract specific sections of the patient data for summarization.
    """
    # Define the sections to extract (Patient-specific info, diagnosis, treatment, etc.)
    sections = {
        "Patient Info": r"Patient Name:.*?Date of Birth:.*?",
        "Clinical History": r"## Clinical History.*?(?=##|\Z)",
        "Diagnosis": r"## Diagnosis.*?(?=##|\Z)",
        "Comments": r"## Comments.*?(?=##|\Z)",
    }

    extracted_data = []
    for title, pattern in sections.items():
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            extracted_data.append(match.group(0).strip())

    # Combine relevant data into one string and return
    return " ".join(extracted_data).strip()


# Register the Blueprint
app.register_blueprint(hugging_face_bp, url_prefix="/api")

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)
