from dataclasses import dataclass, field
from typing import Any, List, Dict, Optional
from ultralytics.engine.results import Results

@dataclass
class FrameContext:
    frame_id: int
    timestamp: float
    fps: float
    results: Results  # Raw YOLO results
    frame: Any = None # Raw image frame (numpy)
    services: Dict[str, Any] = field(default_factory=dict) # Service container (e.g. speed_estimator)
    detections: List[Dict[str, Any]] = field(default_factory=list) # Parsed detections (xyxy, cls, id, conf)
    scene_metadata: Dict[str, Any] = field(default_factory=dict) # Lane regions, etc.
    
    def __post_init__(self):
        # Parse detections immediately for easier consumption
        if self.results.boxes is not None:
             pass
