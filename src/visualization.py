import cv2
from datetime import datetime
import os

def capture_violation_evidence(frame, violation_type, bbox, vehicle_id="unknown", output_dir="data/evidence"):
    """
    Safely capture violation evidence. 
    Wrap in try-except to never crash the detection loop.
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Scale visualization parameters based on resolution
        h, w = frame.shape[:2]
        thickness = max(1, int(w / 400))
        font_scale = w / 1200.0
        
        # Draw violation box safely
        if bbox is not None and hasattr(bbox, '__iter__') and len(bbox) >= 4:
            try:
                x1, y1, x2, y2 = map(int, bbox)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), thickness)
                
                # Ensure text is visible even if box is at the very top
                text_y = max(y1 - 10, 30)
                cv2.putText(frame, f"{violation_type} {vehicle_id}", (x1, text_y),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 255), thickness)
            except Exception as e:
                print(f"ERROR: Failed to draw bbox: {e}")
                cv2.putText(frame, f"{violation_type} {vehicle_id} (BBOX ERROR)", (10, int(70 * font_scale)),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 255), thickness)
        else:
            # Fallback labeling if no bbox
            cv2.putText(frame, f"{violation_type} {vehicle_id} (NO BBOX)", (10, int(70 * font_scale)),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 255), thickness)
            
        # Prepare evidence visualization
        cv2.putText(frame, timestamp, (10, int(30 * font_scale)), cv2.FONT_HERSHEY_SIMPLEX, 
                    font_scale, (255, 255, 255), thickness)
        
        # Encode image to buffer for Database storage
        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        image_bytes = buffer.tobytes() if ret else None
        
        # Legacy save (Re-enabled for notebook visualization)
        filename = f"evidence_{violation_type}_{vehicle_id}_{timestamp.replace(':', '-')}.jpg"
        cv2.imwrite(os.path.join(output_dir, filename), frame)
        
        return frame, timestamp, image_bytes
    except Exception as outer_e:
        print(f"CRITICAL ERROR in capture_violation_evidence: {outer_e}")
        return frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), None