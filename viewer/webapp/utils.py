from data_manager import OrthancDataManager

def check_and_label_patients():
    """Utility function to check patient status and add initial labels"""
    dm = OrthancDataManager()
    
    # First, let's see what we have
    print("\nCurrent Patient Status:")
    dm.print_patient_status()
    
    # Get all patients without labels
    patient_info = dm.get_all_patients_info()
    for patient_id, labels in patient_info.items():
        # Force update labels (even if they exist)
        print(f"\nUpdating labels for patient {patient_id}")
        try:
            dm.add_labels(patient_id, ["unreviewed", "Nov24test"])
            print("Labels added successfully")
        except Exception as e:
            print(f"Error adding labels: {e}")
    
    # Show final status
    print("\nFinal Patient Status:")
    dm.print_patient_status()

if __name__ == "__main__":
    check_and_label_patients()