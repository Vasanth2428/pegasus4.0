import math

class SpeedEstimator:
    def __init__(self, fps=30, ppm=25, reference_width=1280): # FIXED: ppm increased from 10 to 25
        self.fps = fps
        self.ppm = ppm
        self.reference_width = reference_width
        self.previous_positions = {} # {id: last_pos}
        self.speeds = {} # {id: current_speed}
        self.speed_history = {} # {id: [speed_history]}

    def estimate_speed(self, results):
        h, w = results.orig_shape
        # Scale ppm based on resolution relative to reference_width
        scale_factor = w / self.reference_width
        actual_ppm = self.ppm * scale_factor
        
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None
        current_speeds = []
        
        if track_ids is None:
            return []

        for i, (box, cls) in enumerate(zip(results.boxes.xyxy, results.boxes.cls)):
            vehicle_id = f"id_{track_ids[i]}"
            center = ((box[0] + box[2])/2, (box[1] + box[3])/2)
            
            if vehicle_id in self.previous_positions:
                prev_pos = self.previous_positions[vehicle_id]
                # Distance in pixels
                dist_px = math.sqrt((center[0] - prev_pos[0])**2 + (center[1] - prev_pos[1])**2)
                
                # CRITICAL FIX: Ignore tiny movements (tracking jitter on stationary objects)
                if dist_px < 10:  # Less than 10 pixels = stationary
                    self.speeds[vehicle_id] = 0
                    current_speeds.append({'id': vehicle_id, 'speed': 0})
                    continue
                
                # Distance in meters
                dist_m = dist_px / actual_ppm
                
                # Speed in m/s
                speed_mps = dist_m * self.fps
                
                # Speed in km/h
                speed_kmh = speed_mps * 3.6
                
                # CRITICAL FIX: Cap ridiculous speeds (prevent 300+ km/h readings)
                speed_kmh = min(speed_kmh, 150)  # Max 150 km/h is reasonable for city traffic
                
                self.speeds[vehicle_id] = speed_kmh
                
                # Maintain history (max 10 frames)
                if vehicle_id not in self.speed_history:
                    self.speed_history[vehicle_id] = []
                self.speed_history[vehicle_id].append(speed_kmh)
                if len(self.speed_history[vehicle_id]) > 10:
                    self.speed_history[vehicle_id].pop(0)

                current_speeds.append({
                    'id': vehicle_id,
                    'speed': speed_kmh
                })
            
            self.previous_positions[vehicle_id] = center
            
        # Cleanup history for lost tracks
        h_ids = list(self.speed_history.keys())
        for vid in h_ids:
            if vid not in [f"id_{tid}" for tid in track_ids]:
                del self.speed_history[vid]

        return current_speeds

    def get_speed_history(self, vehicle_id):
        return self.speed_history.get(vehicle_id, [])

    def get_vehicle_speed(self, vehicle_id):
        return self.speeds.get(vehicle_id, 0)
