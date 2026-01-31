class VehicleCounter:
    def __init__(self, line_y_fraction=0.6):
        self.line_y_fraction = line_y_fraction
        self.count = 0
        self.tracked_vehicles = {} # {id: last_y}

    def update_count(self, results):
        h, w = results.orig_shape
        actual_line_y = h * self.line_y_fraction
        
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None
        
        if track_ids is None:
            return self.count

        for i, (box, cls) in enumerate(zip(results.boxes.xyxy, results.boxes.cls)):
            vehicle_id = f"id_{track_ids[i]}"
            center_y = (box[1] + box[3]) / 2
            
            if vehicle_id in self.tracked_vehicles:
                prev_y = self.tracked_vehicles[vehicle_id]
                
                # If vehicle crosses the line (simple downward crossing)
                if prev_y < actual_line_y <= center_y:
                    self.count += 1
                
            self.tracked_vehicles[vehicle_id] = center_y
            
        return self.count

    def get_count(self):
        return self.count
