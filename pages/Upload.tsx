
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload as UploadIcon, ChevronRight, CheckCircle, AlertCircle, X,
  TrafficCone, Users, Eye, Zap, Cpu, History, FileVideo,
  Timer, BarChart3, Database, Shield, Activity, Fingerprint
} from 'lucide-react';

const ANALYSIS_STEPS = [
  {
    title: 'Traffic Monitoring',
    icon: <TrafficCone className="text-electricTeal" />,
    content: 'Scanning flow density. Current count: 42 vehicles/min. Flow state: Nominal.',
    meta: {
      fps: '24.2',
      model: 'YOLOv11x-TensorRT',
      confidence: '0.94',
      objects: ['Sedan', 'SUV', 'Truck', 'Motorcycle'],
      stats: { total: 1240, peak: '82/min', resolution: '4K', duration: '12:45', vram: '4.2GB', audit: 'AUD-9912' }
    },
    color: 'border-electricTeal',
    glow: 'shadow-[0_0_40px_rgba(0,232,255,0.5),0_0_80px_rgba(0,232,255,0.3)]'
  },
  {
    title: 'Violation Detection',
    icon: <AlertCircle className="text-red-500" />,
    content: 'Checking red-light patterns. Detected 2 stop-line crossings in CAM-001.',
    meta: {
      fps: '18.5',
      model: 'TrafficNet-v4',
      confidence: '0.98',
      objects: ['License Plate', 'Signal State', 'Collision Path'],
      stats: { total: 12, peak: '3/hour', resolution: '1080p', duration: '05:20', vram: '2.8GB', audit: 'AUD-9913' }
    },
    color: 'border-red-500',
    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.5),0_0_80px_rgba(239,68,68,0.3)]'
  },
  {
    title: 'Public Crowd',
    icon: <Users className="text-biolumeGreen" />,
    content: 'Loitering analysis: 3 people stationary for >120s near Hub A entrance.',
    meta: {
      fps: '30.0',
      model: 'HumanPose-AI-v2',
      confidence: '0.82',
      objects: ['Pedestrian', 'Stationary Group', 'Posture'],
      stats: { total: 450, peak: '120 persons', resolution: '2K', duration: '22:10', vram: '3.1GB', audit: 'AUD-9914' }
    },
    color: 'border-biolumeGreen',
    glow: 'shadow-[0_0_40px_rgba(34,197,94,0.5),0_0_80px_rgba(34,197,94,0.3)]'
  },
  {
    title: 'Anomaly Detection',
    icon: <Zap className="text-amberEmber" />,
    content: 'Sudden velocity change detected at frame 1202. Likely heavy braking event.',
    meta: {
      fps: '22.1',
      model: 'Kinetic-Flow-3D',
      confidence: '0.91',
      objects: ['Velocity Vector', 'Sudden Stop', 'Collision Frame'],
      stats: { total: 4, peak: 'N/A', resolution: '4K', duration: '02:00', vram: '5.4GB', audit: 'AUD-9915' }
    },
    color: 'border-amberEmber',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.5),0_0_80px_rgba(245,158,11,0.3)]'
  }
];

const CLASS_COLORS: Record<string, string> = {
  'car': '#00E8FF',
  'truck': '#FFB800',
  'bus': '#00FF85',
  'motorcycle': '#FF1F8A',
  'person': '#A855F7',
  'bicycle': '#EC4899',
  'traffic_light': '#EF4444',
};

const DETECTION_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'person', 'bicycle'];

const Upload: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // NEW: ML processing state
  const [processingProgress, setProcessingProgress] = useState(0); // NEW: Progress percentage
  const [activeStep, setActiveStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null); // NEW: ML processed video
  const [detections, setDetections] = useState<any[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    vehicles: 0,
    persons: 0,
    violations: 0,
    fps: 0,
    avgSpeed: 0,
    safetyIndex: 100,
    systemStatus: 'OPTIMAL'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // NEW: Handle file selection and automatic backend processing
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Upload and process with backend
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 Uploading video to backend for ML processing...');

      const response = await fetch('http://localhost:8000/api/process-now', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Backend processing failed');
      }

      const result = await response.json();
      console.log('✓ Backend response:', result);

      // Set the processed video URL
      const processedUrl = `http://localhost:8000${result.output_path}`;
      setProcessedVideoUrl(processedUrl);
      setVideoUrl(processedUrl); // Display the processed video

      console.log('🎬 Playing ML-processed video:', processedUrl);

      setIsProcessing(false);
      setProcessingProgress(100);

    } catch (error) {
      console.error('❌ Upload/processing error:', error);
      alert('Failed to process video with ML. Make sure backend is running on port 8000.');
      setIsProcessing(false);

      // Fallback: play raw video
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Generate heatmap data for traffic density
  const generateHeatmap = (width: number, height: number) => {
    const heatmap: number[][] = [];
    const gridSize = 20;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);

    for (let i = 0; i < rows; i++) {
      heatmap[i] = [];
      for (let j = 0; j < cols; j++) {
        // Create hotspots with random intensity
        const intensity = Math.random() * 0.7;
        heatmap[i][j] = intensity;
      }
    }
    return heatmap;
  };

  // Generate detections
  const generateDetections = (width: number, height: number) => {
    const numDetections = Math.floor(Math.random() * 8) + 3;
    const newDetections = [];
    const newViolations = [];

    for (let i = 0; i < numDetections; i++) {
      const className = DETECTION_CLASSES[Math.floor(Math.random() * DETECTION_CLASSES.length)];
      const x = Math.random() * (width - 180) + 20;
      const y = Math.random() * (height - 120) + 20;
      const w = Math.random() * 100 + 100;
      const h = Math.random() * 80 + 80;
      const confidence = 0.75 + Math.random() * 0.24;
      const speed = className !== 'person' ? Math.floor(Math.random() * 60) + 20 : 0;
      const trackId = Math.floor(Math.random() * 1000);

      newDetections.push({
        x, y, w, h,
        label: className,
        confidence,
        speed,
        trackId,
        color: CLASS_COLORS[className] || '#00E8FF',
        isViolation: Math.random() < 0.15 // 15% chance of violation
      });

      // Generate random violations
      if (Math.random() < 0.1) {
        newViolations.push({
          type: ['RED_LIGHT', 'NO_HELMET', 'WRONG_WAY', 'SPEEDING'][Math.floor(Math.random() * 4)],
          x: x + w / 2,
          y: y + h / 2,
          severity: Math.random() < 0.3 ? 'CRITICAL' : 'WARNING'
        });
      }
    }

    return { detections: newDetections, violations: newViolations };
  };

  // Draw complete ML detection output (mimicking detector.py output)
  const drawMLOutput = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.paused || video.ended) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Generate new data every 5 frames
    if (frameCount % 5 === 0) {
      const { detections: newDetections, violations: newViolations } = generateDetections(canvas.width, canvas.height);
      setDetections(newDetections);
      setViolations(newViolations);
      setHeatmapData(generateHeatmap(canvas.width, canvas.height));

      // Update stats
      const vehicles = newDetections.filter(d => ['car', 'truck', 'bus', 'motorcycle'].includes(d.label)).length;
      const persons = newDetections.filter(d => d.label === 'person').length;
      const avgSpeed = vehicles > 0 ? newDetections.filter(d => d.speed > 0).reduce((acc, d) => acc + d.speed, 0) / vehicles : 0;
      const safetyIndex = Math.max(0, 100 - (newViolations.length * 15) - (violations.length * 5));

      setStats({
        vehicles,
        persons,
        violations: violations.length,
        fps: Math.round((1000 / 33) * 10) / 10,
        avgSpeed: Math.round(avgSpeed),
        safetyIndex: Math.round(safetyIndex),
        systemStatus: safetyIndex > 80 ? 'OPTIMAL' : safetyIndex > 60 ? 'WARNING' : 'CRITICAL'
      });
    }

    // 1. Draw heatmap overlay
    if (heatmapData.length > 0) {
      const gridSize = 20;
      heatmapData.forEach((row, i) => {
        row.forEach((intensity, j) => {
          if (intensity > 0.3) {
            ctx.fillStyle = `rgba(239, 68, 68, ${intensity * 0.4})`;
            ctx.fillRect(j * gridSize, i * gridSize, gridSize, gridSize);
          }
        });
      });
    }

    // 2. Draw detections with professional styling
    detections.forEach(detection => {
      const { x, y, w, h, label, confidence, speed, trackId, color, isViolation } = detection;

      // Box glow effect for violations
      if (isViolation) {
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 20;
      }

      // Draw bounding box
      ctx.strokeStyle = isViolation ? '#EF4444' : color;
      ctx.lineWidth = isViolation ? 4 : 3;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;

      // Corner markers (professional look)
      const cornerLen = 15;
      ctx.lineWidth = 4;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();
      // Other corners...

      // Draw label background
      const labelText = `${label.toUpperCase()} #${trackId}`;
      const confText = `${(confidence * 100).toFixed(0)}%`;
      const speedText = speed > 0 ? `${speed}km/h` : '';

      ctx.font = 'bold 14px monospace';
      const labelWidth = ctx.measureText(labelText).width + ctx.measureText(confText).width + (speedText ? ctx.measureText(speedText).width : 0) + 30;

      ctx.fillStyle = isViolation ? '#EF4444' : color;
      ctx.fillRect(x, y - 32, labelWidth, 32);

      // Draw label text
      ctx.fillStyle = '#0D1117';
      ctx.fillText(labelText, x + 6, y - 12);
      ctx.fillText(confText, x + ctx.measureText(labelText).width + 15, y - 12);

      if (speedText) {
        ctx.fillStyle = '#0D1117';
        ctx.fillText(speedText, x + ctx.measureText(labelText + confText).width + 25, y - 12);
      }

      // Track line (trajectory)
      if (Math.random() < 0.3) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x + w / 2 + (Math.random() - 0.5) * 50, y + h + 40);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // 3. Draw violations
    violations.forEach(violation => {
      const { type, x, y, severity } = violation;
      const color = severity === 'CRITICAL' ? '#EF4444' : '#F97316';

      // Pulsing circle
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 30 + Math.sin(frameCount * 0.1) * 5, 0, Math.PI * 2);
      ctx.stroke();

      // Violation icon
      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('⚠', x - 8, y + 4);

      // Violation label
      ctx.fillStyle = color;
      ctx.fillRect(x + 40, y - 15, ctx.measureText(type).width + 10, 25);
      ctx.fillStyle = '#0D1117';
      ctx.fillText(type, x + 45, y + 3);
    });

    // 4. Draw Professional HUD (Left Panel - like detector.py)
    // Scale everything based on canvas width for responsiveness
    const scale = canvas.width / 1920; // Base scale on 1080p width
    const panelW = Math.floor(canvas.width * 0.22);
    const panelH = canvas.height;

    // Semi-transparent panel
    ctx.fillStyle = 'rgba(15, 12, 10, 0.92)';
    ctx.fillRect(0, 0, panelW, panelH);

    // Vertical divider line
    ctx.strokeStyle = '#00E8FF';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.beginPath();
    ctx.moveTo(panelW, 0);
    ctx.lineTo(panelW, panelH);
    ctx.stroke();

    // Set text baseline for consistent alignment
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Header
    const baseFontSize = Math.max(14, 22 * scale);
    let yPos = Math.max(35, 45 * scale);
    ctx.fillStyle = '#00E8FF';
    ctx.font = `bold ${Math.floor(baseFontSize * 1.2)}px monospace`;
    ctx.fillText('PEGASUS CITY DEFENSE', Math.floor(20 * scale), yPos);

    yPos += Math.floor(32 * scale);
    ctx.fillStyle = '#888';
    ctx.font = `bold ${Math.floor(baseFontSize * 0.65)}px monospace`;
    ctx.fillText(`CAM-NODE: ${Math.random().toString(36).substr(2, 8).toUpperCase()}`, Math.floor(20 * scale), yPos);

    // Live Inference Section
    yPos += Math.floor(55 * scale);
    ctx.fillStyle = '#00E8FF';
    ctx.font = `bold ${Math.floor(baseFontSize * 0.9)}px monospace`;
    ctx.fillText('[LIVE INFERENCE]', Math.floor(20 * scale), yPos);

    // Metrics with larger, more readable text
    const labelSize = Math.floor(baseFontSize * 0.7);
    const valueSize = Math.floor(baseFontSize * 1.9);
    const metricSpacing = Math.floor(58 * scale);
    const leftPadding = Math.floor(20 * scale);
    const rightPadding = Math.floor(20 * scale);

    yPos += Math.floor(45 * scale);
    // VEHICLES
    ctx.fillStyle = '#999';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.fillText('VEHICLES:', leftPadding, yPos);
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${valueSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(stats.vehicles.toString(), panelW - rightPadding, yPos);
    ctx.textAlign = 'left';

    yPos += metricSpacing;
    // AVG SPEED
    ctx.fillStyle = '#999';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.fillText('AVG SPEED:', leftPadding, yPos);
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${valueSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${stats.avgSpeed}`, panelW - rightPadding, yPos);
    ctx.textAlign = 'left';

    yPos += metricSpacing;
    // SAFETY INDEX
    ctx.fillStyle = '#999';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.fillText('SAFETY INDEX:', leftPadding, yPos);
    const safetyColor = stats.safetyIndex > 80 ? '#00FF85' : stats.safetyIndex > 60 ? '#FFB800' : '#EF4444';
    ctx.fillStyle = safetyColor;
    ctx.font = `bold ${valueSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${stats.safetyIndex}%`, panelW - rightPadding, yPos);
    ctx.textAlign = 'left';

    yPos += metricSpacing;
    // VIOLATIONS
    ctx.fillStyle = '#999';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.fillText('VIOLATIONS:', leftPadding, yPos);
    ctx.fillStyle = '#EF4444';
    ctx.font = `bold ${valueSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(stats.violations.toString(), panelW - rightPadding, yPos);
    ctx.textAlign = 'left';

    // Urban Environment Section
    yPos += Math.floor(80 * scale);
    ctx.fillStyle = '#00E8FF';
    ctx.font = `bold ${Math.floor(baseFontSize * 0.9)}px monospace`;
    ctx.fillText('[URBAN ENVIRONMENT]', leftPadding, yPos);

    const envData = [
      ['AMBIENT TEMP', '28.4 C'],
      ['AIR QUALITY', 'GOOD (42)'],
      ['NODE HEALTH', '99.8%'],
      ['STREET LIGHTS', 'ON / AUTO'],
      ['TIMESTAMP', new Date().toLocaleTimeString()],
      ['LATENCY', `${Math.floor(Math.random() * 8) + 8}ms`]
    ];

    const envFontSize = Math.floor(baseFontSize * 0.6);
    const envSpacing = Math.floor(35 * scale);
    envData.forEach(([label, value]) => {
      yPos += envSpacing;
      ctx.fillStyle = '#666';
      ctx.font = `bold ${envFontSize}px monospace`;
      ctx.fillText(`${label}:`, leftPadding, yPos);
      ctx.fillStyle = '#AAA';
      ctx.font = `normal ${envFontSize}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(value, panelW - rightPadding, yPos);
      ctx.textAlign = 'left';
    });

    // Bottom Status Bar
    const statusY = canvas.height - Math.floor(35 * scale);
    const statusHeight = Math.floor(35 * scale);
    ctx.fillStyle = 'rgba(15, 12, 10, 0.92)';
    ctx.fillRect(0, statusY, canvas.width, statusHeight);

    // Reset text alignment for status bar
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const statusColor = stats.systemStatus === 'OPTIMAL' ? '#00FF85' : stats.systemStatus === 'WARNING' ? '#FFB800' : '#EF4444';
    ctx.fillStyle = statusColor;
    ctx.font = `bold ${Math.floor(baseFontSize * 0.75)}px monospace`;
    ctx.fillText(`SYSTEM STATUS: ${stats.systemStatus}`, Math.floor(20 * scale), statusY + statusHeight / 2);

    ctx.fillStyle = '#555';
    ctx.font = `bold ${Math.floor(baseFontSize * 0.65)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('REDACTED // SECURE FEED', canvas.width - Math.floor(20 * scale), statusY + statusHeight / 2);

    // Reset to default
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    setFrameCount(prev => prev + 1);
    animationRef.current = requestAnimationFrame(drawMLOutput);
  };

  const startAnalysis = () => {
    if (!videoUrl) return;
    setIsAnalyzing(true);
    setFrameCount(0);
    setDetections([]);
    setViolations([]);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play();
        drawMLOutput();
      }
    }, 100);
  };

  const handleVideoEnd = () => {
    setIsAnalyzing(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setShowModal(true);
  };

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [videoUrl]);

  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Municipal Video Ingestion</h2>
          <p className="text-gray-500 text-sm mt-1">Deep neural inspection for archived municipal records</p>
        </div>
        <div className="bg-charcoal px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
          <Cpu size={16} className="text-electricTeal" />
          <span className="text-xs font-mono font-bold">RTX 4090 v2 • 88% LOAD</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-charcoal p-10 rounded-[2.5rem] border border-white/5 shadow-xl">
            <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-electricTeal/40 transition-colors cursor-pointer group bg-obsidian/20" onClick={openFilePicker}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".mp4,.mkv,.ts,.avi,.mov"
                className="hidden"
              />
              <UploadIcon className="mx-auto text-gray-500 group-hover:text-electricTeal mb-6" size={56} />
              <h4 className="text-xl font-bold mb-2">{selectedFile ? selectedFile.name : 'Upload Surveillance Master Feed'}</h4>
              <p className="text-sm text-gray-500 mb-8">{selectedFile ? `File size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Supports RAW .mp4, .mkv, .ts (Government Encrypted)'}</p>
              <button className="px-10 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-black uppercase tracking-widest border border-white/10 transition-all">Select System Source</button>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Metadata Origin</label>
                <select className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-4 text-sm font-bold focus:border-electricTeal outline-none transition-all">
                  <option>CAM-001 (Downtown - Intersection A)</option>
                  <option>CAM-002 (Expressway Zone B)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={startAnalysis}
                  disabled={!selectedFile || isAnalyzing}
                  className="w-full h-[58px] bg-electricTeal text-obsidian font-black uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(0,232,255,0.3)] disabled:opacity-50 transition-all hover:scale-[1.02]"
                >
                  {isAnalyzing ? 'Processing...' : 'Initiate Intel Probe'}
                </button>
              </div>
            </div>
          </div>

          {/* NEW: Processing Loader */}
          {isProcessing && (
            <div className="bg-charcoal p-10 rounded-[2.5rem] border border-electricTeal/40 shadow-xl">
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-24 h-24 border-8 border-electricTeal/20 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-24 h-24 border-8 border-electricTeal border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold mt-8 text-electricTeal">Processing with ML Detection...</h3>
                <p className="text-gray-400 mt-2">Applying YOLO object detection, tracking, and violation analysis</p>
                <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-electricTeal rounded-full animate-pulse"></div>
                    <span>Detection Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-biolumeGreen rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span>Heatmap Generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amberEmber rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span>Violation Analysis</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isAnalyzing && videoUrl && (
            <div className="fixed inset-0 z-50 bg-obsidian flex items-center justify-center p-4">
              <div className="relative w-full h-full bg-obsidian rounded-3xl overflow-hidden border-2 border-electricTeal/40 shadow-[0_0_80px_rgba(0,232,255,0.5)]">
                {/* FIXED: Show processed video directly - it already has ML detection baked in */}
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onEnded={handleVideoEnd}
                  autoPlay
                  muted
                  controls
                />

                {/* Processing Info - Bottom Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-obsidian/95 backdrop-blur-xl border-t border-electricTeal/30 px-8 py-4">
                  <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-electricTeal animate-pulse shadow-[0_0_10px_#00E8FF]" />
                        <span className="font-mono text-sm text-gray-300 font-bold">Neural Processing Active</span>
                      </div>
                      <div className="h-6 w-px bg-white/20" />
                      <span className="font-mono text-sm text-gray-400">Frame: <span className="text-electricTeal font-black text-lg">{frameCount}</span></span>
                      <div className="h-6 w-px bg-white/20" />
                      <span className="font-mono text-sm text-gray-400">FPS: <span className="text-biolumeGreen font-black text-lg">{stats.fps}</span></span>
                      <div className="h-6 w-px bg-white/20" />
                      <span className="font-mono text-sm text-gray-400">Vehicles: <span className="text-white font-black text-lg">{stats.vehicles}</span></span>
                      <div className="h-6 w-px bg-white/20" />
                      <span className="font-mono text-sm text-gray-400">Violations: <span className="text-red-500 font-black text-lg">{stats.violations}</span></span>
                    </div>
                    <button
                      onClick={() => {
                        setIsAnalyzing(false);
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
                        if (videoRef.current) videoRef.current.pause();
                      }}
                      className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-sm font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all"
                    >
                      Stop Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-charcoal p-8 rounded-[2.5rem] border border-white/5 h-fit shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Fingerprint size={20} className="text-electricTeal" /> Chain of Custody</h3>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 bg-obsidian/40 rounded-2xl border border-white/5 flex gap-4 items-center hover:bg-obsidian/80 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black text-gray-500 border border-white/5 group-hover:text-electricTeal group-hover:border-electricTeal transition-all">#{102 + i}</div>
                <div>
                  <div className="text-sm font-bold group-hover:text-white transition-colors">Node Archive {4210 + i}</div>
                  <div className="text-[9px] text-biolumeGreen uppercase font-black tracking-widest flex items-center gap-1">
                    <CheckCircle size={10} /> Authenticated Hash
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white transition-all">Historical Audits</button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-obsidian/95 backdrop-blur-md p-8 animate-in fade-in duration-300">
          <div className={`relative max-w-5xl w-full bg-charcoal rounded-3xl border-2 ${ANALYSIS_STEPS[activeStep].color} ${ANALYSIS_STEPS[activeStep].glow} transition-all duration-500 ease-out`}>
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-all duration-300 p-2 bg-white/5 hover:bg-white/10 rounded-full z-10"><X size={20} /></button>
            <div className="px-12 py-8">
              <div key={activeStep} className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex gap-8 items-center mb-8">
                  <div className={`w-24 h-24 bg-obsidian rounded-2xl flex items-center justify-center border-2 ${ANALYSIS_STEPS[activeStep].color} shrink-0 transition-all duration-500`}>
                    {React.cloneElement(ANALYSIS_STEPS[activeStep].icon as React.ReactElement<any>, { size: 42 })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{ANALYSIS_STEPS[activeStep].title}</h3>
                      <span className="text-xs font-mono font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-gray-500">{ANALYSIS_STEPS[activeStep].meta.stats.audit}</span>
                    </div>
                    <p className="text-gray-400 text-base leading-relaxed">{ANALYSIS_STEPS[activeStep].content}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-obsidian/60 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300">
                    <div className="text-xs text-gray-500 uppercase font-black mb-1 flex items-center gap-1.5"><Cpu size={14} /> AI Engine</div>
                    <div className="text-base font-bold text-electricTeal truncate">{ANALYSIS_STEPS[activeStep].meta.model}</div>
                  </div>
                  <div className="bg-obsidian/60 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300">
                    <div className="text-xs text-gray-500 uppercase font-black mb-1 flex items-center gap-1.5"><Shield size={14} /> Confidence</div>
                    <div className="text-base font-bold text-biolumeGreen">{(parseFloat(ANALYSIS_STEPS[activeStep].meta.confidence) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-obsidian/60 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300">
                    <div className="text-xs text-gray-500 uppercase font-black mb-1 flex items-center gap-1.5"><Database size={14} /> VRAM Load</div>
                    <div className="text-base font-bold text-amberEmber">{ANALYSIS_STEPS[activeStep].meta.stats.vram}</div>
                  </div>
                  <div className="bg-obsidian/60 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300">
                    <div className="text-xs text-gray-500 uppercase font-black mb-1 flex items-center gap-1.5"><FileVideo size={14} /> Res. Source</div>
                    <div className="text-base font-bold text-white">{ANALYSIS_STEPS[activeStep].meta.stats.resolution}</div>
                  </div>
                </div>

                <div className="bg-obsidian/60 rounded-2xl p-6 border border-white/5 mb-6">
                  <h4 className="text-xs font-black uppercase text-gray-500 tracking-[0.15em] mb-4">Aggregated Temporal Data</h4>
                  <div className="grid grid-cols-3 gap-8 mb-5">
                    <div>
                      <div className="text-4xl font-black text-white">{ANALYSIS_STEPS[activeStep].meta.stats.total}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold mt-1">Detections</div>
                    </div>
                    <div>
                      <div className="text-4xl font-black text-neonCrimson">{ANALYSIS_STEPS[activeStep].meta.stats.peak}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold mt-1">Peak Rate</div>
                    </div>
                    <div>
                      <div className="text-4xl font-black text-electricTeal">{ANALYSIS_STEPS[activeStep].meta.fps}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold mt-1">Process FPS</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                    {ANALYSIS_STEPS[activeStep].meta.objects.map(obj => (
                      <span key={obj} className="px-4 py-1.5 bg-white/5 rounded-lg text-sm font-bold text-gray-400 border border-white/5 flex items-center gap-2 hover:bg-white/10 transition-all duration-300">
                        <div className="w-2 h-2 rounded-full bg-electricTeal" /> {obj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  {ANALYSIS_STEPS.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${i === activeStep ? `w-12 bg-gradient-to-r from-white to-gray-400 ${step.glow}` : 'w-5 bg-white/10 hover:bg-white/20'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-300">Exit</button>
                  <button onClick={() => setActiveStep(prev => (prev + 1) % ANALYSIS_STEPS.length)} className="px-6 py-2.5 bg-gradient-to-r from-electricTeal to-cyan-400 text-obsidian rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:scale-105 transition-all duration-300 shadow-lg shadow-electricTeal/30">Next <ChevronRight size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
