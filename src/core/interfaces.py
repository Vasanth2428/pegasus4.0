from abc import ABC, abstractmethod
from typing import Dict, Any
from .context import FrameContext

class IntelligenceHead(ABC):
    """
    Abstract Base Class for all Intelligence Heads.
    Each head is responsible for a specific domain of perception (e.g., collision, flow, anomalies).
    """

    @abstractmethod
    def process(self, context: FrameContext) -> Dict[str, Any]:
        """
        Process the frame context and return a dictionary of events/metrics.
        The return value will be merged into the Telemetry Bus.
        """
        pass
