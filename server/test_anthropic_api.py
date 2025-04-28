import os
import anthropic
from dotenv import load_dotenv

# Load environment variables from .env file (if using)
load_dotenv()

# Get the API key from environment variable
api_key = os.getenv('ANTHROPIC_API_KEY')
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY environment variable is not set")

# Initialize the Anthropic client
client = anthropic.Anthropic(api_key=api_key)

prompt = "Hello, world!"

try:
    response = client.completions.create(
        model="claude-2",
        prompt=f"{anthropic.HUMAN_PROMPT} {prompt}{anthropic.AI_PROMPT}",
        max_tokens_to_sample=100,
    )
    print("API Response:", response.completion)
except Exception as e:
    print(f"An error occurred: {str(e)}")