import numpy as np

class InteractionDetector:
    def __init__(self, restricted_lane_roi=None, fps=30):
        self.restricted_lane_roi = restricted_lane_roi
        self.fps = fps
        self.persistence_threshold = int(1.5 * fps) # 1.5 seconds to confirm
        self.grace_period = 10 # frames
        
        self.active_violations = set() # {(vehicle_id, person_id)}
        self.potential_violations = {} # {(v_id, p_id): start_frame}
        self.lost_track_counters = {} # {(v_id, p_id): frames_since_lost}
        self.frame_count = 0

    def detect_illegal_boarding(self, results, stationary_vehicle_ids):
        """
        stationary_vehicle_ids: Set of vehicle IDs that are currently stopped.
        """
        anomalies = []
        h, w = results.orig_shape
        
        boxes = results.boxes.xyxy.cpu().numpy()
        classes = results.boxes.cls.cpu().numpy()
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None

        if track_ids is None:
            return []

        persons = []
        vehicles = []

        for i in range(len(boxes)):
            cls = int(classes[i])
            if track_ids[i] is None: continue
            vid = f"id_{track_ids[i]}"
            
            if cls == 0: # Person
                persons.append({'id': vid, 'bbox': boxes[i]})
            elif cls in [2, 3, 5, 7] and vid in stationary_vehicle_ids: # Stationary vehicle
                vehicles.append({'id': vid, 'bbox': boxes[i]})

        self.frame_count += 1
        current_interactions = set()

        for p in persons:
            px1, py1, px2, py2 = p['bbox']
            p_center = ((px1 + px2)/2, (py1 + py2)/2)
            
            for v in vehicles:
                vx1, vy1, vx2, vy2 = v['bbox']
                
                # Check distance between bboxes (proximity < 50 pixels)
                dx = max(0, max(px1, vx1) - min(px2, vx2))
                dy = max(0, max(py1, vy1) - min(py2, vy2))
                dist = np.sqrt(dx**2 + dy**2)
                
                if dist < 60: # Slightly increased for robustness
                    # Optional: Lane ROI check
                    in_roi = True
                    if self.restricted_lane_roi is not None:
                        import cv2 
                        poly = np.array(self.restricted_lane_roi, np.float32)
                        if poly.max() <= 1.0: poly = poly * [w, h]
                        if cv2.pointPolygonTest(poly.astype(np.int32), p_center, False) < 0:
                            in_roi = False
                    
                    if in_roi:
                        interaction_id = (v['id'], p['id'])
                        current_interactions.add(interaction_id)
                        
                        # 1. Start tracking if new
                        if interaction_id not in self.potential_violations and interaction_id not in self.active_violations:
                            self.potential_violations[interaction_id] = self.frame_count
                        
                        # 2. Reset lost counter if it was dying
                        if interaction_id in self.lost_track_counters:
                            del self.lost_track_counters[interaction_id]

        # 3. Handle Promotions (Potential -> Active)
        for interaction_id, start_frame in list(self.potential_violations.items()):
            if interaction_id in current_interactions:
                if self.frame_count - start_frame >= self.persistence_threshold:
                    self.active_violations.add(interaction_id)
                    del self.potential_violations[interaction_id]
                    anomalies.append({
                        'type': 'illegal_boarding',
                        'status': 'VIOLATION_START',
                        'id': f"{interaction_id[0]}_{interaction_id[1]}",
                        'bbox': None, # Could find box again but None is handled by fallback
                        'details': f"Verified curbside interaction (>{self.persistence_threshold} frames)"
                    })
            else:
                # Dropped from detection before it became active
                del self.potential_violations[interaction_id]

        # 4. Handle Tracking Loss with Grace Period
        for interaction_id in list(self.active_violations):
            if interaction_id not in current_interactions:
                if interaction_id not in self.lost_track_counters:
                    self.lost_track_counters[interaction_id] = self.frame_count
                
                # Check if grace period expired
                if self.frame_count - self.lost_track_counters[interaction_id] > self.grace_period:
                    anomalies.append({
                        'type': 'illegal_boarding',
                        'status': 'VIOLATION_END',
                        'id': f"{interaction_id[0]}_{interaction_id[1]}",
                        'details': "Interaction concluded (grace period expired)"
                    })
                    self.active_violations.remove(interaction_id)
                    del self.lost_track_counters[interaction_id]
            else:
                # It's back! Reset counter
                if interaction_id in self.lost_track_counters:
                    del self.lost_track_counters[interaction_id]

        return anomalies
