
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, CheckCircle, Clock, AlertTriangle, Send, Navigation, Camera, Settings, X, ShieldAlert, Hammer } from 'lucide-react';
import { OfficialTask } from '../types';

interface OfficialRequestsProps {
    tasks: OfficialTask[];
    onComplete: (taskId: string) => void;
}

interface EmergencyAlert {
    id: string;
    type: 'accident' | 'fire' | 'medical';
    location: { lat: number; lng: number };
    address: string;
    description: string;
}

const MOCK_EMERGENCIES: EmergencyAlert[] = [
    {
        id: 'EMG-101',
        type: 'accident',
        location: { lat: 12.9850, lng: 77.6050 },
        address: 'MG Road Junction, Bangalore',
        description: 'Multi-vehicle collision reported by AI Node 42'
    },
    {
        id: 'EMG-102',
        type: 'accident',
        location: { lat: 12.9340, lng: 77.6101 },
        address: 'Koramangala 5th Block',
        description: 'Pedestrian incident at intersection'
    },
    {
        id: 'EMG-103',
        type: 'fire',
        location: { lat: 12.9500, lng: 77.5800 },
        address: 'Lalbagh West Gate',
        description: 'Electrical fire detected in local substation'
    }
];

const MOCK_MAINTENANCE: OfficialTask[] = [
    {
        id: 'MNT-402',
        cameraId: 'CAM-402',
        cameraName: 'Indiranagar 100ft Rd Node',
        location: { lat: 12.9719, lng: 77.6412 },
        type: 'repair',
        status: 'pending',
        assignedAt: 'Today, 10:15 AM'
    },
    {
        id: 'MNT-415',
        cameraId: 'CAM-415',
        cameraName: 'Whitefield Main St Crossing',
        location: { lat: 12.9698, lng: 77.7499 },
        type: 'repair',
        status: 'pending',
        assignedAt: 'Today, 11:30 AM'
    }
];

// Custom Marker for Official Map (Yellow for Maintenance)
const createOfficialIcon = (status: 'pending' | 'completed') => {
    const color = status === 'pending' ? '#FFD700' : '#00FF85'; // Bright Gold/Yellow for maintenance
    return L.divIcon({
        className: 'custom-official-marker',
        html: `<div style="
      width: 32px;
      height: 32px;
      background: ${color};
      border: 3px solid #000;
      border-radius: 50%;
      box-shadow: 0 0 15px ${color === '#FFD700' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0, 255, 133, 0.4)'};
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
};

const createEmergencyIcon = (type: string) => {
    return L.divIcon({
        className: 'custom-emergency-marker',
        html: `<div style="
      width: 40px;
      height: 40px;
      background: #EF4444;
      border: 4px solid #000;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1.5s infinite;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      </style>
    </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom, { animate: true });
    }, [center, zoom, map]);
    return null;
};

const OfficialRequests: React.FC<OfficialRequestsProps> = ({ tasks: externalTasks, onComplete }) => {
    const [maintenanceTasks, setMaintenanceTasks] = useState<OfficialTask[]>(MOCK_MAINTENANCE);
    const [selectedTask, setSelectedTask] = useState<OfficialTask | null>(MOCK_MAINTENANCE[0]);
    const [emergencies, setEmergencies] = useState<EmergencyAlert[]>(MOCK_EMERGENCIES);
    const [activeEmergency, setActiveEmergency] = useState<EmergencyAlert | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
    const [showDoneAnimation, setShowDoneAnimation] = useState(false);
    const [missionAccepted, setMissionAccepted] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    // Merge external and mock tasks for display
    const allTasks = [...maintenanceTasks, ...externalTasks];

    useEffect(() => {
        if (activeEmergency) {
            setMapCenter([activeEmergency.location.lat, activeEmergency.location.lng]);
        } else if (selectedTask) {
            setMapCenter([selectedTask.location.lat, selectedTask.location.lng]);
        }
    }, [selectedTask, activeEmergency]);

    const handleComplete = (id: string) => {
        setShowDoneAnimation(true);
        setTimeout(() => {
            // Check if it's an external task
            if (externalTasks.find(t => t.id === id)) {
                onComplete(id);
            } else {
                setMaintenanceTasks(prev => prev.filter(t => t.id !== id));
            }

            setShowDoneAnimation(false);
            const remainingNoneEmerg = allTasks.filter(t => t.id !== id);
            if (remainingNoneEmerg.length > 0) {
                setSelectedTask(remainingNoneEmerg[0]);
            } else {
                setSelectedTask(null);
            }
        }, 2000);
    };

    const handleAcceptEmergency = () => {
        if (!activeEmergency) return;
        setMissionAccepted(true);
    };

    const handleMissionSuccess = () => {
        if (!activeEmergency) return;
        const currentId = activeEmergency.id;
        setShowSuccessPopup(true);
        setTimeout(() => {
            const remaining = emergencies.filter(e => e.id !== currentId);
            setEmergencies(remaining);
            if (remaining.length > 0) {
                setActiveEmergency(remaining[0]);
            } else {
                setActiveEmergency(null);
            }
            setShowSuccessPopup(false);
            setMissionAccepted(false);
        }, 2500);
    };

    const handleMissionFailure = () => {
        if (!activeEmergency) return;
        const currentId = activeEmergency.id;
        const remaining = emergencies.filter(e => e.id !== currentId);
        setEmergencies(remaining);
        if (remaining.length > 0) {
            setActiveEmergency(remaining[0]);
        } else {
            setActiveEmergency(null);
        }
        setMissionAccepted(false);
    };

    const handleRejectEmergency = () => {
        setActiveEmergency(null);
    };

    return (
        <div className="space-y-6 pb-12">
            {showDoneAnimation && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-obsidian/80 backdrop-blur-md">
                    <div className="text-center animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 bg-biolumeGreen/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-biolumeGreen shadow-[0_0_50px_rgba(0,255,133,0.3)]">
                            <CheckCircle size={56} className="text-biolumeGreen" />
                        </div>
                        <h3 className="text-4xl font-black uppercase text-biolumeGreen italic tracking-tighter">Command Ack!</h3>
                        <p className="text-gray-400 mt-2 font-black uppercase tracking-widest text-xs">Unit Dispatched • System Updated</p>
                    </div>
                </div>
            )}

            {showSuccessPopup && (
                <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-obsidian/90 backdrop-blur-xl">
                    <div className="bg-emerald-950/40 border-2 border-biolumeGreen p-12 rounded-[4rem] text-center shadow-[0_0_80px_rgba(0,255,133,0.2)] animate-in zoom-in-90 duration-500">
                        <div className="w-20 h-20 bg-biolumeGreen rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(0,255,133,0.5)]">
                            <CheckCircle size={48} className="text-obsidian" />
                        </div>
                        <h3 className="text-5xl font-black uppercase text-white tracking-tighter italic mb-4">Successfully Completed</h3>
                        <p className="text-biolumeGreen/80 font-black uppercase tracking-[0.3em] text-[10px]">Mission Closure Protocol Finalized</p>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tight uppercase italic text-white">Field <span className="text-goldPrimary">Operations</span></h2>
                    <p className="text-gray-500 font-medium mt-1 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <Navigation size={14} className="text-goldPrimary animate-pulse" /> CogniCam Intelligence Response Grid
                    </p>
                </div>
                <div className="bg-charcoal px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
                    <div className="text-right border-r border-white/10 pr-4">
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Duty</div>
                        <div className="text-xs font-black text-biolumeGreen uppercase">Sector-Linked</div>
                    </div>
                    <Settings size={20} className="text-gray-500 hover:text-white transition-colors cursor-pointer" />
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Side Panels */}
                <div className="col-span-4 space-y-4">
                    {/* Emergency Alerts Section */}
                    <div className="bg-red-500/10 rounded-[2.5rem] border border-red-500/20 overflow-hidden shadow-2xl flex flex-col max-h-[300px]">
                        <div className="p-6 border-b border-red-500/20 bg-red-500/5 flex justify-between items-center">
                            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-red-500">
                                <ShieldAlert size={16} /> EMERGENCY ALERTS
                            </h3>
                            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">{emergencies.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {emergencies.map(emg => (
                                <button
                                    key={emg.id}
                                    onClick={() => { setActiveEmergency(emg); setSelectedTask(null); }}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${activeEmergency?.id === emg.id ? 'bg-red-500/20 border-red-500 shadow-lg' : 'bg-obsidian/40 border-white/5 hover:border-red-500/30'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">{emg.type} Hazard</span>
                                        <span className="text-[9px] font-mono text-gray-500">{emg.id}</span>
                                    </div>
                                    <div className="text-sm font-black uppercase tracking-tight text-white">{emg.address}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Maintenance Section */}
                    <div className="bg-charcoal rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-[400px]">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} className="text-goldPrimary" /> Maintenance
                            </h3>
                            <span className="text-[10px] bg-goldPrimary text-obsidian px-2 py-0.5 rounded-full font-black">{allTasks.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {allTasks.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setActiveEmergency(null); }}
                                    className={`w-full text-left p-5 rounded-[2rem] border transition-all ${selectedTask?.id === task.id ? 'bg-goldPrimary/10 border-goldPrimary shadow-lg' : 'bg-obsidian/40 border-white/5 hover:bg-obsidian/60'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-black text-goldPrimary text-[10px] uppercase tracking-widest mb-1">{task.type} Protocols</div>
                                            <div className="font-black text-base tracking-tight uppercase text-white">{task.cameraId}</div>
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                            <Hammer size={16} className="text-goldPrimary" />
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium truncate uppercase">{task.cameraName}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Map & Interaction Control */}
                <div className="col-span-8 space-y-6">
                    <div className="h-[450px] bg-charcoal rounded-[3rem] border border-white/10 overflow-hidden relative shadow-2xl">
                        <MapContainer
                            center={mapCenter}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            <MapController center={mapCenter} zoom={15} />

                            {/* Maintenance Markers (Yellow) */}
                            {allTasks.map(task => (
                                <Marker
                                    key={task.id}
                                    position={[task.location.lat, task.location.lng]}
                                    icon={createOfficialIcon(task.status as any)}
                                    eventHandlers={{ click: () => { setSelectedTask(task); setActiveEmergency(null); } }}
                                >
                                    <Popup>
                                        <div className="p-3 min-w-[200px] font-sans">
                                            <div className="font-black text-xs text-gray-900 border-b pb-2 mb-2 uppercase tracking-wide">Infrastructure Node</div>
                                            <div className="text-[10px] font-bold text-gray-700 mb-1">{task.cameraId}: {task.cameraName}</div>
                                            <div className="text-[9px] text-goldPrimary font-black uppercase tracking-widest">Maintenance Required</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Emergency Markers (Red) */}
                            {emergencies.map(emg => (
                                <Marker
                                    key={emg.id}
                                    position={[emg.location.lat, emg.location.lng]}
                                    icon={createEmergencyIcon(emg.type)}
                                    eventHandlers={{ click: () => { setActiveEmergency(emg); setSelectedTask(null); } }}
                                >
                                    <Popup scrollWheelZoom={false}>
                                        <div className="p-4 min-w-[220px] font-sans">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                                <div className="font-black text-[10px] text-red-600 uppercase tracking-widest">CRITICAL {emg.type.toUpperCase()}</div>
                                            </div>
                                            <div className="font-black text-sm text-gray-900 mb-1 uppercase tracking-tight">{emg.address}</div>
                                            <div className="text-[10px] text-gray-500 font-medium mb-4 italic">"{emg.description}"</div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setActiveEmergency(null)}
                                                    className="flex-1 py-1.5 bg-gray-100 text-[9px] font-black uppercase rounded hover:bg-gray-200 transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                                <button
                                                    onClick={handleAcceptEmergency}
                                                    className="flex-1 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase rounded shadow-lg hover:bg-red-700 transition-colors"
                                                >
                                                    Accept Mission
                                                </button>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    {/* Universal Interaction HUD */}
                    <div className="min-h-[160px]">
                        {activeEmergency ? (
                            <div className="bg-red-500/10 p-8 rounded-[3rem] border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)] transition-all animate-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between gap-8">
                                    <div className="flex gap-6 items-center flex-1">
                                        <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center border-2 border-red-500 animate-pulse">
                                            <ShieldAlert className="text-red-500" size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-2xl font-black uppercase tracking-tight text-red-500 italic">Critical {activeEmergency.type}</h3>
                                                <span className="text-[10px] bg-red-500 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-widest">{activeEmergency.id}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 font-bold uppercase tracking-tight">{activeEmergency.address}</p>
                                            <p className="text-xs text-red-400/80 mt-1 italic font-medium leading-relaxed max-w-lg">{activeEmergency.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {missionAccepted ? (
                                            <>
                                                <button
                                                    onClick={handleMissionFailure}
                                                    className="px-10 py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black uppercase text-xs tracking-widest rounded-3xl border border-red-500/30 transition-all flex items-center gap-2"
                                                >
                                                    <X size={18} /> Mission Failure
                                                </button>
                                                <button
                                                    onClick={handleMissionSuccess}
                                                    className="px-10 py-5 bg-biolumeGreen text-obsidian font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-[0_0_40px_rgba(0,255,133,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                                                >
                                                    <CheckCircle size={18} /> Mission Success
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={handleRejectEmergency}
                                                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-3xl border border-white/10 transition-all flex items-center gap-2"
                                                >
                                                    <X size={18} /> Reject
                                                </button>
                                                <button
                                                    onClick={handleAcceptEmergency}
                                                    className="px-10 py-5 bg-red-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-3xl shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                                                >
                                                    <CheckCircle size={18} /> Accept Mission
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : selectedTask ? (
                            <div className="bg-gradient-to-br from-charcoal to-obsidian p-8 rounded-[3rem] border border-white/5 shadow-2xl animate-in slide-in-from-bottom-4 transition-all">
                                <div className="flex items-center justify-between gap-8">
                                    <div className="flex gap-6 items-center flex-1">
                                        <div className="w-16 h-16 bg-goldPrimary/10 rounded-3xl flex items-center justify-center border-2 border-goldPrimary shadow-[0_0_30px_rgba(255,215,0,0.1)]">
                                            <Hammer className="text-goldPrimary" size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-2xl font-black uppercase tracking-tight italic text-white">{selectedTask.cameraId} Dispatch</h3>
                                                <span className="text-[10px] bg-goldPrimary/10 border border-goldPrimary/30 px-2 py-0.5 rounded font-black text-goldPrimary uppercase tracking-widest">Maintenance</span>
                                            </div>
                                            <p className="text-sm text-gray-400 font-medium">Standard structural repair and sensor recalibration for {selectedTask.cameraName}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleComplete(selectedTask.id)}
                                        className="px-12 py-5 bg-biolumeGreen text-obsidian font-black uppercase tracking-[0.2em] rounded-[2rem] flex items-center gap-3 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,255,133,0.3)] transition-all"
                                    >
                                        Send Message Done <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-charcoal/30 h-[100px] rounded-[3rem] border border-white/5 border-dashed flex flex-col items-center justify-center text-center opacity-40">
                                <p className="font-black uppercase tracking-widest text-[10px]">Select entry point on map to begin deployment</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficialRequests;
