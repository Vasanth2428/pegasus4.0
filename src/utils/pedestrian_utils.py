import cv2
import numpy as np

class PedestrianDetector:
    def __init__(self, roadway_roi=None):
        """
        roadway_roi: List of polygon points [(x1,y1), (x2,y2), ...] 
                     Can be normalized (0-1) or pixel coordinates.
        """
        self.roadway_roi = roadway_roi
        self.crosswalk_active = False # Global state, could be connected to traffic lights
        self.active_violations = set() # {pedestrian_id}

    def detect_jaywalking(self, results):
        if self.roadway_roi is None or self.crosswalk_active:
            return []

        anomalies = []
        h, w = results.orig_shape
        
        # Prepare ROI
        poly = np.array(self.roadway_roi, np.float32)
        if poly.max() <= 1.0:
            poly = poly * [w, h]
        poly = poly.astype(np.int32)

        boxes = results.boxes.xyxy.cpu().numpy()
        classes = results.boxes.cls.cpu().numpy()
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None

        current_violations = set()

        for i in range(len(boxes)):
            if int(classes[i]) == 0: # Person
                x1, y1, x2, y2 = boxes[i]
                # Check bottom center of person box against roadway ROI
                bottom_center = ((x1 + x2) / 2, y2)
                
                if cv2.pointPolygonTest(poly, bottom_center, False) >= 0:
                    vid = f"id_{track_ids[i]}" if track_ids else f"p_{i}"
                    current_violations.add(vid)
                    
                    if vid not in self.active_violations:
                        self.active_violations.add(vid)
                        anomalies.append({
                            'type': 'jaywalking',
                            'status': 'VIOLATION_START',
                            'id': vid,
                            'bbox': boxes[i],
                            'details': "Pedestrian detected in active roadway outside crosswalk"
                        })
        
        # Check for ended violations
        ended = self.active_violations - current_violations
        for vid in list(ended):
            anomalies.append({
                'type': 'jaywalking',
                'status': 'VIOLATION_END',
                'id': vid,
                'details': "Pedestrian cleared roadway or tracking lost"
            })
            self.active_violations.remove(vid)
        
        return anomalies
