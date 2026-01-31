from src.core.interfaces import IntelligenceHead
from src.core.context import FrameContext
from typing import Dict, Any, List
# We may keep Heatmap visual logic separate in visualization, 
# but this head is responsible for the DATA (points)

class CrowdHead(IntelligenceHead):
    def process(self, context: FrameContext) -> Dict[str, Any]:
        results = context.results
        crowd_data: List[Dict[str, float]] = []
        
        # CRITICAL FIX: Add null safety checks
        if results is None or results.boxes is None or results.boxes.cls is None:
            return {"metrics": {"crowd_density": []}}
        
        h, w = results.orig_shape
        for box, cls in zip(results.boxes.xyxy, results.boxes.cls):
            if int(cls) == 0: # Person
                # Normalize to 0-100 scale
                cx = float((box[0] + box[2]) / 2 / w * 100)
                cy = float((box[1] + box[3]) / 2 / h * 100)
                crowd_data.append({"x": cx, "y": cy, "z": 1.0})
                    
        return {
            "metrics": {
                "crowd_density": crowd_data
            }
        }
