import sys
import os
from pathlib import Path
import time
# Ensure you have installed TotalSegmentator AND rt_utils:
# pip install TotalSegmentator rt_utils
try:
    from totalsegmentator.python_api import totalsegmentator
except ImportError:
    print("Error: TotalSegmentator library not found.")
    print("Please install it using 'pip install TotalSegmentator'")
    sys.exit(1)

# Check for rt_utils if planning DICOM output
try:
    import rt_utils
except ImportError:
    print("Error: rt_utils library not found, but required for DICOM RTSTRUCT output.")
    print("Please install it using 'pip install rt_utils'")
    # Decide if you want to exit here or only if output_type is 'dicom'
    sys.exit(1) # Uncomment if you want to exit immediately


# --- Configuration ---

# REQUIRED: Set the path to the directory containing the patient's DICOM files
input_dicom_directory = "./data/inputs/2c3110dc-2dc08082-45256ee9-e24b80f7-3451c586/CT"

# REQUIRED: Set the desired path for the output segmentation file (multi-label NIfTI)
# The directory will be created if it doesn't exist.
output_file_path = "./data/outputs/2c3110dc-2dc08082-45256ee9-e24b80f7-3451c586/RTSTRUCT"

# --- Other configuration options remain the same (fast, fastest, device, verbose) ---
use_fast_mode = False
use_fastest_mode = False
processing_device = "gpu"
verbose_output = True
# --- End Configuration ---


def run_segmentation(input_dir, output_file, fast, fastest, device, verbose):
    """
    Runs TotalSegmentator on a DICOM directory using the Python API,
    outputting a DICOM RTSTRUCT file.

    Args:
        input_dir (str): Path to the input DICOM directory.
        output_file (str): Path for the output DICOM RTSTRUCT file (.dcm).
        # ... other args remain the same
    """
    input_path = Path(input_dir)
    output_path = Path(output_file)

    # --- Input Validation and Directory Creation (same as before) ---
    if not input_path.is_dir():
        print(f"Error: Input DICOM directory not found at '{input_path}'")
        sys.exit(1)
    if not output_path.parent.exists():
        print(f"Creating output directory: {output_path.parent}")
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            print(f"Error creating output directory: {e}")
            sys.exit(1)

    # Check rt_utils installation again specifically before running
    try:
        import rt_utils
    except ImportError:
         print("Error: rt_utils library not found, but required for DICOM RTSTRUCT output.")
         print("Please install it using 'pip install rt_utils'")
         sys.exit(1)


    print("-" * 50)
    print("Starting TotalSegmentator Segmentation")
    print(f"Input DICOM Directory: {input_path}")
    print(f"Output RTSTRUCT File:  {output_path}") # Updated label
    print(f"Task:                total (Default CT structures)")
    print(f"Output Type:         DICOM RTSTRUCT (output_type='dicom')") # Updated label
    print(f"Fast Mode (3mm):     {fast}")
    print(f"Fastest Mode (6mm):  {fastest}")
    print(f"Processing Device:   {device}")
    print("-" * 50)

    start_time = time.time()

    try:
        # --- Run TotalSegmentator ---
        totalsegmentator(
            input=input_path,
            output=output_path,
            ml=True,             # ml=True is still recommended/needed for internal processing
            output_type="dicom", # Specify DICOM output
            task="total",
            fast=fast,
            fastest=fastest,
            device=device,
            verbose=verbose
            # ... other arguments
        )

        end_time = time.time()
        print("-" * 50)
        print("TotalSegmentator processing finished successfully!")
        print(f"Output saved to: {output_path}")
        print(f"Total processing time: {end_time - start_time:.2f} seconds")
        print("-" * 50)

    except Exception as e:
        end_time = time.time()
        print("-" * 50)
        print(f"An error occurred during TotalSegmentator processing: {e}")
        print(f"Processing time before error: {end_time - start_time:.2f} seconds")
        print("-" * 50)
        sys.exit(1)

if __name__ == "__main__":
    # Basic check if paths seem configured
    if "/path/to/your/" in input_dicom_directory or "/path/to/your/" in output_file_path:
        print("Error: Please update the 'input_dicom_directory' and 'output_file_path' variables")
        print("in the script configuration section before running.")
        sys.exit(1)
    # Check output file extension
    if not output_file_path.lower().endswith(".dcm"):
         print(f"Warning: Output file path '{output_file_path}' does not end with .dcm. Ensure this is intended for DICOM RTSTRUCT output.")


    run_segmentation(
        input_dir=input_dicom_directory,
        output_file=output_file_path,
        fast=use_fast_mode,
        fastest=use_fastest_mode,
        device=processing_device,
        verbose=verbose_output
    )