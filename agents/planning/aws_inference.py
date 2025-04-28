# aws_inference.py
import torch
from nnunet_mednext import create_mednext_v1
import data_loader
import yaml
import argparse
import os
import numpy as np
import boto3
from dotenv import load_dotenv
from pathlib import Path
import time
import logging
from tqdm import tqdm
import json

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("inference.log")
    ]
)
logger = logging.getLogger("aws_inference")

# Load environment variables for AWS credentials
load_dotenv()

def setup_aws_clients():
    """Initialize and return AWS clients"""
    try:
        # Load credentials from environment variables
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        return {'s3': s3_client}
    except Exception as e:
        print(f"Error with explicit credentials: {e}")
        # Fall back to default credential chain
        return boto3.client('s3', region_name='us-east-1')


def download_from_s3(s3_client, bucket_name, s3_path, local_path):
    """Download a file from S3"""
    logger.info(f"Downloading {s3_path} to {local_path}")
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    try:
        s3_client.download_file(bucket_name, s3_path, local_path)
        logger.info(f"Successfully downloaded {s3_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to download {s3_path}: {str(e)}")
        return False


def upload_to_s3(s3_client, local_path, bucket_name, s3_path):
    """Upload a file to S3"""
    logger.info(f"Uploading {local_path} to s3://{bucket_name}/{s3_path}")
    try:
        s3_client.upload_file(local_path, bucket_name, s3_path)
        logger.info(f"Successfully uploaded to s3://{bucket_name}/{s3_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to upload {local_path}: {str(e)}")
        return False


def offset_spatial_crop(roi_center=None, roi_size=None):
    """
    For crop spatial regions of the data based on the specified `roi_center` and `roi_size`.
    
    get the start and end of the crop
    
    Parameters:
        roi_center (tuple of int, optional): The center point of the region of interest (ROI).
        roi_size (tuple of int, optional): The size of the ROI in each spatial dimension.
        
    Returns:
        start & end: start and end offsets
    """
    
    if roi_center is None or roi_size is None:
        raise ValueError("Both `roi_center` and `roi_size` must be specified.")
    
    roi_center = [int(round(c)) for c in roi_center]
    roi_size = [int(round(s)) for s in roi_size]
    
    start = []
    end = []
    
    for i, (center, size) in enumerate(zip(roi_center, roi_size)):
        
        half_size = size // 2 # int(round(size / 2))
        start_i = max(center - half_size, 0)  # Ensure we don't go below 0
        end_i = max(start_i + size, start_i)
        #end_i = min(center + half_size + (size % 2), ori_size[i])  
        start.append(start_i)
        end.append(end_i)

    return start, end


def cropped2ori(crop_data, ori_size, isocenter, trans_in_size):
    """
    crop_data: the cropped data
    ori_size: the original size of the data
    isocenter: the isocenter of the original data
    trans_in_size: the in_size parameter in the transfromation of loader
    """

    assert (np.array(trans_in_size) == np.array(crop_data.shape)).all()

    start_coords, end_coords = offset_spatial_crop(roi_center=isocenter, roi_size=trans_in_size)

    # remove the padding
    crop_start, crop_end = [], []
    for i in range(len(ori_size)):
        if end_coords[i] > ori_size[i]:
            diff = end_coords[i] - ori_size[i]
            crop_start.append(diff // 2)
            crop_end.append(crop_data.shape[i] - diff + diff // 2)
        else:
            crop_start.append(0)
            crop_end.append(crop_data.shape[i])

    
    crop_data = crop_data[crop_start[0]: crop_end[0], crop_start[1]: crop_end[1], crop_start[2]: crop_end[2]]

    pad_out = np.zeros(ori_size)

    pad_out[start_coords[0]: end_coords[0], start_coords[1]: end_coords[1], start_coords[2]: end_coords[2]] = crop_data 
    
    return pad_out


def monitor_gpu_usage():
    """Monitor and log GPU memory usage"""
    if torch.cuda.is_available():
        gpu_memory_allocated = torch.cuda.memory_allocated() / 1e9  # Convert to GB
        gpu_memory_reserved = torch.cuda.memory_reserved() / 1e9    # Convert to GB
        logger.info(f"GPU Memory: Allocated={gpu_memory_allocated:.2f}GB, Reserved={gpu_memory_reserved:.2f}GB")


def main():

    # Environment variables for AWS credentials
    S3_BUCKET = os.getenv('S3_BUCKET')
    S3_OUTPUT_PREFIX = os.getenv('S3_OUTPUT_PREFIX')
    S3_MODEL_KEY = os.getenv('S3_MODEL_KEY')
    if not S3_MODEL_KEY:
        print("S3_MODEL_KEY not set, using default")
        S3_MODEL_KEY = 'planning/models/best_model-epoch=356-val_loss=0.2243.ckpt'
    if not S3_BUCKET:
        raise ValueError("S3_BUCKET must be set in environment variables")

    parser = argparse.ArgumentParser(description='Medical image inference on AWS EC2')

    parser.add_argument('--config', type=str, default='./models/best_model/config.yaml', help='Path to the config file')
    parser.add_argument('--phase', default='test', type=str, help='Data phase (train/val/test)')
    parser.add_argument('--s3-bucket', type=str, default=S3_BUCKET, help='S3 bucket name')
    parser.add_argument('--s3-prefix', type=str, default=S3_OUTPUT_PREFIX, help='S3 prefix (folder) for outputs')
    # parser.add_argument('--model-key', type=str, default='model', help='S3 key for model file')
    parser.add_argument('--data-dir', type=str, default='./data/inputs', help='Local directory for data')
    parser.add_argument('--output-dir', type=str, default='./data/outputs', help='Local directory for outputs')
    # parser.add_argument('--batch-size', type=int, default=4, help='Batch size for inference')

    args = parser.parse_args()

    # Create directories
    os.makedirs(args.data_dir, exist_ok=True)
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Get AWS clients
    logging.info("Setting up AWS Clients...")
    aws = setup_aws_clients()
    print(aws['s3'])
    
    # Download config file if it's an S3 path
    if args.config.startswith('s3://'):
        bucket_name = args.config.split('/')[2]
        s3_path = '/'.join(args.config.split('/')[3:])
        local_config_path = os.path.join('configs', os.path.basename(s3_path))
        os.makedirs(os.path.dirname(local_config_path), exist_ok=True)
        download_from_s3(aws['s3'], bucket_name, s3_path, local_config_path)
        config_path = local_config_path
    else:
        config_path = args.config
        
    # Load configuration
    logger.info(f"Loading config from {config_path}")
    cfig = yaml.load(open(config_path), Loader=yaml.FullLoader)
    
    # Set device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    if torch.cuda.is_available():
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        
    # Download model from S3
    # model_local_path = os.path.join('models', os.path.basename(args.model_key))
    # os.makedirs(os.path.dirname(model_local_path), exist_ok=True)
    # download_from_s3(aws['s3'], args.s3_bucket, args.model_key, model_local_path)
    
    # # Update config to use the downloaded model
    # cfig['save_model_path'] = model_local_path
    # cfig['save_pred_path'] = args.output_dir
    
    # Load data
    logger.info("Loading data...")
    loaders = data_loader.GetLoader(cfig=cfig['loader_params'])
    test_loader = loaders.test_dataloader()
    logger.info("Data loaded")
    
    # Load model
    logger.info("Loading model...")
    if cfig['model_from_lightning']:
        logger.info('Loading model from training_lightning.py')
        from train_lightning import GDPLightningModel
        pl_module = GDPLightningModel.load_from_checkpoint(cfig['save_model_path'], cfig=cfig, strict=True)
        model = pl_module.model.to(device)
    else:
        logger.info('Loading model from training.py')
        model = create_mednext_v1(
            num_input_channels=cfig['model_params']['num_input_channels'],
            num_classes=cfig['model_params']['out_channels'],
            model_id=cfig['model_params']['model_id'],
            kernel_size=cfig['model_params']['kernel_size'],
            deep_supervision=cfig['model_params']['deep_supervision']
        ).to(device)
        # Load pretrained model
        model.load_state_dict(torch.load(cfig['save_model_path'], map_location=device))
    
    logger.info("Model loaded")
    monitor_gpu_usage()
    
    # Track metrics
    inference_metrics = {
        'total_cases': 0,
        'processed_cases': 0,
        'failed_cases': 0,
        'total_time': 0,
        'case_times': {},
        'upload_failures': 0
    }
    
    # Run inference
    start_time = time.time()
    with torch.no_grad():
        model.eval()
        logger.info("Starting inference...")
        for batch_idx, data_dict in enumerate(tqdm(test_loader, desc="Processing batches")):
            batch_start = time.time()
            logger.info(f"Processing batch {batch_idx+1}/{len(test_loader)}")
            
            # Forward pass
            try:
                outputs = model(data_dict['data'].to(device))
                
                if cfig['act_sig']:
                    outputs = torch.sigmoid(outputs.clone())
                
                outputs = outputs * cfig['scale_out']
                
                if 'label' in data_dict.keys():
                    l1_error = torch.nn.L1Loss()(outputs, data_dict['label'].to(device)).item()
                    logger.info(f"L1 error: {l1_error}")
                
                if cfig['loader_params']['in_size'] != cfig['loader_params']['out_size']:
                    outputs = torch.nn.functional.interpolate(
                        outputs, 
                        size=cfig['loader_params']['in_size'], 
                        mode='area'
                    )
                
                # Process each case in the batch
                for index in range(len(outputs)):
                    case_id = data_dict['id'][index]
                    inference_metrics['total_cases'] += 1
                    case_start = time.time()
                    
                    logger.info(f"Processing case {case_id}")
                    
                    try:
                        # Convert to original size
                        pad_out = np.zeros(data_dict['ori_img_size'][index].numpy().tolist())
                        crop_data = outputs[index][0].cpu().numpy()
                        ori_size = data_dict['ori_img_size'][index].numpy().tolist()
                        isocenter = data_dict['ori_isocenter'][index].numpy().tolist()
                        trans_in_size = cfig['loader_params']['in_size']
                        
                        pred2orisize = cropped2ori(
                            crop_data, 
                            ori_size, 
                            isocenter, 
                            trans_in_size
                        ) * cfig['loader_params']['dose_div_factor']
                        
                        # Save locally
                        output_filename = f"{case_id}_pred.npy"
                        output_path = os.path.join(args.output_dir, output_filename)
                        np.save(output_path, pred2orisize)
                        logger.info(f"Saved prediction to {output_path}")
                        
                        # Upload to S3
                        s3_output_key = f"{args.s3_prefix}/{output_filename}"
                        upload_success = upload_to_s3(aws['s3'], output_path, args.s3_bucket, s3_output_key)
                        
                        if upload_success:
                            inference_metrics['processed_cases'] += 1
                        else:
                            inference_metrics['upload_failures'] += 1
                            
                        # Track timing
                        case_time = time.time() - case_start
                        inference_metrics['case_times'][case_id] = case_time
                        logger.info(f"Case {case_id} processed in {case_time:.2f} seconds")
                        
                    except Exception as e:
                        logger.error(f"Error processing case {case_id}: {str(e)}")
                        inference_metrics['failed_cases'] += 1
                
                # Clear GPU cache after batch
                torch.cuda.empty_cache()
                monitor_gpu_usage()
                
            except Exception as e:
                logger.error(f"Error processing batch {batch_idx}: {str(e)}")
                # Try to recover and continue with next batch
                torch.cuda.empty_cache()
    
    # Calculate total time
    inference_metrics['total_time'] = time.time() - start_time
    logger.info(f"Inference completed in {inference_metrics['total_time']:.2f} seconds")
    logger.info(f"Processed {inference_metrics['processed_cases']}/{inference_metrics['total_cases']} cases")
    
    # Save metrics
    metrics_path = os.path.join(args.output_dir, "inference_metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump(inference_metrics, f, indent=2)
    
    # Upload metrics to S3
    upload_to_s3(aws['s3'], metrics_path, args.s3_bucket, f"{args.s3_prefix}/metrics/inference_metrics.json")
    
    logger.info("Inference process completed")


if __name__ == "__main__":
    main()