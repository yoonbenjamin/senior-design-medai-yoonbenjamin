import PyPDF2
import io

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
    return filename.lower().endswith('.pdf')