from typing import Dict, Any, List
from threading import Lock

class TelemetryBus:
    """
    Central Aggregator for all system outputs.
    Heads publish to this bus, and API/Frontend subscribers read from it.
    """
    def __init__(self):
        self._state = {
            "system_status": {
                "fps": 0.0,
                "latency_ms": 0.0,
                "health": "OK"
            },
            "metrics": {
                "traffic_flow": [],
                "crowd_density": [],
                "stability_score": 100
            },
            "events": {
                "violations": [],
                "collisions": []
            },
            "raw_stream": {} # For counters etc
        }
        self._lock = Lock()

    def update(self, key: str, value: Any):
        """Update a specific key in the internal state"""
        with self._lock:
            # Deep merge could be better, but simple assignment for now
            if isinstance(value, dict) and key in self._state and isinstance(self._state[key], dict):
                 self._state[key].update(value)
            else:
                 self._state[key] = value

    def get_snapshot(self) -> Dict[str, Any]:
        """Return a thread-safe copy of the current state"""
        with self._lock:
            import copy
            return copy.deepcopy(self._state)
