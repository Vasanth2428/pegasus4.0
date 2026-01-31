from src.core.interfaces import IntelligenceHead
from src.core.context import FrameContext
from typing import Dict, Any
from src.utils.accident_utils import CollisionDetector

class CollisionHead(IntelligenceHead):
    def __init__(self):
        # We reuse the logic class for now, but configured cleanly
        self.detector = CollisionDetector(iou_threshold=0.4) 

    def process(self, context: FrameContext) -> Dict[str, Any]:
        """
        Detect collisions based on FrameContext.
        Expects context.results (YOLO) and context.speed_estimator to be present.
        """
        # We need to bridge the new context to the old method signature
        # old sig: detect_collisions(results, speed_estimator)
        
        # In the new architecture, speed should hopefully be in context
        # But for now, we can pass the estimator if it resides in context or service
        
        estimator = context.services.get('speed_estimator')
        
        if context.results is None:
            return {"collisions": []}
            
        anomalies = self.detector.detect_collisions(context.results, estimator)
        
        # Convert internal anomaly format to Telemetry Event format immediately?
        # Or return raw and let Bus/Serializer handle it?
        # User spec says output: ["collision_event"]
        
        events = []
        for anomaly in anomalies:
            events.append({
                "type": "collision",
                "severity": "critical",
                "data": anomaly
            })
            
        return {"events": events} 
