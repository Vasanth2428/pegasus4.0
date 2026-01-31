"""
PEGASUS Analysis & Prototyping Tool
Replaces notebooks/prototype.ipynb functionality

This script provides interactive analysis, testing, and visualization
of the PEGASUS detection system without requiring Jupyter notebooks.

Usage:
    python analysis.py --mode [detect|analyze|visualize|stats]
    
Examples:
    python analysis.py --mode detect --video test.mp4
    python analysis.py --mode analyze --evidence-dir data/evidence
    python analysis.py --mode stats
"""

import argparse
import cv2
import os
import sys
from pathlib import Path
import json
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.detector import TrafficViolationDetector

class PegasusAnalyzer:
    """Interactive analysis tool for PEGASUS detection system"""
    
    def __init__(self):
        self.detector = None
        self.results_cache = []
        
    def run_detection_analysis(self, video_path, max_frames=300):
        """Analyze detection performance on a video"""
        print("=" * 60)
        print("DETECTION ANALYSIS MODE")
        print("=" * 60)
        
        if not os.path.exists(video_path):
            print(f"❌ Video not found: {video_path}")
            return
        
        # Initialize detector
        print("\n[1/4] Loading detector...")
        self.detector = TrafficViolationDetector()
        
        # Open video
        print(f"[2/4] Opening video: {video_path}")
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"❌ Failed to open video")
            return
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        print(f"✓ Video: {total_frames} frames @ {fps} FPS")
        
        # Analysis metrics
        metrics = {
            'frames_processed': 0,
            'total_detections': 0,
            'violations_by_type': {},
            'avg_vehicles_per_frame': 0,
            'avg_safety_index': 0,
            'detection_confidence': []
        }
        
        print(f"\n[3/4] Processing up to {max_frames} frames...")
        
        frame_idx = 0
        while frame_idx < min(max_frames, total_frames):
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            processed_frame, events, telemetry = self.detector.process_frame(frame, verbose=False)
            
            # Collect metrics
            metrics['frames_processed'] += 1
            metrics['total_detections'] += telemetry.get('total_vehicles', 0)
            metrics['avg_safety_index'] += telemetry.get('safety_index', 100)
            
            for event in events:
                v_type = event.get('type', 'unknown')
                metrics['violations_by_type'][v_type] = metrics['violations_by_type'].get(v_type, 0) + 1
            
            if frame_idx % 50 == 0:
                print(f"  Frame {frame_idx}: {telemetry.get('total_vehicles', 0)} vehicles, "
                      f"Safety: {telemetry.get('safety_index', 100):.0f}%")
            
            frame_idx += 1
        
        cap.release()
        
        # Compute averages
        if metrics['frames_processed'] > 0:
            metrics['avg_vehicles_per_frame'] = metrics['total_detections'] / metrics['frames_processed']
            metrics['avg_safety_index'] = metrics['avg_safety_index'] / metrics['frames_processed']
        
        # Display results
        print(f"\n[4/4] Analysis Complete!")
        print("=" * 60)
        print(f"📊 DETECTION METRICS:")
        print(f"  Frames Processed:        {metrics['frames_processed']}")
        print(f"  Total Detections:        {metrics['total_detections']}")
        print(f"  Avg Vehicles/Frame:      {metrics['avg_vehicles_per_frame']:.2f}")
        print(f"  Avg Safety Index:        {metrics['avg_safety_index']:.1f}%")
        print(f"\n🚨 VIOLATIONS DETECTED:")
        if metrics['violations_by_type']:
            for v_type, count in sorted(metrics['violations_by_type'].items()):
                print(f"  {v_type:.<25} {count}")
        else:
            print("  No violations detected")
        print("=" * 60)
        
        # Save report
        report_path = f"analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"\n📝 Report saved: {report_path}")
        
        return metrics
    
    def visualize_evidence(self, evidence_dir="data/evidence"):
        """Visualize all evidence snapshots"""
        print("=" * 60)
        print("EVIDENCE VISUALIZATION MODE")
        print("=" * 60)
        
        if not os.path.exists(evidence_dir):
            print(f"❌ Evidence directory not found: {evidence_dir}")
            return
        
        evidence_files = [f for f in os.listdir(evidence_dir) if f.endswith('.jpg')]
        
        if not evidence_files:
            print("❌ No evidence snapshots found")
            return
        
        print(f"✓ Found {len(evidence_files)} evidence snapshots")
        
        # Display grid of evidence
        cols = 3
        rows = (len(evidence_files) + cols - 1) // cols
        
        fig, axes = plt.subplots(rows, cols, figsize=(15, 5 * rows))
        if rows == 1:
            axes = [axes]
        if cols == 1:
            axes = [[ax] for ax in axes]
        
        for idx, filename in enumerate(evidence_files[:rows * cols]):
            row = idx // cols
            col = idx % cols
            
            img_path = os.path.join(evidence_dir, filename)
            img = cv2.imread(img_path)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            axes[row][col].imshow(img_rgb)
            axes[row][col].set_title(filename[:30], fontsize=8)
            axes[row][col].axis('off')
        
        # Hide empty subplots
        for idx in range(len(evidence_files), rows * cols):
            row = idx // cols
            col = idx % cols
            axes[row][col].axis('off')
        
        plt.tight_layout()
        output_path = f"evidence_visualization_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        plt.savefig(output_path, dpi=150)
        print(f"\n📊 Visualization saved: {output_path}")
        plt.show()
    
    def show_stats(self):
        """Display current system statistics"""
        print("=" * 60)
        print("SYSTEM STATISTICS MODE")
        print("=" * 60)
        
        # Count evidence
        evidence_dir = "data/evidence"
        evidence_count = 0
        if os.path.exists(evidence_dir):
            evidence_count = len([f for f in os.listdir(evidence_dir) if f.endswith('.jpg')])
        
        # Count processed videos
        output_dir = "output"
        output_videos = 0
        if os.path.exists(output_dir):
            output_videos = len([f for f in os.listdir(output_dir) if f.endswith('.mp4')])
        
        # Count uploads
        uploads_dir = "uploads"
        uploaded_videos = 0
        if os.path.exists(uploads_dir):
            uploaded_videos = len([f for f in os.listdir(uploads_dir) if f.endswith(('.mp4', '.avi', '.mov'))])
        
        print(f"\n📁 FILE STATISTICS:")
        print(f"  Uploaded Videos:         {uploaded_videos}")
        print(f"  Processed Videos:        {output_videos}")
        print(f"  Evidence Snapshots:      {evidence_count}")
        
        print(f"\n🔧 SYSTEM STATUS:")
        print(f"  Model:                   YOLOv8n")
        print(f"  Detection Active:        ✓ Yes")
        print(f"  Tracking:                ByteTrack")
        print(f"  Confidence Threshold:    0.65")
        print(f"  NMS IoU:                 0.5")
        
        print(f"\n📊 DIRECTORIES:")
        print(f"  Uploads:                 {uploads_dir}/")
        print(f"  Output:                  {output_dir}/")
        print(f"  Evidence:                {evidence_dir}/")
        
        print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="PEGASUS Analysis & Prototyping Tool")
    parser.add_argument('--mode', choices=['detect', 'analyze', 'visualize', 'stats'], 
                        default='stats', help='Analysis mode')
    parser.add_argument('--video', default='test_video.mp4', help='Video file path')
    parser.add_argument('--frames', type=int, default=300, help='Max frames to process')
    parser.add_argument('--evidence-dir', default='data/evidence', help='Evidence directory')
    
    args = parser.parse_args()
    
    analyzer = PegasusAnalyzer()
    
    if args.mode == 'detect' or args.mode == 'analyze':
        analyzer.run_detection_analysis(args.video, args.frames)
    elif args.mode == 'visualize':
        analyzer.visualize_evidence(args.evidence_dir)
    elif args.mode == 'stats':
        analyzer.show_stats()

if __name__ == "__main__":
    main()
