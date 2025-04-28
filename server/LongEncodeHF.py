from flask import Blueprint, Flask, jsonify, request
from flask_cors import CORS
from transformers import pipeline
import PyPDF2
import io

hf_bp = Blueprint("hf", __name__)

# Load the Longformer Encoder-Decoder model for summarization
summarizer = pipeline("summarization", model="allenai/led-large-16384")


@hf_bp.route("/hello_world-long", methods=["GET"])
def hello_world():
    """
    A simple endpoint that returns 'Hello World'.
    """
    return "Hello World"


@hf_bp.route("/summarize-text-long", methods=["POST"])
def summarize_text():
    """
    Endpoint to summarize input text.
    The request payload should contain a field 'text' which is the input text to be summarized.
    The response will contain the summarized text.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    input_text = parse_pdf(file)
    # input_text = ""

    # if file and is_pdf(file.filename):

    #     # Extract text from the uploaded PDF
    #     input_text = parse_pdf(file)

    if input_text == "":
        return jsonify({"error": "No input text provided"}), 400

    # Use the summarizer to summarize the text
    summary = summarizer(input_text, max_length=1000, min_length=30, do_sample=False)[
        0
    ]["summary_text"]

    return jsonify({"summary": summary}), 200


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
