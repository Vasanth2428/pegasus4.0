from src.core.interfaces import IntelligenceHead
from src.core.context import FrameContext
from typing import Dict, Any
from src.utils.counting_utils import VehicleCounter

class TrafficFlowHead(IntelligenceHead):
    NAMES = {0: 'Person', 2: 'Car', 3: 'Motorcycle', 5: 'Bus', 7: 'Truck'}

    def __init__(self):
        self.counter = VehicleCounter()

    def process(self, context: FrameContext) -> Dict[str, Any]:
        if context.results is None or context.results.boxes is None:
            return {"flow_rate": 0, "vehicle_count": 0, "classification_stats": {}}
            
        count = self.counter.update_count(context.results)
        flow_rate = len(context.results.boxes) if context.results.boxes else 0
        
        # Breakdown by class
        class_stats = {}
        if context.results.boxes.cls is not None:
            for cls in context.results.boxes.cls:
                name = self.NAMES.get(int(cls), 'Other')
                class_stats[name] = class_stats.get(name, 0) + 1

        return {
            "metrics": {
                "vehicle_count": count,
                "flow_rate": flow_rate,
                "classification_stats": class_stats
            }
        }
