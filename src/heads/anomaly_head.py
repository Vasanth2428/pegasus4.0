from src.core.interfaces import IntelligenceHead
from src.core.context import FrameContext
from typing import Dict, Any

from src.utils.stopped_vehicle_utils import StoppedVehicleDetector
from src.utils.lane_violation_utils import LaneViolationDetector
from src.utils.pedestrian_utils import PedestrianDetector
from src.utils.movement_utils import MovementDetector
from src.utils.interaction_utils import InteractionDetector

class AnomalyHead(IntelligenceHead):
    def __init__(self):
        self.stopped = StoppedVehicleDetector()
        self.lane = LaneViolationDetector()
        self.pedestrian = PedestrianDetector()
        self.movement = MovementDetector()
        self.interaction = InteractionDetector()

    def process(self, context: FrameContext) -> Dict[str, Any]:
        frame = getattr(context, 'frame', None) # Need frame for some logic? or just results?
        # StoppedVehicleDetector needs FRAME for pixel checks sometimes, but mostly results.
        # Detector currently passes frame.
        
        results = context.results
        if results is None:
            return {"events": []}
            
        events = []
        
        # We need stationary IDs for interaction detector
        # But wait, StoppedDetector returns (anomalies, stationary_ids)
        
        if frame is not None:
             stopped_anomalies, stationary_ids = self.stopped.detect_stopped_vehicle(frame, results)
        else:
             stopped_anomalies, stationary_ids = [], [] # Fallback if no frame
             
        lane_anomalies = self.lane.detect_lane_violation(results)
        jaywalking = self.pedestrian.detect_jaywalking(results)
        wrong_way = self.movement.detect_wrong_way(results)
        boarding = self.interaction.detect_illegal_boarding(results, stationary_ids)
        
        # Aggregate
        raw_list = stopped_anomalies + lane_anomalies + jaywalking + wrong_way + boarding
        
        for item in raw_list:
            events.append({
                "type": item['type'],
                "severity": "warning", # severe ones filtered later?
                "data": item
            })
            
        return {"events": events}
