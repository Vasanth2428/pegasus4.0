import cv2
import numpy as np

class TrafficHeatmap:
    def __init__(self, shape=(720, 1280)):
        self.heatmap = np.zeros(shape, dtype=np.float32)
        # HEATMAP FIX: Reduced decay from 0.99 to 0.92 for MUCH faster, more visible accumulation
        self.decay = 0.92  # Lower = faster accumulation, more responsive visible heatmap
        
    def update(self, results):
        # CRITICAL FIX: Add null safety
        if results is None or results.boxes is None or results.boxes.xyxy is None:
            return
            
        # Dynamically resize heatmap if frame resolution changed
        h, w = results.orig_shape
        if self.heatmap.shape[:2] != (h, w):
            self.heatmap = cv2.resize(self.heatmap, (w, h), interpolation=cv2.INTER_LINEAR)

        # Create a frame-specific accumulation
        frame_map = np.zeros((h, w), dtype=np.float32)
        
        vehicle_classes = [2, 3, 5, 7]
        
        # CRITICAL FIX: Check if cls exists
        if results.boxes.cls is None:
            return
            
        for box, cls in zip(results.boxes.xyxy, results.boxes.cls):
            if int(cls) in vehicle_classes:
                x1, y1, x2, y2 = map(int, box)
                # Clip coordinates to frame boundaries
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                # HEATMAP FIX: Increased heat intensity from 1 to 5 for MUCH MORE VISIBLE heatmap
                if x2 > x1 and y2 > y1:
                    frame_map[y1:y2, x1:x2] += 5  # Increased from 1 to 5!
        
        # Accumulate with the global heatmap
        self.heatmap = cv2.addWeighted(self.heatmap, self.decay, frame_map, 1.0, 0)
        
    def get_overlay(self, frame):
        # CRITICAL FIX: Validate frame
        if frame is None or frame.size == 0:
            return frame
            
        # Normalize and colorize
        norm_heatmap = cv2.normalize(self.heatmap, None, 0, 255, cv2.NORM_MINMAX, cv2.CV_8U)
        color_heatmap = cv2.applyColorMap(norm_heatmap, cv2.COLORMAP_JET)
        
        # Ensure heatmap matches frame size and channels for overlay
        if color_heatmap.shape[:2] != frame.shape[:2]:
            color_heatmap = cv2.resize(color_heatmap, (frame.shape[1], frame.shape[0]))

        # Handle grayscale frames (ensure 3 channels for color heatmap)
        if len(frame.shape) == 2:
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        elif frame.shape[2] == 1:
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

        # HEATMAP FIX: Increased blend weight from 0.3 to 0.6 for HIGHLY VISIBLE red heatmap
        # 60% heatmap overlay makes it very prominent
        overlay = cv2.addWeighted(frame, 0.4, color_heatmap, 0.6, 0)
        return overlay
