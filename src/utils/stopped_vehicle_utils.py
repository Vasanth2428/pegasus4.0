import math

class StoppedVehicleDetector:
    def __init__(self, fps=30, time_threshold=60, lane_roi=None):
        self.vehicle_positions = {}
        self.frame_count = 0
        self.fps = fps
        self.time_threshold = time_threshold
        self.frame_threshold = self.fps * self.time_threshold 
        self.lane_roi = lane_roi
        self.stalled_ids = set() # {vid} for ABD-03 specific tracking

    def detect_stopped_vehicle(self, frame, results):
        self.frame_count += 1
        current_vehicles = []
        vehicle_classes = [2, 3, 5, 7]
        h, w = results.orig_shape
        
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None
        
        moving_count = 0
        all_detected_ids = set()

        for i, (box, cls) in enumerate(zip(results.boxes.xyxy, results.boxes.cls)):
            if int(cls) in vehicle_classes:
                vid = f"id_{track_ids[i]}" if track_ids is not None else f"veh_{i}"
                all_detected_ids.add(vid)
                center = ((box[0] + box[2])/2, (box[1] + box[3])/2)
                
                current_vehicles.append({
                    'id': vid,
                    'center': center,
                    'bbox': box
                })
        
        stopped_vehicles_data = [] # Data for internal state update
        current_stopped_ids = set()
        
        for vehicle in current_vehicles:
            vid = vehicle['id']
            current_pos = vehicle['center']
            
            if vid in self.vehicle_positions:
                prev_pos = self.vehicle_positions[vid]['last_pos']
                movement = math.sqrt((current_pos[0] - prev_pos[0])**2 + (current_pos[1] - prev_pos[1])**2)
                dynamic_threshold = w * 0.005 
                
                if movement < dynamic_threshold:
                    self.vehicle_positions[vid]['stopped_frames'] += 1
                    current_stopped_ids.add(vid)
                else:
                    moving_count += 1
                    if self.vehicle_positions[vid].get('violation_active', False):
                        # Reset if it was an active individual violation
                        self.vehicle_positions[vid]['violation_active'] = False
                    self.vehicle_positions[vid]['stopped_frames'] = 0
                
                self.vehicle_positions[vid]['last_pos'] = current_pos
                self.vehicle_positions[vid]['last_bbox'] = vehicle['bbox']
            else:
                self.vehicle_positions[vid] = {'last_pos': current_pos, 'last_bbox': vehicle['bbox'], 'stopped_frames': 0}

        # --- ANOMALY LOGIC ---
        anomalies = []
        
        # 0. Stationary count for other modules (InteractionDetector)
        current_stationary_ids = current_stopped_ids

        # 1. Traffic Jam Detection (Multi-vehicle stop)
        if len(current_stopped_ids) >= 4: # Threshold for a jam
            # Check if these stopped vehicles are "new" in their stopped state
            newly_jammed = False
            for vid in current_stopped_ids:
                if self.vehicle_positions[vid]['stopped_frames'] == (self.fps * 30): # Log jam after 30s
                    newly_jammed = True
                    break
            
            if newly_jammed:
                anomalies.append({
                    'type': 'traffic_jam',
                    'status': 'VIOLATION_START',
                    'id': 'JAM_01', 
                    'bbox': [0, 0, w, h], 
                    'details': f"Traffic jam detected: {len(current_stopped_ids)} vehicles stopped."
                })

        # 2. Accident / Breakdown Detection (Isolated stop in moving traffic)
        if moving_count > 2: 
            for vid in current_stopped_ids:
                if self.vehicle_positions[vid]['stopped_frames'] > (self.fps * 30):
                    if not self.vehicle_positions[vid].get('violation_active', False):
                        self.vehicle_positions[vid]['violation_active'] = True
                        anomalies.append({
                            'type': 'potential_accident',
                            'status': 'VIOLATION_START',
                            'id': vid,
                            'bbox': self.vehicle_positions[vid]['last_bbox'],
                            'details': "Vehicle stopped while surrounding traffic is moving"
                        })

        # 3. ABD-03: Stalled Vehicle (Rule-based: 45s + Lane Intersection)
        for vid in current_stopped_ids:
            if self.vehicle_positions[vid]['stopped_frames'] >= self.frame_threshold:
                if vid not in self.stalled_ids:
                    # Check ROI intersection
                    in_lane = True
                    if self.lane_roi is not None:
                        import cv2
                        poly = np.array(self.lane_roi, np.float32)
                        if poly.max() <= 1.0: poly = poly * [w, h]
                        if cv2.pointPolygonTest(poly.astype(np.int32), self.vehicle_positions[vid]['last_pos'], False) < 0:
                            in_lane = False
                    
                    if in_lane:
                        self.stalled_ids.add(vid)
                        anomalies.append({
                            'type': 'stalled_vehicle',
                            'status': 'VIOLATION_START',
                            'id': vid,
                            'bbox': self.vehicle_positions[vid]['last_bbox'],
                            'details': f"Vehicle stalled in active lane for > {self.time_threshold} seconds"
                        })

        # Cleanup old vehicles
        to_delete = [vid for vid in self.vehicle_positions if vid not in all_detected_ids]
        for vid in to_delete:
            if self.vehicle_positions[vid].get('violation_active', False):
                anomalies.append({
                    'type': 'potential_accident',
                    'status': 'VIOLATION_END',
                    'id': vid,
                    'bbox': self.vehicle_positions[vid].get('last_bbox'),
                    'details': "Resumed motion or track lost"
                })
            if vid in self.stalled_ids:
                self.stalled_ids.remove(vid)
                anomalies.append({
                    'type': 'stalled_vehicle',
                    'status': 'VIOLATION_END',
                    'id': vid,
                    'bbox': self.vehicle_positions[vid].get('last_bbox'),
                    'details': "Stalled vehicle cleared"
                })
            del self.vehicle_positions[vid]

        return anomalies, current_stationary_ids

    def flush_active_violations(self):
        """Called when video ends to generate 'END' events for any currently active violations"""
        flush_events = []
        for vid, data in self.vehicle_positions.items():
            if data.get('violation_active', False):
                data['violation_active'] = False
                flush_events.append({
                    'type': 'stopped_vehicle',
                    'status': 'VIOLATION_END',
                    'id': vid,
                    'bbox': data.get('last_bbox'), # Need to store last bbox
                    'confidence': 'HIGH',
                    'stopped_frames': data['stopped_frames'],
                    'details': "Video ended while vehicle was still stopped"
                })
        return flush_events
