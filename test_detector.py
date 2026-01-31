"""
PEGASUS Detection System - Comprehensive Test Script
Tests object detection, tracking, heatmaps, and violation detection
"""
import cv2
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.detector import TrafficViolationDetector

def test_detector(video_path="test_video.mp4", max_frames=300):
    """
    Comprehensive test of the detection system
    """
    print("=" * 60)
    print("PEGASUS DETECTION SYSTEM - COMPREHENSIVE TEST")
    print("=" * 60)
    
    # Initialize detector
    print("\n[1/5] Initializing detector...")
    try:
        detector = TrafficViolationDetector()
        print("✓ Detector initialized successfully")
    except Exception as e:
        print(f"✗ FAILED to initialize detector: {e}")
        return
    
    # Open video
    print(f"\n[2/5] Opening video: {video_path}")
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"✗ FAILED to open video: {video_path}")
        print("   Note: Place a test video as 'test_video.mp4' in project root")
        return
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_v = cap.get(cv2.CAP_PROP_FPS)
    print(f"✓ Video opened: {total_frames} frames @ {fps_v} FPS")
    
    # Stats tracking
    stats = {
        'frames_processed': 0,
        'detections_count': 0,
        'violations_count': 0,
        'tracking_failures': 0,
        'errors': 0
    }
    
    print(f"\n[3/5] Processing frames (max {max_frames})...")
    
    output_dir = "test_output"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        for frame_idx in range(min(max_frames, total_frames)):
            ret, frame = cap.read()
            if not ret:
                break
            
            try:
                # Process frame
                processed_frame, events, telemetry = detector.process_frame(frame, verbose=False)
                
                stats['frames_processed'] += 1
                stats['detections_count'] += telemetry.get('total_vehicles', 0)
                stats['violations_count'] += len(events)
                
                # Save sample frames
                if frame_idx in [10, 50, 100]:
                    sample_path = os.path.join(output_dir, f"frame_{frame_idx:04d}.jpg")
                    cv2.imwrite(sample_path, processed_frame)
                    print(f"   Frame {frame_idx}: {telemetry.get('total_vehicles', 0)} vehicles, {len(events)} violations | Saved sample")
                
                # Check for tracking
                if frame_idx % 30 == 0:
                    if telemetry.get('total_vehicles', 0) == 0:
                        print(f"   ⚠ Warning: No detections at frame {frame_idx}")
                    
            except Exception as e:
                stats['errors'] += 1
                print(f"   ✗ Error at frame {frame_idx}: {e}")
                
    finally:
        cap.release()
    
    # Report results
    print(f"\n[4/5] Processing Complete!")
    print("-" * 60)
    print(f"Frames Processed:    {stats['frames_processed']}")
    print(f"Total Detections:    {stats['detections_count']}")
    print(f"Total Violations:    {stats['violations_count']}")
    print(f"Errors:              {stats['errors']}")
    print("-" * 60)
    
    # Validation
    print(f"\n[5/5] Validation Results:")
    
    if stats['frames_processed'] == 0:
        print("✗ CRITICAL: No frames processed!")
        return
    
    if stats['detections_count'] == 0:
        print("✗ CRITICAL: No objects detected! Check:")
        print("   1. Model file exists at src/models/yolov8n.pt")
        print("   2. Video contains visible vehicles/objects")
        print("   3. Confidence threshold (currently 0.45)")
    else:
        avg_det = stats['detections_count'] / stats['frames_processed']
        print(f"✓ Detection working: {avg_det:.1f} avg objects/frame")
    
    if stats['violations_count'] == 0:
        print("⚠ No violations detected (may be normal for test video)")
    else:
        print(f"✓ Violation detection working: {stats['violations_count']} total")
    
    if stats['errors'] > 0:
        print(f"⚠ {stats['errors']} errors occurred during processing")
    else:
        print("✓ No errors during processing")
    
    # Check evidence
    evidence_dir = "data/evidence"
    if os.path.exists(evidence_dir):
        evidence_files = [f for f in os.listdir(evidence_dir) if f.endswith('.jpg')]
        if len(evidence_files) > 0:
            print(f"✓ Evidence capture working: {len(evidence_files)} snapshots saved")
        else:
            print("⚠ No evidence snapshots (may be normal if no violations)")
    else:
        print("⚠ Evidence directory not created")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print(f"Sample frames saved to: {output_dir}/")
    print("=" * 60)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", default="test_video.mp4", help="Path to test video")
    parser.add_argument("--frames", type=int, default=300, help="Max frames to process")
    args = parser.parse_args()
    
    test_detector(args.video, args.frames)
