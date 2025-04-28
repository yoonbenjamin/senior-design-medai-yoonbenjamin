from flask import Flask, Blueprint, jsonify, request
from flask_cors import CORS
from transformers import pipeline

openai_api = Blueprint("openai", __name__)

summarizer = pipeline("summarization", model="facebook/bart-large")

@openai_api.route("/hello_world", methods=["GET"])
def hello_world():
    """
    A simple endpoint that returns 'Hello World'.
    """
    return "Hello World"

@openai_api.route("/summarize-text", methods=["POST"])
def summarize_text():
    """
    Endpoint to summarize input text.
    The request payload should contain a field 'text' which is the input text to be summarized.
    The response will contain the summarized text.
    """
    data = request.json
    input_text = data.get("text", "")

    if not input_text:
        return jsonify({"error": "No input text provided"}), 400

    # Use the summarizer to summarize the text
    summary = summarizer(input_text, max_length=100, min_length=30, do_sample=False)[0]['summary_text']

    return jsonify({"summary": summary}), 200
