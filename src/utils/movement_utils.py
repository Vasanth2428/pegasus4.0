import numpy as np

class MovementDetector:
    def __init__(self, expected_flow_direction=None):
        """
        expected_flow_direction: normalized vector (dx, dy) e.g., (0, 1) for downward flow
        """
        self.expected_flow_direction = expected_flow_direction
        self.history = {} # {id: [centroids]}
        self.active_violations = set() # {vehicle_id}

    def detect_wrong_way(self, results):
        if self.expected_flow_direction is None:
            return []

        anomalies = []
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None
        
        if track_ids is None:
            return []

        boxes = results.boxes.xyxy.cpu().numpy()
        vehicle_classes = [2, 3, 5, 7]
        classes = results.boxes.cls.cpu().numpy()

        current_possible_violations = set()

        for i, tid in enumerate(track_ids):
            if int(classes[i]) not in vehicle_classes:
                continue

            vid = f"id_{tid}"
            center = ((boxes[i][0] + boxes[i][2])/2, (boxes[i][1] + boxes[i][3])/2)
            
            if vid not in self.history:
                self.history[vid] = []
            self.history[vid].append(center)
            
            if len(self.history[vid]) > 30:
                self.history[vid].pop(0)

            # Need at least 15 frames for robust direction (ABD-02)
            if len(self.history[vid]) >= 15:
                # Calculate movement across windows
                start = self.history[vid][0]
                mid = self.history[vid][len(self.history[vid])//2]
                end = self.history[vid][-1]
                
                # Full vector
                move_vec = (end[0] - start[0], end[1] - start[1])
                mag = np.sqrt(move_vec[0]**2 + move_vec[1]**2)
                
                # Recent vector (to ensure it hasn't just turned)
                recent_vec = (end[0] - mid[0], end[1] - mid[1])
                recent_mag = np.sqrt(recent_vec[0]**2 + recent_vec[1]**2)
                
                if mag > 30 and recent_mag > 10: 
                    unit_move = (move_vec[0]/mag, move_vec[1]/mag)
                    unit_recent = (recent_vec[0]/recent_mag, recent_vec[1]/recent_mag)
                    
                    # Dot product against expected flow
                    dot = unit_move[0]*self.expected_flow_direction[0] + \
                          unit_move[1]*self.expected_flow_direction[1]
                    
                    # Consistent direction check (move vs recent move)
                    consistency = unit_move[0]*unit_recent[0] + unit_move[1]*unit_recent[1]
                          
                    if dot < -0.75 and consistency > 0.8: # Stricter flow check + path consistency
                        current_possible_violations.add(vid)
                        
                        if vid not in self.active_violations:
                            self.active_violations.add(vid)
                            anomalies.append({
                                'type': 'wrong_way',
                                'status': 'VIOLATION_START',
                                'id': vid,
                                'bbox': boxes[i],
                                'details': f"Vehicle moving against traffic flow (Direction alignment: {dot:.2f})"
                            })
        
        # Check for ended violations
        # A violation ends if the vehicle is no longer in current_possible_violations 
        # but was in active_violations.
        ended = self.active_violations - current_possible_violations
        for vid in list(ended):
            # Only remove if they are also gone from tracking or changed direction
            # If still tracked but dot > -0.7, violation ended.
            anomalies.append({
                'type': 'wrong_way',
                'status': 'VIOLATION_END',
                'id': vid,
                'details': "Vehicle corrected direction or tracking lost"
            })
            self.active_violations.remove(vid)
        
        # Cleanup history
        lost = set(self.history.keys()) - set([f"id_{tid}" for tid in track_ids])
        for vid in lost:
            del self.history[vid]

        return anomalies
