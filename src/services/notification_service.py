
import json
import logging
from datetime import datetime
from typing import Dict, Any

class NotificationService:
    """
    Centralized service for dispatching notifications to external consumers.
    Currently supports logging and console output, ready for Slack/SMS integration.
    """
    def __init__(self, log_path="data/notifications.log"):
        self.log_path = log_path
        self._setup_logging()

    def _setup_logging(self):
        self.logger = logging.getLogger("NotificationService")
        self.logger.setLevel(logging.INFO)
        fh = logging.FileHandler(self.log_path)
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        fh.setFormatter(formatter)
        self.logger.addHandler(fh)

    def dispatch(self, event_type: str, severity: str, details: Dict[str, Any]):
        """
        Dispatch a notification based on event criteria.
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        payload = {
            "timestamp": timestamp,
            "event_type": event_type,
            "severity": severity,
            "details": details
        }

        # 1. Internal Log
        self.logger.info(f"Notification Sent: {json.dumps(payload)}")

        # 2. Console Output (for debugging/demo)
        print(f"\n[NOTIFICATION SERVICE] >>> {severity.upper()}: {event_type} at {timestamp}")
        print(f"Details: {details.get('msg', 'No details provided')}\n")

        # 3. TODO: External API Integrations (Slack, Email, SMS)
        if severity == "critical":
            self._dispatch_critical_alert(payload)

    def _dispatch_critical_alert(self, payload):
        # Placeholder for high-priority dispatch logic
        pass
