import numpy as np

class CollisionDetector:
    def __init__(self, iou_threshold=0.4): 
        self.iou_threshold = iou_threshold
        self.active_collisions = set() # {(id1, id2)}
        self.iou_history = {} # {(id1, id2): [iou_history]}

    def _calculate_iou(self, boxA, boxB):
        # box: [x1, y1, x2, y2]
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
        boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
        boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)

        iou = interArea / float(boxAArea + boxBArea - interArea)
        return iou

    def _is_velocity_drop(self, history, drop_threshold=10.0):
        # history: [v1, v2, ... vN]
        if len(history) < 2:
            return False
            
        # Check if speed dropped significantly in the last 2-3 frames
        latest_speed = history[-1]
        prev_speeds = history[-3:-1] if len(history) >= 3 else [history[-2]]
        
        for ps in prev_speeds:
            # Significant drop (either absolute km/h or percentage)
            if (ps - latest_speed) > drop_threshold or (ps > 10 and latest_speed < (ps * 0.4)):
                return True
        return False

    def detect_collisions(self, results, speed_estimator=None):
        anomalies = []
        track_ids = results.boxes.id.int().cpu().tolist() if results.boxes.id is not None else None
        
        if track_ids is None or len(track_ids) < 2:
            return []

        boxes = results.boxes.xyxy.cpu().numpy()
        h, w = results.orig_shape
        vehicle_classes = [2, 3, 5, 7]
        classes = results.boxes.cls.cpu().numpy()

        n = len(track_ids)
        current_collisions = set()
        active_pairs = set()

        for i in range(n):
            if int(classes[i]) not in vehicle_classes:
                continue
            
            vid1 = f"id_{track_ids[i]}"
            
            for j in range(i + 1, n):
                if int(classes[j]) not in vehicle_classes:
                    continue
                
                vid2 = f"id_{track_ids[j]}"
                iou = self._calculate_iou(boxes[i], boxes[j])
                
                # Proximity check
                c1 = ((boxes[i][0] + boxes[i][2])/2, (boxes[i][1] + boxes[i][3])/2)
                c2 = ((boxes[j][0] + boxes[j][2])/2, (boxes[j][1] + boxes[j][3])/2)
                dist = np.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)
                proximity_threshold = w * 0.08 # Adjusted for better recall on smaller objects
                
                # Check for velocity drops
                drop1 = False
                drop2 = False
                if speed_estimator:
                    drop1 = self._is_velocity_drop(speed_estimator.get_speed_history(vid1))
                    drop2 = self._is_velocity_drop(speed_estimator.get_speed_history(vid2))

                # TRIGGER LOGIC REFINEMENT (Fix for Truck Stopping):
                id_pair = tuple(sorted([vid1, vid2]))
                active_pairs.add(id_pair)
                if id_pair not in self.iou_history:
                    self.iou_history[id_pair] = []
                self.iou_history[id_pair].append(iou)
                if len(self.iou_history[id_pair]) > 20: # Increased history for sharper trend
                    self.iou_history[id_pair].pop(0)

                # 1. Perspective Check (Depth filtering)
                base1 = boxes[i][3]
                base2 = boxes[j][3]
                base_diff = abs(base1 - base2)
                y_threshold = h * 0.25 # Increased for generous coverage on tilted cams
                is_same_plane = base_diff < y_threshold

                # 2. IoU Spike (Rapid increase in overlap)
                iou_trend = 0
                if len(self.iou_history[id_pair]) >= 3:
                    # Difference between current and 3 frames ago (Responsive baseline)
                    iou_trend = iou - self.iou_history[id_pair][-3]
                
                # 3. Collision Detection (HIGH SENSITIVITY MODE)
                is_clash = False
                proximity_threshold_tight = w * 0.04  # Tight threshold
                
                if is_same_plane:
                    # Option 1: Any significant overlap
                    if iou > 0.15 and iou_trend > 0.01:
                        is_clash = True
                    # Option 2: Moderate overlap with trend
                    elif iou > 0.05 and iou_trend > 0.03:
                        is_clash = True
                    # Option 3: Close proximity (NEAR MISS)
                    elif dist < proximity_threshold_tight and (drop1 or drop2):
                        is_clash = True
                    # Option 4: Super close proximity
                    elif dist < proximity_threshold_tight * 1.5 and iou > 0:
                        is_clash = True

                if is_clash:
                    current_collisions.add(id_pair)
                    
                    if id_pair not in self.active_collisions:
                        self.active_collisions.add(id_pair)
                        combined_bbox = [
                            min(boxes[i][0], boxes[j][0]),
                            min(boxes[i][1], boxes[j][1]),
                            max(boxes[i][2], boxes[j][2]),
                            max(boxes[i][3], boxes[j][3])
                        ]
                        
                        # DIAGNOSTIC: Show collision detection
                        print(f"🚨 COLLISION DETECTED: {id_pair[0]} ↔ {id_pair[1]}")
                        print(f"   → IoU: {iou:.3f} | Distance: {dist:.1f}px | IoU Trend: {iou_trend:.3f}")
                        
                        anomalies.append({
                            'type': 'collision',
                            'status': 'VIOLATION_START',
                            'id': f"{id_pair[0]}_{id_pair[1]}",
                            'bbox': combined_bbox,
                            'details': f"Proximity Breach: IoU={iou:.2f} Trend={iou_trend:.2f} Dist={dist:.0f}px"
                        })

        # Check for ended violations
        ended = self.active_collisions - current_collisions
        for col in ended:
            anomalies.append({
                'type': 'collision',
                'status': 'VIOLATION_END',
                'id': f"{col[0]}_{col[1]}",
                'details': "Vehicles cleared or tracking lost"
            })
        # Cleanup history
        lost_history = set(self.iou_history.keys()) - active_pairs
        for pair in lost_history:
            # We keep it for a few frames in case of fragmentation, but here we just prune
            del self.iou_history[pair]

        return anomalies
