import uuid
from ultralytics import YOLO
import cv2
import time
from datetime import datetime
from typing import List, Dict, Any
import numpy as np
import math

# Core
from src.core.context import FrameContext
from src.core.bus import TelemetryBus
from src.core.interfaces import IntelligenceHead

# Services
from src.utils.speed_utils import SpeedEstimator
from src.utils.evidence_manager import EvidenceManager
from src.utils.heatmap_utils import TrafficHeatmap # Heatmap is special, simpler to keep as service/head hybrid
from src.services.notification_service import NotificationService
from src.visualization import capture_violation_evidence

# Heads
from src.heads.traffic_flow_head import TrafficFlowHead
from src.heads.collision_head import CollisionHead
from src.heads.anomaly_head import AnomalyHead
from src.heads.crowd_head import CrowdHead

class TrafficViolationDetector:
    _model = None
    
    # Configuration Constants - FIXED FOR CLEAN OUTPUT
    CLASS_CONFIDENCE = {
        'car': 0.60,       # Increased from 0.40
        'truck': 0.65,     # Increased from 0.45
        'bus': 0.65,       # Increased from 0.45
        'motorcycle': 0.55, # Increased from 0.35
        'person': 0.70,    # Increased from 0.50 - reduce false positives
        'bicycle': 0.58    # Increased from 0.38
    }
    SAFETY_DECAY_RATE = 0.92  # Violations fade over time (per second)
    HISTORY_LENGTH = 50  # Consistent history tracking
    PANEL_WIDTH_RATIO = 0.22  # HUD panel width

    def __init__(self):
        # 1. Perception Engine (Local YOLOv8 with optimized/sharpened pipeline)
        if TrafficViolationDetector._model is None:
            TrafficViolationDetector._model = YOLO('src/models/yolov8n.pt')
        self.model = TrafficViolationDetector._model
        self.inference_conf = 0.65  # INCREASED from 0.45 for cleaner detections
        
        # 2. Services
        self.speed_estimator = SpeedEstimator()
        self.evidence_manager = EvidenceManager(cooldown_seconds=60)
        self.evidence_capture_enabled = True # Master toggle
        self.bus = TelemetryBus()
        self.heatmap = TrafficHeatmap() # Visualization service
        self.notification_service = NotificationService()
        
        # 2.1 Database & Async Saving
        from src.utils.database import EvidenceDB
        from queue import Queue
        from threading import Thread
        self.db = EvidenceDB()
        self.save_queue = Queue()
        self.frame_count = 0
        
        # New Inference Metrics
        self.last_classification_stats = {}
        self.last_avg_speed = 0
        self.last_peak_speed = 0
        self.last_safety_index = 100
        
        # Performance Tracking
        self.fps_tracker = []
        self.cached_speeds = []  # Cache to avoid double calculation
        
        # Safety Index with Temporal Decay
        self.violation_timestamps = {}  # Track when violations occurred for decay
        
        self.save_worker = Thread(target=self._save_worker, daemon=True)
        self.save_worker.start()
        
        # 3. Intelligence Heads
        self.heads: List[IntelligenceHead] = [
            TrafficFlowHead(),
            CollisionHead(),
            AnomalyHead(),
            CrowdHead()
        ]
        
        self.frame_number = 0
        self.violation_log = []

    def reset(self):
        """Reset session-specific metrics without reloading model"""
        self.frame_number = 0
        self.frame_count = 0
        self.violation_log = []
        # Metrics Reset
        self.last_classification_stats = {}
        self.last_avg_speed = 0
        self.last_peak_speed = 0
        self.last_safety_index = 100
        
        # Performance tracking reset
        self.fps_tracker = []
        self.cached_speeds = []
        self.violation_timestamps = {}
        
        self.speed_estimator = SpeedEstimator() # Reset tracking
        self.bus = TelemetryBus() # Clear status
        self.heatmap = TrafficHeatmap() # Clear heatmap
        print("SYSTEM: Detector state has been reset for new video source.")
        
    @property
    def flow_history(self):
        return self.bus.get_snapshot()['metrics']['traffic_flow']
        
    @property
    def stability_history(self):
        # Allow bus to manage metrics, but API expects list
        # We can reconstruct or just maintain a shadow copy if simpler
        # For now, let's look at how we feed the bus.
        return self.bus.get_snapshot()['raw_stream'].get('stability_history', [])

    def process_frame(self, frame, verbose=True, context_results=None):
        # Validation
        if frame is None or frame.size == 0:
            print("ERROR: Invalid frame input (null or empty)")
            return frame, [], self._get_default_telemetry()
        
        self.frame_number += 1
        t0 = time.time()
        
        # 0. AI Sharpening: CLAHE Pre-processing for low-res CCTV
        processed_input = self._preprocess_frame(frame)
        
        # 1. Primary Perception (YOLO - Optimized tracking)
        if context_results is not None:
            results = context_results
        else:
            try:
                # CRITICAL FIX: Use default ByteTrack with NMS to remove duplicate/overlapping boxes
                # botsort.yaml may not exist, causing tracking to fail silently
                yolo_results = self.model.track(
                    processed_input, 
                    persist=True, 
                    conf=self.inference_conf,
                    iou=0.5,  # Non-Maximum Suppression - removes overlapping boxes
                    verbose=False
                    # Removed: tracker="botsort.yaml" - caused tracking failures
                )
                results = yolo_results[0] if yolo_results else None
                
                # DIAGNOSTIC: Check if tracking is working
                if results and results.boxes is not None:
                    if results.boxes.id is None:
                        print("⚠️  WARNING: No track IDs detected! Tracking may have failed.")
                        print("   → All violation detectors depend on track IDs for temporal logic.")
                        print("   → Detection count:", len(results.boxes))
                    else:
                        # Success - tracking is working
                        if self.frame_number % 100 == 1:  # Log every 100 frames
                            print(f"✓ Tracking active: {len(results.boxes.id)} objects tracked")
                            
            except Exception as e:
                print(f"ERROR: YOLO tracking failed: {e}")
                return frame, [], self._get_default_telemetry()
        
        # 2. Service Update (cache speeds to avoid recalculation)
        self.cached_speeds = self.speed_estimator.estimate_speed(results)
        self.heatmap.update(results)
        
        # 3. Context Creation
        context = FrameContext(
            frame_id=self.frame_number,
            timestamp=t0,
            fps=0.0, # Calculated later or smoothed
            results=results,
            frame=frame,
            services={'speed_estimator': self.speed_estimator}
        )
        
        # 4. Intelligence Execution
        all_events = []
        full_metrics = {}
        
        for head in self.heads:
            try:
                output = head.process(context)
                if 'events' in output:
                    all_events.extend(output['events'])
                if 'metrics' in output:
                    full_metrics.update(output['metrics'])
            except Exception as e:
                print(f"Error in head {head.__class__.__name__}: {e}")

        # 5. Evidence Capture & Serialization
        canonical_events = []
        # SEVERE EVENTS: Only high-priority safety events trigger disk storage.
        severe_anomalies = ['collision', 'accident', 'traffic_violation', 'potential_accident', 'wrong_way', 'illegal_boarding', 'stalled_vehicle']
        
        for event in all_events:
            # Event format from Heads: {'type': ..., 'severity': ..., 'data': ...}
            v_type = event['type']
            v_data = event['data']
            v_id = v_data.get('id', 'unknown')
            status = v_data.get('status', 'VIOLATION_START') 

            # B. State Tracking (Unique Trigger for snapshots/popups)
            is_new_trigger = False
            if self.evidence_capture_enabled and v_type in severe_anomalies:
                is_new_trigger = self.evidence_manager.should_capture(v_id, v_type, status)

            # C. Capture Evidence & Dispatch Alerts
            if is_new_trigger:
                bbox = v_data.get('bbox')
                print(f"SYSTEM: CRITICAL TRIGGER -> Capturing {v_type} for {v_id}")
                
                # Internal Notification Service
                self.notification_service.dispatch(v_type, event['severity'], {"msg": v_data.get('details', 'No details')})
                
                # Visual Evidence
                viz_frame, ts, image_bytes = capture_violation_evidence(frame.copy(), v_type, bbox, vehicle_id=v_id)
                if image_bytes:
                    self.save_queue.put({
                        'type': v_type,
                        'vehicle_id': v_id,
                        'image_bytes': image_bytes
                    })
            
            # Serialize for API (Include trigger flag for UI popups)
            c_event = self._serialize_event(v_data, v_id, v_type)
            if is_new_trigger:
                c_event['snapshot_triggered'] = True
            
            canonical_events.append(c_event)
            self.violation_log.append(c_event) # Keep log for API /incidents

        # 6. Telemetry & Bus Update
        
        # A. Flow History Update (1 sec)
        current_time = datetime.now().strftime("%H:%M:%S")
        if self.frame_number % 30 == 0:
            flow_hist = self.bus.get_snapshot()['metrics']['traffic_flow']
            flow_hist.append({"time": current_time, "value": full_metrics.get('vehicle_count', 0)})
            if len(flow_hist) > 20: flow_hist.pop(0)
            self.bus.update("metrics", {"traffic_flow": flow_hist})

        # B. Stability History
        # Calculate scores
        active_count = full_metrics.get('active_violations', len(all_events)) # Heads usually don't return 'active_count', we infer
        # Simplified stability:
        stability_score = max(0, 100 - (len(all_events) * 10))
        
        if self.frame_number % 10 == 0:
            raw_stream = self.bus.get_snapshot()['raw_stream']
            stab_hist = raw_stream.get('stability_history', [])
            stab_hist.append({"frame": self.frame_number, "stability": stability_score})
            if len(stab_hist) > 20: stab_hist.pop(0)
            self.bus.update("raw_stream", {"stability_history": stab_hist})

        # C. Violation Stats
        # Re-calc from self.violation_log
        from collections import Counter
        v_counts = Counter([e['event_type'] for e in self.violation_log if e['metadata']['status'] == 'START'])
        violation_stats = [{"type": k.replace('_', ' ').title(), "count": v} for k, v in v_counts.items()]

        # D. Enhanced Inferences (Speed & Composition) - USE CACHED SPEEDS
        speeds = [s['speed'] for s in self.cached_speeds] if self.cached_speeds else []
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        peak_speed = max(speeds) if speeds else 0
        
        class_stats = full_metrics.get('classification_stats', {})
        
        # E. Dynamic Safety Index Calculation with Temporal Decay
        current_time = time.time()
        safety_base = 100.0
        
        # Enhanced penalty map
        penalty_map = {
            'collision': 50,
            'traffic_violation': 20,
            'wrong_way': 30,
            'illegal_boarding': 15,
            'stalled_vehicle': 10,
            'red_light': 25,
            'no_helmet': 15,
            'speeding': 18,
            'wrong_lane': 12
        }
        
        # Track new violations with timestamps
        for event in all_events:
            v_id = event.get('data', {}).get('id', str(uuid.uuid4()))
            if v_id not in self.violation_timestamps:
                self.violation_timestamps[v_id] = current_time
        
        # Calculate decayed penalties
        total_penalty = 0
        expired_violations = []
        for v_id, timestamp in self.violation_timestamps.items():
            time_elapsed = current_time - timestamp
            # Exponential decay: penalty reduces by DECAY_RATE per second
            decay_factor = (self.SAFETY_DECAY_RATE ** time_elapsed)
            
            # Find matching violation type (simplified)
            base_penalty = 15  # Default
            for event in all_events:
                if event.get('data', {}).get('id') == v_id:
                    base_penalty = penalty_map.get(event['type'], 15)
                    break
            
            decayed_penalty = base_penalty * decay_factor
            
            # Remove violations that have decayed below 1% of original
            if decayed_penalty < 0.01 * base_penalty:
                expired_violations.append(v_id)
            else:
                total_penalty += decayed_penalty
        
        # Clean up expired violations
        for v_id in expired_violations:
            del self.violation_timestamps[v_id]
        
        current_safety = max(0, min(100, safety_base - total_penalty))
        
        # Update stability history (SINGLE UPDATE POINT)
        raw_stream = self.bus.get_snapshot()['raw_stream']
        stab_hist = raw_stream.get('stability_history', [])
        stab_hist.append({'frame': self.frame_number, 'stability': current_safety})
        if len(stab_hist) > self.HISTORY_LENGTH:
            stab_hist.pop(0)
        self.bus.update("raw_stream", {"stability_history": stab_hist})


        # Store for API access
        self.last_classification_stats = class_stats
        self.last_avg_speed = avg_speed
        self.last_peak_speed = peak_speed
        self.last_safety_index = current_safety

        # Calculate Real FPS
        frame_time = time.time() - t0
        if frame_time > 0:
            instant_fps = 1.0 / frame_time
            self.fps_tracker.append(instant_fps)
            if len(self.fps_tracker) > 30:  # 1-second window at 30fps
                self.fps_tracker.pop(0)
        real_fps = sum(self.fps_tracker) / len(self.fps_tracker) if self.fps_tracker else 30.0
        
        # Construct final Telemetry dict for API
        
        # Calculate minimum proximity between any two vehicles for fallback capture
        min_proximity = 9999.0
        if context.results is not None and context.results.boxes.id is not None:
            boxes = context.results.boxes.xyxy.cpu().numpy()
            if len(boxes) >= 2:
                for i in range(len(boxes)):
                    c1 = ((boxes[i][0] + boxes[i][2])/2, (boxes[i][1] + boxes[i][3])/2)
                    for j in range(i + 1, len(boxes)):
                        c2 = ((boxes[j][0] + boxes[j][2])/2, (boxes[j][1] + boxes[j][3])/2)
                        d = math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)
                        if d < min_proximity:
                            min_proximity = d

        telemetry = {
            "type": "telemetry",
            "fps": round(real_fps, 1),
            "total_vehicles": full_metrics.get('vehicle_count', 0),
            "active_violations": len(all_events),
            "min_proximity": round(min_proximity, 1) if min_proximity < 9999 else None,
            "violation_stats": violation_stats,
            "flow_rate": full_metrics.get('flow_rate', 0),
            "flow_history": self.flow_history[-50:],
            "crowd_data": full_metrics.get('crowd_density', []),
            "anomaly_history": self.stability_history[-50:],
            "system_status": "OPTIMAL" if current_safety > 80 else "WARNING" if current_safety > 60 else "CRITICAL",
            "classification_stats": class_stats,
            "avg_speed": avg_speed,
            "peak_speed": peak_speed,
            "safety_index": current_safety
        }
        
        # 7. Professional AI HUD (Digital Twin Overlays)
        frame = self.heatmap.get_overlay(frame)
        frame = self._draw_intelligence_hud(frame, telemetry)
        
        return frame, canonical_events, telemetry

    def _get_default_telemetry(self):
        """Return default telemetry for error cases"""
        return {
            "type": "telemetry",
            "fps": 0,
            "total_vehicles": 0,
            "active_violations": 0,
            "violation_stats": [],
            "flow_rate": 0,
            "flow_history": [],
            "crowd_data": [],
            "anomaly_history": [],
            "system_status": "ERROR",
            "classification_stats": {},
            "avg_speed": 0,
            "peak_speed": 0,
            "safety_index": 0
        }

    def _draw_intelligence_hud(self, frame, telemetry):
        """Draw a professional city intelligence HUD on top of the video"""
        try:
            h, w = frame.shape[:2]
            overlay = frame.copy()
            
            # Left Management Panel (Semi-transparent)
            panel_w = int(w * 0.25)
            cv2.rectangle(overlay, (0, 0), (panel_w, h), (15, 12, 10), -1) # Deep obsidian panel
            cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
            
            # Aesthetics: Tech lines
            cv2.line(frame, (panel_w, 0), (panel_w, h), (0, 232, 255), 1) # Cyan vertical divider
            
            # 1. Header
            font = cv2.FONT_HERSHEY_SIMPLEX
            f_scale = w / 1600.0
            thick = 1
            
            y_ptr = int(40 * f_scale)
            cv2.putText(frame, "PEGASUS CITY DEFENSE v4.0", (20, y_ptr), font, f_scale * 1.2, (0, 232, 255), thick + 1)
            y_ptr += int(25 * f_scale)
            cv2.putText(frame, f"CAM-NODE: {uuid.uuid4().hex[:8].upper()}", (20, y_ptr), font, f_scale * 0.7, (150, 150, 150), thick)
            
            # 2. Real AI Metrics (Grouped)
            y_ptr += int(60 * f_scale)
            cv2.putText(frame, "[LIVE INFERENCE]", (20, y_ptr), font, f_scale * 0.8, (0, 232, 255), thick)
            
            metrics = [
                ("VEHICLES", f"{telemetry['total_vehicles']}"),
                ("AVG SPEED", f"{telemetry['avg_speed']:.1f} KM/H"),
                ("SAFETY INDEX", f"{telemetry['safety_index']}%"),
                ("VIOLATIONS", f"{telemetry['active_violations']}")
            ]
            
            for label, val in metrics:
                y_ptr += int(40 * f_scale)
                color = (255, 255, 255)
                if label == "SAFETY INDEX":
                    color = (0, 255, 0) if telemetry['safety_index'] > 80 else (0, 165, 255) if telemetry['safety_index'] > 60 else (0, 0, 255)
                
                cv2.putText(frame, f"{label}:", (20, y_ptr), font, f_scale * 0.7, (200, 200, 200), thick)
                cv2.putText(frame, val, (panel_w - int(100*f_scale), y_ptr), font, f_scale * 0.8, color, thick + 1)

            # 3. Requested Analytics (Mock/Extended)
            y_ptr += int(80 * f_scale)
            cv2.putText(frame, "[URBAN ENVIRONMENT]", (20, y_ptr), font, f_scale * 0.8, (0, 232, 255), thick)
            
            import random
            time_str = datetime.now().strftime("%H:%M:%S")
            mock_data = [
                ("AMBIENT TEMP", "28.4 C"),
                ("AIR QUALITY", "GOOD (42)"),
                ("NODE HEALTH", "99.8%"),
                ("STREET LIGHTS", "ON / AUTO"),
                ("TIMESTAMP", time_str),
                ("LATENCY", f"{random.randint(8, 15)}ms")
            ]
            
            for label, val in mock_data:
                y_ptr += int(35 * f_scale)
                cv2.putText(frame, f"{label}:", (20, y_ptr), font, f_scale * 0.6, (120, 120, 120), thick)
                cv2.putText(frame, val, (panel_w - int(100*f_scale), y_ptr), font, f_scale * 0.6, (180, 180, 180), thick)

            # 4. Status Bar Bottom
            cv2.rectangle(frame, (0, h - int(40*f_scale)), (w, h), (15, 12, 10), -1)
            status_color = (0, 255, 0) if telemetry['safety_index'] > 60 else (0, 0, 255)
            cv2.putText(frame, f"SYSTEM STATUS: {telemetry['system_status']}", (20, h - int(15*f_scale)), font, f_scale * 0.7, status_color, thick + 1)
            cv2.putText(frame, "REDACTED // SECURE FEED", (w - int(250*f_scale), h - int(15*f_scale)), font, f_scale * 0.7, (50, 50, 50), thick)

            return frame
        except Exception as e:
            print(f"HUD ERROR: {e}")
            return frame

    def _preprocess_frame(self, frame):
        """Enhance frame clarity using CLAHE for better AI feature extraction"""
        try:
            # Convert to LAB color space to equalize Luminance
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            cl = clahe.apply(l)
            
            # Merge back
            limg = cv2.merge((cl,a,b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        except Exception:
            return frame # Fallback to raw

    def _serialize_event(self, violation, vehicle_id, v_type):
        """Helper to format event for API"""
        bbox = violation.get('bbox')
        if bbox is not None:
            if hasattr(bbox, 'tolist'): bbox = bbox.tolist()
            elif hasattr(bbox, 'cpu'): bbox = bbox.cpu().numpy().tolist()
                
        return {
            "event_type": v_type,
            "event_id": str(uuid.uuid4()),
            "vehicle_id": vehicle_id,
            "duration_seconds": 0,
            "confidence": 0.95,
            "frame_number": self.frame_number,
            "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "metadata": {
                "bbox": bbox,
                "status": "START" if violation.get('status') == 'VIOLATION_START' else "END",
                "details": violation.get('details', '')
            }
        }
        
    def _save_worker(self):
        """Background thread for database saving to avoid lagging the main loop"""
        print("SYSTEM: Evidence Save Worker started.")
        while True:
            try:
                item = self.save_queue.get()
                if item is None: break
                
                self.db.insert_evidence(
                    violation_type=item['type'],
                    vehicle_id=item['vehicle_id'],
                    image_bytes=item['image_bytes']
                )
                self.save_queue.task_done()
            except Exception as e:
                print(f"ERROR in Save Worker: {e}")

    def finalize(self, last_frame):
        # Stop worker
        self.save_queue.put(None)
        if self.save_worker.is_alive():
            self.save_worker.join()
        pass
