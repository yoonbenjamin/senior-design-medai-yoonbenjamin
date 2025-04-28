# webapp/dicom_handler.py
from pathlib import Path
import pydicom
import numpy as np
from typing import List, Dict, Optional
import base64
import io
# from shapely.geometry import Polygon
from PIL import Image, ImageDraw
import cv2
import traceback
from flask import jsonify
from scipy.interpolate import RegularGridInterpolator  # ensure this is imported at the top

class DicomHandler:
    def __init__(self, study_id, cache_dir, roi_labels=None, debug=False):
        self.study_id = study_id
        self.cache_dir = Path(cache_dir)
        self.roi_labels = {label.lower() for label in (roi_labels or [])}
        print(f"ROI labels: {self.roi_labels}")
        self.debug = debug
        self.found_roi_labels = {}
        
        # Initialize attributes
        self.series_data = None
        self.structures = None
        self.slice_positions = None
        
        # Add caches for performance
        self.processed_contours_cache = {}  # Cache for processed contours by slice
        self.color_cache = {}              # Cache for RGB colors
        self.structure_sets = {}
        
        # Define a list of visually distinct colors (in hex)
        self.color_cycle = [
            '#0000FF',  # Blue
            '#FF0000',  # Red
            '#00FF00',  # Green
            '#FFB600',  # Orange
            '#FF69B4',  # Pink
            '#9370DB',  # Medium Purple
            '#20B2AA',  # Light Sea Green
            '#FF4500',  # Orange Red
            '#FFD700',  # Gold
            '#00FFFF',  # Cyan
            '#FF1493',  # Deep Pink
            '#32CD32',  # Lime Green
            '#BA55D3',  # Medium Orchid
            '#4169E1',  # Royal Blue
            '#8B4513',  # Saddle Brown
            '#48D1CC',  # Medium Turquoise
            '#FF8C00',  # Dark Orange
            '#7B68EE',  # Medium Slate Blue
            '#00FA9A',  # Medium Spring Green
            '#DC143C',  # Crimson
        ]
        
        # Dictionary to store assigned colors
        self.structure_color_map = {}
        self.current_color_index = 0
        
        self.dose = None
        
        # Default window/level settings
        self.window = 400
        self.level = 40
        
        self._debug("DicomHandler initialized")

    def _debug(self, message):
        """Conditional debug logging"""
        if self.debug:
            print(message)

    def is_loaded(self):
        """Check if study data is loaded"""
        return self.series_data is not None

    def load_study_data(self):
        """Load and cache all study data"""
        try:
            self._debug("Loading study data")
            
            # Load CT series
            ct_dir = self.cache_dir / 'CT'
            if ct_dir.exists():
                self.series_data = self._load_ct_series(ct_dir)
                self._debug(f"Loaded {len(self.series_data)} CT slices")
            else:
                self._debug(f"No CT directory found at {ct_dir}")
                raise FileNotFoundError(f"No CT directory found at {ct_dir}")

            # Load structures 
            rt_dir = self.cache_dir / 'RTSTRUCT'
            if rt_dir.exists():
                rt_files = list(rt_dir.glob('*.dcm'))
                if rt_files:
                    rt_file_to_load = None
                    if len(rt_files) == 1:
                        rt_file_to_load = rt_files[0]
                    elif len(rt_files) > 1:
                        for rt_file in rt_files:
                            rt_struct = pydicom.dcmread(str(rt_file))
                            roi_names = {str(struct.ROIName).lower() for struct in rt_struct.StructureSetROISequence}
                            if 'all' in self.roi_labels and len(roi_names) > 0:
                                rt_file_to_load = rt_file
                                self.found_roi_labels = roi_names
                                print(f"RTSTRUCT file found with all ROIs: {rt_file_to_load}")
                                break
                            intersection = self.roi_labels.intersection(roi_names)
                            if intersection:
                                print(f"Found matching ROI in {rt_file}: {intersection}")
                                rt_file_to_load = rt_file
                                break
                    if rt_file_to_load:
                        self._load_rt_structures(rt_file_to_load)
                        self._debug(f"Loaded RTSTRUCT file: {rt_file_to_load}")
                    else:
                        self._debug("No matching ROIs found in RTSTRUCT files")
                        raise ValueError("No matching ROIs found in RTSTRUCT files")
                else:
                    self._debug("No RTSTRUCT files found")
            else:
                self._debug(f"No RTSTRUCT directory found at {rt_dir}")
            # Pre-process and cache contours for all slices
            if self.series_data and self.structure_sets:
                self._cache_processed_contours()

            # Placeholder for dose loading
            dose_dir = self.cache_dir / 'RTDOSE'
            if dose_dir.exists():
                print("RT dose found")
                self._load_rt_dose()
            print("\n=== Study Data Load Complete ===")

        except Exception as e:
            self._debug(f"Error loading study data: {str(e)}")
            raise

    def _load_ct_series(self, ct_dir):
        """Load CT series from cache directory"""
        try:
            self._debug(f"\nLoading CT series from {ct_dir}")
            series_files = list(ct_dir.glob('*.dcm'))
            series_data = []
            
            # First pass: collect all slices and positions
            for dcm_file in series_files:
                ds = pydicom.dcmread(str(dcm_file))
                pos = float(ds.SliceLocation)
                series_data.append((pos, ds, dcm_file))
                
            # Sort by position from inferior to superior
            series_data.sort(key=lambda x: x[0])
            
            self._debug("\nDEBUG: Sorted slice order")
            self._debug("=" * 50)
            for pos, _, f in series_data:
                self._debug(f"File: {f.name:30} | Position: {pos:8.2f}")

                
            # Store sorted data
            self.series_data = [ds for _, ds, _ in series_data]
            self.slice_positions = [pos for pos, _, _ in series_data]
            
            self._debug(f"\nLoaded {len(self.series_data)} slices")
            self._debug(f"Position range: {self.slice_positions[0]:.2f} to {self.slice_positions[-1]:.2f}")
            
            return self.series_data
            
        except Exception as e:
            print(f"Error loading CT series: {str(e)}")
            traceback.print_exc()
            raise

    def _get_slice_contours(self, contours, slice_pos, tolerance=0.5):
        """Get contours for a specific slice position"""
        try:
            # Debug the input
            self._debug(f"\nContour debug for slice {slice_pos}:")
            self._debug(f"Looking for contours near z={slice_pos} (tolerance={tolerance})")
            
            slice_contours = []
            for z_pos, points_list in contours.items():
                if abs(float(z_pos) - slice_pos) <= tolerance:
                    self._debug(f"Found contour at z={z_pos}")
                    for points in points_list:
                        # Convert to pixel coordinates
                        points_2d = points[:, :2]  # Take only x,y coordinates
                        points_2d = self._convert_to_pixel_coords(points_2d)
                        slice_contours.append(points_2d.astype(np.int32))
                
            self._debug(f"Found {len(slice_contours)} contours for this slice")
            return slice_contours

        except Exception as e:
            print(f"Error in _get_slice_contours: {str(e)}")
            traceback.print_exc()
            return None

    def _convert_to_pixel_coords(self, points):
        """Convert DICOM coordinates to pixel coordinates"""
        # Get image position and spacing from series data
        image_position = self.series_data[0].ImagePositionPatient
        pixel_spacing = self.series_data[0].PixelSpacing
        
        # Convert points to pixel coordinates
        x_points = (points[:, 0] - image_position[0]) / pixel_spacing[0]
        y_points = (points[:, 1] - image_position[1]) / pixel_spacing[1]
        
        return np.column_stack([x_points, y_points])

    def get_slice_image(self, slice_index, window=None, level=None, overlay_opacity=0.5, dose_opacity=0.7):
        """Get slice image with dose overlay and cached contours.
        
        Parameters:
            slice_index (int): The index of the CT slice.
            window (int): Optional window value.
            level (int): Optional level value.
            overlay_opacity (float): Opacity for contour overlay.
            dose_opacity (float): Maximum opacity factor for the dose overlay.
        
        Returns:
            dict: Contains 'status' and either the base64 encoded image or an error message.
        """
        try:
            # Get base CT image using window/level settings
            base_image = self._get_windowed_image(slice_index, window, level)
            if base_image is None:
                return {'status': 'error', 'message': 'Failed to get base image'}
            
            # Convert CT image to RGB for blending
            ct_rgb = cv2.cvtColor(base_image, cv2.COLOR_GRAY2RGB).astype(np.float32)
            
            # Initialize blended image as the CT image
            blended = ct_rgb.copy()
            
            # If dose data has been loaded, blend the dose overlay
            if hasattr(self, 'dose') and self.dose is not None and hasattr(self, 'colored_dose') and self.colored_dose is not None:
                # Ensure slice_index is within the dose volume
                if slice_index < self.dose.shape[0]:
                    # Get raw dose values (in Gy) for this slice
                    raw_dose = self.dose[slice_index]
                    # Compute per-pixel alpha based on the dose value
                    # Only consider pixels where dose > 0 for normalization
                    mask = raw_dose > 0
                    if np.any(mask):
                        dose_min = raw_dose[mask].min()
                        dose_max = raw_dose.max()
                        # Avoid division by zero; if dose_max equals dose_min, set mask to zeros
                        if dose_max > dose_min:
                            dose_norm = np.zeros_like(raw_dose, dtype=np.float32)
                            dose_norm[mask] = (raw_dose[mask] - dose_min) / (dose_max - dose_min)
                        else:
                            dose_norm = np.zeros_like(raw_dose, dtype=np.float32)
                    else:
                        dose_norm = np.zeros_like(raw_dose, dtype=np.float32)
                    
                    # Create a per-pixel alpha mask scaled by dose_opacity
                    alpha_mask = np.clip(dose_norm * dose_opacity, 0, dose_opacity)
                    # Expand alpha mask to 3 channels
                    alpha_mask_3ch = np.repeat(alpha_mask[:, :, np.newaxis], 3, axis=2)
                    
                    # Get the colored dose overlay for the slice
                    dose_overlay = self.colored_dose[slice_index].astype(np.float32)
                    
                    # Blend the dose overlay with the CT image on a per-pixel basis
                    # This formula ensures that if alpha is 0, the CT remains unchanged
                    blended = ct_rgb * (1 - alpha_mask_3ch) + dose_overlay * alpha_mask_3ch
                    blended = np.clip(blended, 0, 255)
            
            # Prepare an overlay for the contours
            contour_overlay = np.zeros_like(blended, dtype=np.uint8)
            if slice_index in self.processed_contours_cache:
                self._draw_cached_contours(contour_overlay, slice_index)
            
            # Blend the contour overlay with the current blended image
            final_image = cv2.addWeighted(blended.astype(np.uint8), 1.0, contour_overlay, overlay_opacity, 0)
            
            # Encode the final image as PNG and return it as base64
            success, buffer = cv2.imencode('.png', final_image)
            if success:
                return {'status': 'success', 'image': base64.b64encode(buffer).decode('utf-8')}
            else:
                return {'status': 'error', 'message': 'Failed to encode image'}
            
        except Exception as e:
            self._debug(f"Error in get_slice_image with dose overlay: {str(e)}")
            traceback.print_exc()
            return {'status': 'error', 'message': str(e)}


    def _get_windowed_image(self, slice_index, window=None, level=None):
        """Get windowed CT image"""
        if 0 <= slice_index < len(self.series_data):
            # Use provided window/level or defaults
            window = window if window is not None else self.window
            level = level if level is not None else self.level
            
            slice_data = self.series_data[slice_index].pixel_array
            
            # Apply rescale slope and intercept
            if hasattr(self.series_data[slice_index], 'RescaleSlope'):
                slice_data = slice_data * self.series_data[slice_index].RescaleSlope
            if hasattr(self.series_data[slice_index], 'RescaleIntercept'):
                slice_data = slice_data + self.series_data[slice_index].RescaleIntercept
            
            # Apply window/level
            min_hu = level - window/2
            max_hu = level + window/2
            slice_data = np.clip(slice_data, min_hu, max_hu)
            
            # Normalize to 0-255
            slice_data = ((slice_data - min_hu) / (max_hu - min_hu) * 255).astype(np.uint8)
            
            return slice_data
        return None


############ STRUCTURE HANDLING ############

    def _cache_processed_contours(self):
        """Pre-process and cache contours for all slices"""
        self._debug("Pre-processing contours for all slices")
        
        for idx, slice_pos in enumerate(self.slice_positions):
            self.processed_contours_cache[idx] = {}
            
            for struct_set in self.structure_sets.values():
                for name, data in struct_set.items():
                    # Skip if not in allowed ROIs
                    if (self.roi_labels and name.lower() not in self.roi_labels) and 'all' not in self.roi_labels:
                        continue
                        
                    # Process contours for this slice
                    processed_contours = self._get_slice_contours(data['contours'], slice_pos)
                    if processed_contours:
                        self.processed_contours_cache[idx][name] = {
                            'contours': processed_contours,
                            'color': self._get_cached_color(data['color'])
                        }
    
    def _draw_cached_contours(self, overlay, slice_index):
        """Draw all cached contours for a slice"""
        cached_data = self.processed_contours_cache.get(slice_index, {})
        
        # Draw all contours in one pass
        for name, data in cached_data.items():
            contours = data['contours']
            color = data['color']
            
            # Adjust line thickness based on structure type
            thickness = 3 if 'ptv' in name.lower() else 2
            
            cv2.polylines(overlay, 
                         contours,
                         isClosed=True,
                         color=color,
                         thickness=thickness)

    def _add_structure_overlay(self, image, slice_index):
        """Placeholder for structure overlay"""
        # TODO: Implement structure overlay
        # For now, just return the original image
        self._debug("Structure overlay not yet implemented")
        return image
    
    def _load_rt_structures(self, rt_file):
        """Load RT structure sets from DICOM files"""
        try:
            self._debug(f"\n=== Loading RT Structure file: {rt_file} ===")
            rt_struct = pydicom.dcmread(str(rt_file))
            
            self._debug(f"Modality: {rt_struct.Modality}")
            
            # Debug print DICOM tags
            self._debug("\nAvailable sequences:")
            if hasattr(rt_struct, 'StructureSetROISequence'):
                self._debug(f"StructureSetROISequence length: {len(rt_struct.StructureSetROISequence)}")
            else:
                self._debug("No StructureSetROISequence found")
            
            if hasattr(rt_struct, 'ROIContourSequence'):
                self._debug(f"ROIContourSequence length: {len(rt_struct.ROIContourSequence)}")
            else:
                self._debug("No ROIContourSequence found")

            
            # Try to process if it's an RTSTRUCT
            if rt_struct.Modality == "RTSTRUCT":
                self._debug("\nProcessing structure set...")
                self._process_structure_set(rt_struct)
            else:
                self._debug(f"Unexpected modality: {rt_struct.Modality}")
            
        except Exception as e:
            print(f"Error loading RT structures: {str(e)}")
            traceback.print_exc()
    
    def _process_structure_set(self, rt_struct):
        """Process a single RT structure set, filtering for specified ROIs"""
        try:
            self._debug("\n=== Processing Structure Set ===")
            struct_set_id = rt_struct.SeriesInstanceUID
            self._debug(f"Structure Set ID: {struct_set_id}")
            self._debug(f"Filtering for ROIs: {self.roi_labels}")
            
            self.structure_sets[struct_set_id] = {}
            self.current_color_index = 0

            self._debug("\nProcessing ROIs:")
            for struct in rt_struct.StructureSetROISequence:
                roi_number = struct.ROINumber
                roi_name = str(struct.ROIName).lower()
                
                # Skip if not in allowed ROIs (when filtering is active)
                if (self.roi_labels and roi_name not in self.roi_labels) and 'all' not in self.roi_labels:
                    print(f"Skipping ROI: {roi_name} (not in filter list)")
                    self._debug(f"Skipping ROI: {roi_name} (not in filter list)")
                    continue
                
                print(f"Processing ROI: {roi_name} (Number: {roi_number})")
                self._debug(f"\nProcessing ROI: {roi_name} (Number: {roi_number})")
                
                # Find the contour data for this ROI
                contour_data = None
                for roi_contour in rt_struct.ROIContourSequence:
                    if roi_contour.ReferencedROINumber == roi_number:
                        contour_data = roi_contour
                        break

                if contour_data and hasattr(contour_data, 'ContourSequence'):
                    contour_count = len(contour_data.ContourSequence)
                    self._debug(f"  Found {contour_count} contours")
                    
                    self.structure_sets[struct_set_id][roi_name] = {
                        'number': roi_number,
                        'contours': self._process_contours(contour_data.ContourSequence),
                        'color': self._get_next_color()
                    }
                    self._debug(f"  Assigned color: {self.structure_sets[struct_set_id][roi_name]['color']}")
                else:
                    print(f"No contour data found for {roi_name}")
                    self._debug(f"  No contour data found for {roi_name}")

        except Exception as e:
            print(f"Error processing structure set: {str(e)}")
            traceback.print_exc()
    
    def _process_contours(self, contour_sequence):
        """Process contour sequence into a slice-organized structure"""
        contours_by_slice = {}
        
        for contour in contour_sequence:
            if hasattr(contour, 'ContourData'):
                # Get z position (slice location)
                z_pos = float(contour.ContourData[2])
                
                # Convert contour points to numpy array
                points = np.array(contour.ContourData).reshape(-1, 3)
                
                # Store only x,y points for this z position
                if z_pos not in contours_by_slice:
                    contours_by_slice[z_pos] = []
                contours_by_slice[z_pos].append(points[:, :2])

                # Ensure the contour is closed by adding the first point at the end if needed
                if not np.array_equal(points[0], points[-1]):
                    points = np.vstack([points, points[0]])
        
        return contours_by_slice
    
    def _draw_structure_on_slice(self, overlay, contours, slice_position, structure_name):
        """Draw structure contours on a specific slice"""
        try:
            # Find the closest slice to the contour Z position
            closest_slice_idx = min(range(len(self.slice_positions)), 
                                  key=lambda i: abs(self.slice_positions[i] - slice_position))
            slice_data = self.series_data[closest_slice_idx]
            
            # Get color for this structure
            color = self._get_color_for_structure(structure_name)
            color_rgb = tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
            
            # Draw contours for this slice
            for z_pos, slice_contours in contours.items():
                # Use a small tolerance for Z position matching (e.g., 0.1mm)
                if abs(z_pos - slice_position) <= 0.1:
                    for contour in slice_contours:
                        # Scale points to image coordinates
                        scaled_points = self._scale_points_to_image(contour, slice_data)
                        if len(scaled_points) >= 3:  # Need at least 3 points for a polygon
                            points = scaled_points.astype(np.int32)
                            cv2.polylines(overlay, 
                                        [points],
                                        isClosed=True,
                                        color=color_rgb,
                                        thickness=1)
                        
        except Exception as e:
            print(f"Error drawing contour for structure {structure_name}: {str(e)}")
            traceback.print_exc()

    def _scale_points_to_image(self, points, slice_data):
        """
        Scale contour points from DICOM coordinates to image coordinates
        
        Args:
            points: numpy array of contour points in DICOM coordinates
            slice_data: DICOM dataset for the current slice
        """
        try:
        # Get image orientation and position
            image_position = np.array(slice_data.ImagePositionPatient)
            pixel_spacing = np.array(slice_data.PixelSpacing)
            
            # Get image orientation vectors
            orientation = np.array(slice_data.ImageOrientationPatient)
            row_vector = orientation[:3]
            col_vector = orientation[3:]
            
            # Calculate offset from image position
            offset_points = points - image_position[:2]
            
            # Calculate pixel coordinates using the orientation vectors
            pixel_x = (offset_points[:, 0] * row_vector[0] + 
                    offset_points[:, 1] * row_vector[1]) / pixel_spacing[0]
            pixel_y = (offset_points[:, 0] * col_vector[0] + 
                    offset_points[:, 1] * col_vector[1]) / pixel_spacing[1]
            
            # Combine x and y coordinates
            pixel_coords = np.column_stack([pixel_x, pixel_y])
            
            # Ensure coordinates are within image bounds
            image_size = slice_data.pixel_array.shape
            pixel_coords[:, 0] = np.clip(pixel_coords[:, 0], 0, image_size[1]-1)
            pixel_coords[:, 1] = np.clip(pixel_coords[:, 1], 0, image_size[0]-1)
            
            # Add error checking for invalid coordinates
            if np.any(np.isnan(pixel_coords)) or np.any(np.isinf(pixel_coords)):
                self._debug(f"Warning: Invalid coordinates detected in contour")
                # Replace invalid values with zeros or other handling as needed
                pixel_coords = np.nan_to_num(pixel_coords, 0)
            
            return pixel_coords
            
        except Exception as e:
            self._debug(f"Error in coordinate transformation: {str(e)}")
            traceback.print_exc()
            return np.array([])  # Return empty array on error
    
    def _get_next_color(self):
        """Get the next color in the cycle"""
        color = self.color_cycle[self.current_color_index]
        self.current_color_index = (self.current_color_index + 1) % len(self.color_cycle)
        return color

    def _get_color_for_structure(self, structure_name):
        """Get (or assign) a color for a structure"""
        if structure_name not in self.structure_color_map:
            self.structure_color_map[structure_name] = self._get_next_color()
        return self.structure_color_map[structure_name]
    
    def get_available_structures(self):
        """Get list of available structures"""
        structures = set()
        for struct_set in self.structure_sets.values():
            structures.update(struct_set.keys())
        structs = list(structures)
        structs.sort()
        return structs
        # """Get list of available structures with their assigned colors"""
        # structures_with_colors = []
        # for struct_set in self.structure_sets.values():
        #     for struct_name in struct_set.keys():
        #         color = self._get_color_for_structure(struct_name)
        #         structures_with_colors.append({
        #             'name': struct_name,
        #             'color': color
        #         })
        # return structures_with_colors

    def find_first_contour_slice(self):
        """Find the slice index where contours first appear"""
        try:
            if not self.processed_contours_cache:
                return 0
            first_contour_slice = min((idx for idx, contours in self.processed_contours_cache.items() 
                          if contours), default=0)
            return max(0, first_contour_slice - 3)
        except Exception as e:
            print(f"Error finding first contour slice: {str(e)}")
            traceback.print_exc()
            return 0

    def get_contour_slice_ranges(self):
        """Get the range of slices containing contours for each structure"""
        try:
            structure_ranges = {}
            
            for struct_set in self.structure_sets.values():
                for name, data in struct_set.items():
                    if (self.roi_labels and name.lower() not in self.roi_labels) and 'all' not in self.roi_labels:
                        continue
                        
                    z_positions = sorted(float(z) for z in data['contours'].keys())
                    if z_positions:
                        # Find corresponding slice indices
                        start_idx = min(range(len(self.slice_positions)), 
                                      key=lambda i: abs(self.slice_positions[i] - z_positions[0]))
                        end_idx = min(range(len(self.slice_positions)), 
                                    key=lambda i: abs(self.slice_positions[i] - z_positions[-1]))
                        
                        structure_ranges[name] = {
                            'start_slice': start_idx,
                            'end_slice': end_idx,
                            'start_z': z_positions[0],
                            'end_z': z_positions[-1]
                        }
            
            return structure_ranges
            
        except Exception as e:
            print(f"Error getting contour ranges: {str(e)}")
            traceback.print_exc()
            return {}
    

############ DOSE HANDLING ############

    def _load_rt_dose(self):
        """
        Load and process the RTDOSE file.
        This method reads the RTDOSE DICOM file, rescales the dose values to Gy,
        resamples the dose grid to match the CT scan grid, and applies a jet colormap
        to produce a color overlay suitable for blending with CT images.
        """
        dose_dir = self.cache_dir / 'RTDOSE'
        if not dose_dir.exists():
            self._debug("No RTDOSE directory found")
            return

        rt_dose_files = list(dose_dir.glob('*.dcm'))
        if not rt_dose_files:
            self._debug("No RTDOSE files found")
            return

        try:
            dcm = pydicom.dcmread(str(rt_dose_files[0]))
            if dcm.Modality != "RTDOSE":
                self._debug(f"File modality is not RTDOSE: {dcm.Modality}")
                return

            # Obtain dose data in Gy
            dose_data = dcm.pixel_array * dcm.DoseGridScaling  # shape: (NumberOfFrames, Rows, Columns)
            # Build dose metadata
            dose_metadata = {
                'PixelSpacing': [float(x) for x in dcm.PixelSpacing],
                'ImagePositionPatient': [float(x) for x in dcm.ImagePositionPatient],
                'GridFrameOffsetVector': [float(x) for x in dcm.GridFrameOffsetVector],
                'Rows': int(dcm.Rows),
                'Columns': int(dcm.Columns),
                'NumberOfFrames': int(dcm.NumberOfFrames)
            }
            if len(dose_metadata['GridFrameOffsetVector']) > 1:
                dose_metadata['SliceThickness'] = float(dose_metadata['GridFrameOffsetVector'][1] - dose_metadata['GridFrameOffsetVector'][0])
            else:
                dose_metadata['SliceThickness'] = 1.0

            self._debug("RTDOSE metadata loaded.")

            # Create dose coordinate grids
            x_dose = np.arange(dose_metadata['Columns']) * dose_metadata['PixelSpacing'][1] + dose_metadata['ImagePositionPatient'][0]
            y_dose = np.arange(dose_metadata['Rows']) * dose_metadata['PixelSpacing'][0] + dose_metadata['ImagePositionPatient'][1]
            z_dose = np.array(dose_metadata['GridFrameOffsetVector']) + dose_metadata['ImagePositionPatient'][2]

            # Get CT metadata from the first CT slice
            ct_ds = self.series_data[0]
            ct_pixel_spacing = [float(x) for x in ct_ds.PixelSpacing]
            ct_rows = int(ct_ds.Rows)
            ct_cols = int(ct_ds.Columns)
            ct_position = [float(x) for x in ct_ds.ImagePositionPatient]
            x_ct = np.arange(ct_cols) * ct_pixel_spacing[1] + ct_position[0]
            y_ct = np.arange(ct_rows) * ct_pixel_spacing[0] + ct_position[1]
            z_ct = np.array(self.slice_positions)

            # Interpolate dose data onto the CT grid
            interpolator = RegularGridInterpolator(
                (z_dose, y_dose, x_dose),
                dose_data,
                method='linear',
                bounds_error=False,
                fill_value=0
            )
            ct_Z, ct_Y, ct_X = np.meshgrid(z_ct, y_ct, x_ct, indexing='ij')
            points = np.stack([ct_Z.ravel(), ct_Y.ravel(), ct_X.ravel()], axis=-1)
            resampled_dose = interpolator(points).reshape(ct_Z.shape)
            self._debug("Dose data resampled to CT grid.")

            # Store the raw resampled dose
            self.dose = resampled_dose

            # Normalize dose values to 0-255 for visualization
            dose_min = np.min(resampled_dose)
            dose_max = np.max(resampled_dose)
            if dose_max > dose_min:
                dose_norm = ((resampled_dose - dose_min) / (dose_max - dose_min) * 255).astype(np.uint8)
            else:
                dose_norm = np.zeros_like(resampled_dose, dtype=np.uint8)

            # Apply a colormap (jet) using OpenCV; process each CT slice individually
            colored_dose_slices = []
            for i in range(dose_norm.shape[0]):
                colored = cv2.applyColorMap(dose_norm[i], cv2.COLORMAP_JET)
                colored_dose_slices.append(colored)
            self.colored_dose = np.array(colored_dose_slices)
            self._debug("Colormap applied to dose data.")

        except Exception as e:
            self._debug(f"Error loading RT dose: {str(e)}")
            traceback.print_exc()

    def _add_dose_overlay(self, image, slice_index):
        """Placeholder for dose overlay"""
        # TODO: Implement dose overlay
        # For now, just return the original image
        print("Dose overlay not yet implemented")
        return image


############ IMAGE DISPLAY ############

    def _encode_image(self, image_array):
        """Encode image array to base64 string"""
        try:
            self._debug(f"Encoding image array shape: {image_array.shape}")
            success, buffer = cv2.imencode('.png', image_array)
            if success:
                encoded = base64.b64encode(buffer).decode('utf-8')
                self._debug(f"Successfully encoded image, length: {len(encoded)}")
                return encoded
            else:
                self._debug("Failed to encode image")
                return None
        except Exception as e:
            print(f"Error encoding image: {str(e)}")
            traceback.print_exc()
            return None
    
    def set_window_level(self, window, level):
        """Update window/level settings"""
        self.window = window
        self.level = level

    def get_preset_window_level(self, preset):
        """Get preset window/level values"""
        presets = {
            'soft_tissue': (400, 40),
            'lung': (1500, -600),
            'bone': (2000, 400),
            'brain': (80, 40),
            'mediastinum': (350, 50)
        }
        return presets.get(preset, (self.window, self.level))

    def _get_cached_color(self, hex_color):
        """Get cached RGB color"""
        if hex_color not in self.color_cache:
            self.color_cache[hex_color] = self._hex_to_rgb(hex_color)
        return self.color_cache[hex_color]

    def _hex_to_rgb(self, hex_color):
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def print_roi_labels(self):
        self._debug(f"ROI labels after conversion: {self.found_roi_labels}")