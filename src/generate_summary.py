import cv2
import sys
import os
try:
    from tqdm import tqdm
except ImportError:
    tqdm = None

# Ensure project root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.detector import TrafficViolationDetector

def generate_summary(input_video, output_video):
    # Initialize detector
    detector = TrafficViolationDetector()

    if not os.path.exists(input_video):
        print(f"Error: {input_video} not found!")
        return

    cap = cv2.VideoCapture(input_video)
    
    # Video Writer Setup
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))
    
    print(f"Processing {input_video} to extract violations...")
    print(f"Total Frames: {total_frames}")
    
    violation_frames_count = 0
    
    # Progress bar
    try:
        pbar = tqdm(total=total_frames)
    except:
        pbar = None
        print("tqdm not found, progress bar disabled")
    
    active_violations = set()
    
    last_frame = None
    
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            last_frame = frame.copy()
            # Clear log before processing to get only new events for this frame
            detector.violation_log = []
            
            result_frame, _, _ = detector.process_frame(frame, verbose=False)
            
            # Check for new events in the log
            for event in detector.violation_log:
                vid = event.get('vehicle_id')
                status = event.get('status')
                
                if status == 'START':
                    active_violations.add(vid)
                elif status == 'END':
                    if vid in active_violations:
                        active_violations.remove(vid)
            
            # Only write frame if there are active violations
            if len(active_violations) > 0:
                out.write(result_frame)
                violation_frames_count += 1
                
            if pbar:
                pbar.update(1)
            elif cap.get(cv2.CAP_PROP_POS_FRAMES) % 100 == 0:
                print(f"Processed {int(cap.get(cv2.CAP_PROP_POS_FRAMES))}/{total_frames} frames... Found {violation_frames_count} violation frames. Active violations: {len(active_violations)}")
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Finalizing...")
    except Exception as e:
        print(f"\nError processing video: {e}")
    finally:
        # One last check for active violations when video ends
        if last_frame is not None:
            detector.finalize(last_frame)
            
        cap.release()
        out.release()
        if pbar:
            pbar.close()
    
    print(f"\nProcessing Complete!")
    print(f"Captured {violation_frames_count} frames with active violations.")
    print(f"Summary video saved to: {output_video}")
    print(f"Evidence images saved in: data/evidence/")

if __name__ == "__main__":
    # Adjust paths relative to project root
    input_video_path = 'data/test_video.mp4'
    output_video_path = 'data/violation_summary.mp4'
    
    generate_summary(input_video_path, output_video_path)
