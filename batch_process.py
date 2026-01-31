"""
BATCH VIDEO PROCESSOR - Process all videos in a directory
Processes multiple videos with ML detection automatically
"""
import cv2
import sys
import os
from pathlib import Path
import time

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.detector import TrafficViolationDetector

def batch_process_videos(input_dir="videos", output_dir="output"):
    """Process all videos in a directory"""
    
    print("=" * 70)
    print("🎬 PEGASUS BATCH VIDEO PROCESSOR")
    print("=" * 70)
    
    # Find all videos
    if not os.path.exists(input_dir):
        print(f"❌ Directory not found: {input_dir}")
        return
    
    video_extensions = ('.mp4', '.avi', '.mov', '.mkv', '.MP4', '.AVI', '.MOV')
    video_files = [f for f in os.listdir(input_dir) if f.endswith(video_extensions)]
    
    if not video_files:
        print(f"❌ No videos found in {input_dir}/")
        return
    
    print(f"\n📹 Found {len(video_files)} video(s) to process:")
    for idx, video in enumerate(video_files, 1):
        print(f"  {idx}. {video}")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Initialize detector once (reuse for all videos)
    print(f"\n🔧 Initializing ML detector...")
    detector = TrafficViolationDetector()
    print("✓ Detector loaded: YOLOv8 + tracking ready")
    
    # Process each video
    results_summary = []
    
    for idx, video_file in enumerate(video_files, 1):
        video_path = os.path.join(input_dir, video_file)
        output_path = os.path.join(output_dir, f"detected_{video_file}")
        
        print("\n" + "=" * 70)
        print(f"📹 PROCESSING VIDEO {idx}/{len(video_files)}: {video_file}")
        print("=" * 70)
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"❌ Failed to open: {video_path}")
            results_summary.append({
                'file': video_file,
                'status': 'FAILED',
                'error': 'Could not open video'
            })
            continue
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps_v = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"✓ Resolution: {width}x{height} @ {fps_v:.1f}fps ({total_frames} frames)")
        
        # Video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps_v, (width, height))
        
        # Stats
        frame_idx = 0
        violation_count = 0
        detection_count = 0
        start_time = time.time()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process with ML
                processed_frame, events, telemetry = detector.process_frame(frame, verbose=False)
                
                # Track stats
                detection_count += telemetry.get('total_vehicles', 0)
                violation_count += len(events)
                
                # Write frame
                out.write(processed_frame)
                
                # Progress
                if frame_idx % 30 == 0 or frame_idx == total_frames - 1:
                    progress = (frame_idx / total_frames) * 100
                    elapsed = time.time() - start_time
                    fps_actual = frame_idx / elapsed if elapsed > 0 else 0
                    
                    print(f"  Frame {frame_idx}/{total_frames} ({progress:.1f}%) | "
                          f"FPS: {fps_actual:.1f} | Vehicles: {telemetry.get('total_vehicles', 0)} | "
                          f"Violations: {len(events)}", end='\r')
                
                frame_idx += 1
                
        finally:
            cap.release()
            out.release()
        
        elapsed_total = time.time() - start_time
        
        print(f"\n✓ Complete! Processed {frame_idx} frames in {elapsed_total:.1f}s")
        print(f"  → Output: {output_path}")
        print(f"  → Detections: {detection_count}")
        print(f"  → Violations: {violation_count}")
        
        results_summary.append({
            'file': video_file,
            'status': 'SUCCESS',
            'frames': frame_idx,
            'detections': detection_count,
            'violations': violation_count,
            'time': elapsed_total,
            'output': output_path
        })
    
    # Final summary
    print("\n" + "=" * 70)
    print("📊 BATCH PROCESSING COMPLETE")
    print("=" * 70)
    
    success_count = sum(1 for r in results_summary if r['status'] == 'SUCCESS')
    failed_count = len(results_summary) - success_count
    
    print(f"\n✅ Successfully processed: {success_count}/{len(video_files)}")
    if failed_count > 0:
        print(f"❌ Failed: {failed_count}")
    
    print(f"\n📁 Output directory: {output_dir}/")
    
    print(f"\n📋 Results:")
    for result in results_summary:
        if result['status'] == 'SUCCESS':
            print(f"  ✓ {result['file']}")
            print(f"    - Frames: {result['frames']}")
            print(f"    - Detections: {result['detections']}")
            print(f"    - Violations: {result['violations']}")
            print(f"    - Time: {result['time']:.1f}s")
        else:
            print(f"  ✗ {result['file']} - {result.get('error', 'Unknown error')}")
    
    print("\n" + "=" * 70)
    print("🎉 All videos processed!")
    print("=" * 70)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Batch process videos")
    parser.add_argument('--input', default='videos', help='Input directory')
    parser.add_argument('--output', default='output', help='Output directory')
    args = parser.parse_args()
    
    batch_process_videos(args.input, args.output)
