# PEGASUS Backend Setup Instructions

## What Was Missing

Your project had:
- ✅ Frontend (Next.js)
- ✅ ML detection code (`src/detector.py`)
- ❌ **NO backend API server!**

## ✅ Backend Now Created

**File:** `backend/main.py` (FastAPI server)

---

## 🚀 How to Run

### **1. Install Requirements** (if not already)
```bash
pip install fastapi uvicorn python-multipart websockets
```

### **2. Start Backend**
```bash
# From project root:
cd pegasus4.0-main
python -m uvicorn backend.main:app --reload

# Or directly run:
python backend/main.py
```

**Server starts at:** `http://localhost:8000`

### **3. Test It**
```bash
# Open in browser:
http://localhost:8000          # Status check
http://localhost:8000/docs     # API documentation
```

---

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/api/upload` | POST | Upload video file |
| `/ws/process/{filename}` | WebSocket | Stream processing results |
| `/api/evidence` | GET | Get saved snapshots |
| `/api/stats` | GET | Get detection stats |

---

## 🧪 Test Upload

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@path/to/your/video.mp4"
```

**Using Frontend:**
Your frontend Upload page can now POST to `http://localhost:8000/api/upload`

---

## 📁 Project Structure Now

```
pegasus4.0-main/
├── backend/
│   ├── main.py        ← NEW! FastAPI server
│   └── engine.py      ← Rule engine helper
├── src/
│   ├── detector.py    ← ML detection
│   └── ...
├── pages/
│   └── Upload.tsx     ← Frontend
└── uploads/           ← Created automatically
```

---

## 🔗 Integration

**Your frontend should call:**
```typescript
// Upload video
await fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData
});

// Connect WebSocket for real-time updates
const ws = new WebSocket('ws://localhost:8000/ws/process/video.mp4');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle telemetry, events, etc.
};
```

---

## ⚠️ Why This Was Missing

The original project was likely:
1. **Demo/prototype** without backend
2. **Frontend-only** showcase
3. **Or:** Backend code was lost/not included

**Now you have a complete full-stack system!**
