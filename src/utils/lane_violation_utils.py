import cv2
import numpy as np

class LaneViolationDetector:
    def __init__(self, lanes=None):
        """
        lanes: List of polygons [(x1,y1), (x2,y2), ...] representing allowed lanes
        """
        self.lanes = lanes if lanes else []
        self.violation_active = {}

    def detect_lane_violation(self, results):
        violations = []
        # COCO classes: 2=car, 3=motorcycle, 5=bus, 7=truck
        vehicle_classes = [2, 3, 5, 7]
        
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None
        
        for i, (box, cls) in enumerate(zip(results.boxes.xyxy, results.boxes.cls)):
            if int(cls) in vehicle_classes:
                vehicle_id = f"id_{track_ids[i]}" if track_ids is not None else f"veh_{i}"
                center = (int((box[0] + box[2])/2), int((box[1] + box[3])/2))
                
                # Simple logic: if lanes are defined, check if vehicle is inside any lane
                # For now, we'll implement a placeholder check that could be extended
                # In a real scenario, this would check against lane boundaries or direction
                
                is_in_lane = True
                if self.lanes:
                    is_in_lane = False
                    h, w = results.orig_shape
                    for lane_poly in self.lanes:
                        # Assume lanes might be normalized (0-1). If max value > 1, assume pixels.
                        poly_array = np.array(lane_poly, np.float32)
                        if poly_array.max() <= 1.0:
                            # Scale normalized to pixels
                            scaled_poly = poly_array * [w, h]
                        else:
                            scaled_poly = poly_array
                            
                        if cv2.pointPolygonTest(scaled_poly.astype(np.int32), center, False) >= 0:
                            is_in_lane = True
                            break
                
                if not is_in_lane:
                    if not self.violation_active.get(vehicle_id, False):
                        self.violation_active[vehicle_id] = True
                        violations.append({
                            'type': 'lane_violation',
                            'status': 'VIOLATION_START',
                            'id': vehicle_id,
                            'bbox': box,
                            'details': "Vehicle outside designated lanes"
                        })
                else:
                    if self.violation_active.get(vehicle_id, False):
                        self.violation_active[vehicle_id] = False
                        violations.append({
                            'type': 'lane_violation',
                            'status': 'VIOLATION_END',
                            'id': vehicle_id,
                            'bbox': box,
                            'details': "Vehicle returned to lane"
                        })
                        
        return violations

    def flush_active_violations(self):
        flush_events = []
        for vid, active in self.violation_active.items():
            if active:
                flush_events.append({
                    'type': 'lane_violation',
                    'status': 'VIOLATION_END',
                    'id': vid,
                    'details': "Video ended during lane violation"
                })
        return flush_events
