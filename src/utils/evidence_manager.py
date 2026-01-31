from datetime import datetime, timedelta

class EvidenceManager:
    def __init__(self, cooldown_seconds=60):
        self.cooldown_seconds = cooldown_seconds
        self.last_capture = {} # {(vehicle_id, violation_type): timestamp}
        self.global_last_capture = {} # {violation_type: timestamp}
        self.global_cooldown = 10 # Global throttle for the same type (seconds)

    def should_capture(self, vehicle_id, violation_type, status):
        """
        Determines if evidence should be captured based on cooldown and status.
        Includes a per-vehicle cooldown AND a global per-type cooldown 
        to prevent flooding during messy intersections/flicker.
        """
        now = datetime.now()
        
        # 1. Global Cooldown (Throttle specific types like illegal_boarding)
        if violation_type in self.global_last_capture:
            if now - self.global_last_capture[violation_type] < timedelta(seconds=self.global_cooldown):
                return False

        # 2. Per-Vehicle Cooldown
        key = (vehicle_id, violation_type)
        if key in self.last_capture:
            last_time = self.last_capture[key]
            if now - last_time < timedelta(seconds=self.cooldown_seconds):
                return False

        # If it's a 'START', we capture. END captures are disabled in detector.py.
        if status != 'VIOLATION_START':
            return False

        # If we decide to capture, update both timers
        self.last_capture[key] = now
        self.global_last_capture[violation_type] = now
        return True
