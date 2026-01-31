"""
PEGASUS FastAPI Backend - Video Processing API
Run with: uvicorn backend.main:app --reload
"""
from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import cv2
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detector import TrafficViolationDetector

app = FastAPI(title="PEGASUS City Defense API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global detector instance
detector = TrafficViolationDetector()

@app.get("/")
def root():
    return {"status": "PEGASUS System Online", "version": "4.0"}

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload and process video"""
    try:
        # Save uploaded file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"✓ Video saved: {file_path}")
        
        # Reset detector for new video
        detector.reset()
        
        return {
            "status": "success",
            "filename": file.filename,
            "path": file_path,
            "message": "Video uploaded successfully. Ready for processing."
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/api/process-now")
async def process_video_now(file: UploadFile = File(...)):
    """Upload and IMMEDIATELY process video with ML detection"""
    try:
        # Save uploaded file
        upload_dir = "uploads"
        output_dir = "output"
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"✓ Video uploaded: {file_path}")
        print(f"🔄 Processing with ML detection...")
        
        # Reset detector
        detector.reset()
        
        # Process video with ML
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "Could not open video"}
            )
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps_v = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Output path
        output_filename = f"detected_{file.filename}"
        output_path = os.path.join(output_dir, output_filename)
        
        # Video writer - CRITICAL: Use H.264 codec for browser compatibility
        fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 - browser compatible
        out = cv2.VideoWriter(output_path, fourcc, fps_v, (width, height))
        
        frame_idx = 0
        violation_count = 0
        first_frame = None
        best_observation_frame = None
        min_recorded_dist = 99999.0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if first_frame is None:
                first_frame = frame.copy()
            
            # Process with ML
            processed_frame, events, telemetry = detector.process_frame(frame, verbose=False)
            violation_count += len(events)
            
            # Track frame with closest proximity for forced incident fallback
            p_dist = telemetry.get('min_proximity')
            if p_dist is not None and p_dist < min_recorded_dist:
                min_recorded_dist = p_dist
                best_observation_frame = frame.copy()
            
            # Write processed frame
            out.write(processed_frame)
            
            frame_idx += 1
            
            # Progress logging
            if frame_idx % 30 == 0:
                progress = (frame_idx / total_frames) * 100
                print(f"  Progress: {progress:.1f}% ({frame_idx}/{total_frames} frames) [Min Prox: {min_recorded_dist}]")
        
        # MANDATORY EVIDENCE: If no violations found, capture a "Safety Observation"
        # Preference: 1. Frame where vehicles were closest, 2. First frame
        capture_frame = best_observation_frame if best_observation_frame is not None else first_frame
        
        if violation_count == 0 and capture_frame is not None:
            print(f"💡 No violations found. Capturing 'Safety Observation' (Min Dist: {min_recorded_dist})")
            from src.visualization import capture_violation_evidence
            capture_violation_evidence(capture_frame, "safety_observation", None, vehicle_id="proximity_check", output_dir="data/evidence")
            violation_count = 1

        cap.release()
        out.release()
        
        print(f"✓ Processing complete: {output_path}")
        
        return {
            "status": "success",
            "filename": file.filename,
            "output_filename": output_filename,
            "output_path": f"/{output_dir}/{output_filename}",
            "frames_processed": frame_idx,
            "violations_detected": violation_count,
            "message": "Video processed successfully with ML detection"
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )


@app. websocket("/ws/process/{filename}")
async def process_video_stream(websocket: WebSocket, filename: str):
    """Process video and stream results via WebSocket"""
    await websocket.accept()
    
    try:
        video_path = os.path.join("uploads", filename)
        
        if not os.path.exists(video_path):
            await websocket.send_json({
                "type": "error",
                "message": f"Video not found: {filename}"
            })
            return
        
        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            processed_frame, events, telemetry = detector.process_frame(frame, verbose=False)
            
            # Send telemetry
            await websocket.send_json({
                "type": "telemetry",
                "frame": frame_count,
                "data": telemetry
            })
            
            # Send events
            if events:
                for event in events:
                    await websocket.send_json({
                        "type": "event",
                        "data": event
                    })
            
            frame_count += 1
            
        cap.release()
        
        # Send completion
        await websocket.send_json({
            "type": "complete",
            "total_frames": frame_count,
            "message": "Processing complete"
        })
        
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()

@app.get("/api/evidence")
def get_evidence():
    """Get all evidence snapshots"""
    evidence_dir = "data/evidence"
    
    if not os.path.exists(evidence_dir):
        return {"evidence": []}
    
    files = [f for f in os.listdir(evidence_dir) if f.endswith('.jpg')]
    
    return {
        "evidence": files,
        "count": len(files),
        "directory": evidence_dir
    }

@app.get("/api/stats")
def get_stats():
    """Get current detection statistics"""
    return {
        "detector_status": "active",
        "fps": detector.last_avg_speed if hasattr(detector, 'last_avg_speed') else 0,
        "safety_index": detector.last_safety_index if hasattr(detector, 'last_safety_index') else 100,
        "violations_logged": len(detector.violation_log) if hasattr(detector, 'violation_log') else 0
    }

# Serve static files (processed videos)
from fastapi.staticfiles import StaticFiles
app.mount("/output", StaticFiles(directory="output"), name="output")
app.mount("/evidence", StaticFiles(directory="data/evidence"), name="evidence")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PEGASUS Backend Server...")
    print("📡 API Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
