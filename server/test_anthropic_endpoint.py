import requests

def test_text_input(url, text):
    response = requests.post(url, data={'text': text})
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {response.headers}")
    return response.json()

def test_file_upload(url, file_path):
    with open(file_path, 'rb') as file:
        response = requests.post(url, files={'file': file})
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {response.headers}")
    return response.json()

# URL of your Flask server
base_url = 'http://127.0.0.1:5000'

# Test with text input
text_input = """
# Pathology Report
*Patient Name:* Sarah Johnson
*Date of Birth:* 03/22/1970
*Medical Record Number:* MRN98765432
*Date of Surgery:* 08/05/2023
*Date of Report:* 08/10/2023
## Clinical History
53-year-old female with a screen-detected left breast mass. Patient underwent left breast lumpectomy with sentinel lymph node biopsy for planned APBI.
## Specimen
Left breast, lumpectomy with sentinel lymph node biopsy
## Gross Description
1. Received fresh for intraoperative consultation is an oriented left breast lumpectomy specimen measuring 5.5 x 4.2 x 2.8 cm. The specimen is inked according to orientation. Sectioning reveals a firm, tan-white, stellate mass measuring 1.4 cm in greatest dimension, located 0.5 cm from the closest margin (superior).
2. Separately received are two sentinel lymph nodes measuring 0.8 cm and 0.6 cm in greatest dimension.
## Microscopic Description
1. Lumpectomy: Sections show invasive ductal carcinoma, well to moderately differentiated (Nottingham Grade 2). Tumor cells are arranged in cords and nests with mild to moderate nuclear pleomorphism. Focal areas of ductal carcinoma in situ (DCIS) are present, comprising approximately 10% of the tumor volume. Margins are negative for invasive carcinoma and DCIS, with the closest margin (superior) at 0.5 cm.
2. Sentinel Lymph Nodes: Both nodes are negative for metastatic carcinoma.
## Immunohistochemistry
1. Estrogen Receptor (ER): Positive (95% of tumor cells, strong intensity)
2. Progesterone Receptor (PR): Positive (80% of tumor cells, moderate to strong intensity)
3. HER2/neu: Negative (score 1+)
4. Ki-67: 15%
## Diagnosis
Left breast, lumpectomy with sentinel lymph node biopsy:
- Invasive ductal carcinoma, well to moderately differentiated (Nottingham Grade 2)
- Tumor size: 1.4 cm
- Margins: Negative for invasive carcinoma and DCIS
  - Closest margin (superior): 0.5 cm
- Lymphovascular invasion: Not identified
- Ductal carcinoma in situ (DCIS): Present, cribriform type, low to intermediate nuclear grade
- Sentinel lymph nodes (2): Negative for metastatic carcinoma (0/2)
- Pathologic stage: pT1cN0M0
## Comments
1. The patient meets the following criteria for APBI consideration:
   - Tumor size ≤ 3 cm
   - Negative margins ≥ 2 mm
   - Node-negative disease
   - No lymphovascular invasion
2. The immunohistochemical profile suggests a Luminal A subtype breast cancer.
3. Results discussed in multidisciplinary tumor board on 08/11/2023.
4. Recommend radiation oncology consultation for APBI planning.
*Pathologist:* Dr. Michael Chen, MD
*Electronic Signature:* Michael Chen, MD
*Date Signed:* 08/10/2023
"""

print("Testing with text input:")
result = test_text_input(f'{base_url}/process-pathology-report', text_input)
print(result)

# Test with PDF file upload
pdf_path = '/Users/nicholasmolina/Downloads/message.pdf'  # Replace with the path to your PDF file

print("\nTesting with PDF upload:")
result = test_file_upload(f'{base_url}/process-pathology-report', pdf_path)
print(result)