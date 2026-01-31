"""
DIRECT VIDEO PROCESSOR - Processes uploaded videos with REAL ML detection
Place this in the uploads folder and run it to see actual detection
"""
import cv2
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.detector import TrafficViolationDetector

def process_latest_video():
    """Find and process the most recent video in uploads/"""
    uploads_dir = "uploads"
    
    if not os.path.exists(uploads_dir):
        print(f"❌ ERROR: {uploads_dir} directory not found!")
        return
    
    # Find most recent video
    video_files = [f for f in os.listdir(uploads_dir) if f.endswith(('.mp4', '.avi', '.mov', '.mkv'))]
    
    if not video_files:
        print(f"❌ No videos found in {uploads_dir}/")
        print("   Upload a video first!")
        return
    
    # Get most recent
    video_files.sort(key=lambda x: os.path.getmtime(os.path.join(uploads_dir, x)), reverse=True)
    video_path = os.path.join(uploads_dir, video_files[0])
    
    print("=" * 60)
    print("🎯 PEGASUS REAL-TIME VIDEO PROCESSOR")
    print("=" * 60)
    print(f"📹 Processing: {video_path}")
    
    # Initialize detector
    print("\n[1/3] Loading ML Model...")
    detector = TrafficViolationDetector()
    print("✓ Model loaded: YOLOv8 + tracking active")
    
    # Open video
    print(f"\n[2/3] Opening video...")
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"❌ Failed to open: {video_path}")
        return
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_v = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"✓ Video: {width}x{height} @ {fps_v}fps ({total_frames} frames)")
    
    # Create output directory
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"detected_{video_files[0]}")
    
    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps_v, (width, height))
    
    print(f"\n[3/3] Processing with ML detection...")
    print(f"💾 Output will be saved to: {output_path}")
    print("-" * 60)
    
    frame_idx = 0
    violation_count = 0
    detection_count = 0
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # ACTUAL ML DETECTION
            processed_frame, events, telemetry = detector.process_frame(frame, verbose=False)
            
            # Track stats
            detection_count += telemetry.get('total_vehicles', 0)
            violation_count += len(events)
            
            # Write processed frame
            out.write(processed_frame)
            
            # Progress
            if frame_idx % 30 == 0:
                progress = (frame_idx / total_frames) * 100
                print(f"Frame {frame_idx}/{total_frames} ({progress:.1f}%) | "
                      f"Vehicles: {telemetry.get('total_vehicles', 0)} | "
                      f"Safety: {telemetry.get('safety_index', 100):.0f}% | "
                      f"Violations: {len(events)}")
            
            # Show events
            if events:
                for event in events:
                    print(f"  🚨 {event.get('type', 'unknown').upper()}: {event.get('details', 'No details')}")
            
            frame_idx += 1
            
    finally:
        cap.release()
        out.release()
    
    print("-" * 60)
    print(f"\n✅ PROCESSING COMPLETE!")
    print(f"📊 Stats:")
    print(f"   - Frames Processed: {frame_idx}")
    print(f"   - Total Detections: {detection_count}")
    print(f"   - Violations Found: {violation_count}")
    print(f"   - Output Saved: {output_path}")
    print(f"\n🎬 Play your detected video:")
    print(f"   {os.path.abspath(output_path)}")
    print("=" * 60)

if __name__ == "__main__":
    process_latest_video()
