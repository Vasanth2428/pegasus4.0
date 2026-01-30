
import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Marker, useMap } from 'react-leaflet';
import { TrendingUp, AlertTriangle, Car, Shield, Users, Zap, ChevronDown, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type CategoryType = 'traffic_monitoring' | 'traffic_violation' | 'public_safety';
type VisualizationType = 'wave' | 'pin' | 'circle' | 'area';

interface IncidentMarker {
    id: string;
    lat?: number;
    lng?: number;
    area?: [number, number][];
    type: string;
    color: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    visualization: VisualizationType;
}

// Custom pin icon
const createPinIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-pin-marker',
        html: `
            <div style="position: relative;">
                <svg width="32" height="40" viewBox="0 0 32 40" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
                    <path d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z" fill="${color}" stroke="#fff" stroke-width="2"/>
                    <circle cx="16" cy="12" r="4" fill="#fff"/>
                </svg>
            </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
    });
};

// Mock Data with updated visualization types
const MOCK_INCIDENTS: Record<CategoryType, IncidentMarker[]> = {
    traffic_monitoring: [
        { id: 'TM1', lat: 12.9750, lng: 77.5960, type: 'Accident Prone Zone', color: '#EF4444', description: 'High-frequency collision area - MG Road Junction', severity: 'high', visualization: 'wave' },
        { id: 'TM2', lat: 12.9352, lng: 77.6245, type: 'Recent Accident', color: '#FF6B6B', description: 'Vehicle collision reported 2 hours ago', severity: 'high', visualization: 'pin' },
        { id: 'TM3', lat: 12.9784, lng: 77.6408, type: 'Accident Prone Zone', color: '#EF4444', description: 'Sharp curve with poor visibility', severity: 'high', visualization: 'wave' },
        { id: 'TM4', lat: 12.9698, lng: 77.7500, type: 'Recent Accident', color: '#FF6B6B', description: 'Motorcycle accident - minor injuries', severity: 'medium', visualization: 'pin' },
        { id: 'TM5', lat: 12.8459, lng: 77.6602, type: 'Accident Prone Zone', color: '#EF4444', description: 'Pedestrian crossing hazard zone', severity: 'high', visualization: 'wave' },
        { id: 'TM6', lat: 12.9567, lng: 77.7013, type: 'Recent Accident', color: '#FF6B6B', description: 'Chain collision - 3 vehicles involved', severity: 'high', visualization: 'pin' },
    ],
    traffic_violation: [
        {
            id: 'TV1',
            area: [
                [12.9700, 77.5830],
                [12.9750, 77.5900],
                [12.9800, 77.6050],
                [12.9750, 77.6100],
                [12.9680, 77.5950],
            ],
            type: 'No Helmet Zone',
            color: '#EF4444',
            description: 'Helmet violation hotspot - MG Road corridor',
            severity: 'high',
            visualization: 'area'
        },
        {
            id: 'TV2',
            area: [
                [12.9540, 77.6030],
                [12.9600, 77.6100],
                [12.9750, 77.6250],
                [12.9700, 77.6300],
                [12.9580, 77.6150],
            ],
            type: 'Overspeed Zone',
            color: '#F97316',
            description: 'Speed limit violations - 60km/h zone',
            severity: 'medium',
            visualization: 'area'
        },
        {
            id: 'TV3',
            area: [
                [12.9770, 77.6390],
                [12.9820, 77.6440],
                [12.9900, 77.6520],
                [12.9860, 77.6580],
                [12.9750, 77.6480],
            ],
            type: 'Signal Crossing Zone',
            color: '#3B82F6',
            description: 'Red light jumping detected frequently',
            severity: 'medium',
            visualization: 'area'
        },
        {
            id: 'TV4',
            area: [
                [12.9380, 77.7080],
                [12.9450, 77.7150],
                [12.9600, 77.7320],
                [12.9550, 77.7370],
                [12.9400, 77.7200],
            ],
            type: 'No Helmet Zone',
            color: '#EF4444',
            description: 'Two-wheeler zone - low compliance',
            severity: 'high',
            visualization: 'area'
        },
    ],
    public_safety: [
        { id: 'PS1', lat: 12.9767, lng: 77.5713, type: 'Crowd Zone', color: '#A855F7', description: 'Majestic Bus Stand - high crowd density', severity: 'high', visualization: 'wave' },
        { id: 'PS2', lat: 12.9850, lng: 77.5946, type: 'Theft Prone', color: '#EC4899', description: 'Commercial area - pickpocketing reports', severity: 'high', visualization: 'circle' },
        {
            id: 'PS3',
            area: [
                [12.9240, 77.6230],
                [12.9300, 77.6300],
                [12.9460, 77.6460],
                [12.9420, 77.6520],
                [12.9250, 77.6350],
            ],
            type: 'Wrong Route',
            color: '#6366F1',
            description: 'One-way violation zone',
            severity: 'medium',
            visualization: 'area'
        },
        { id: 'PS4', lat: 12.9584, lng: 77.6108, type: 'Crowd Zone', color: '#A855F7', description: 'Metro station exit - peak hours', severity: 'medium', visualization: 'wave' },
        { id: 'PS5', lat: 12.9698, lng: 77.7100, type: 'Theft Prone', color: '#EC4899', description: 'Tech park area - vehicle theft alerts', severity: 'high', visualization: 'circle' },
        {
            id: 'PS6',
            area: [
                [12.8540, 77.6380],
                [12.8600, 77.6450],
                [12.8770, 77.6620],
                [12.8720, 77.6680],
                [12.8560, 77.6530],
            ],
            type: 'Wrong Route',
            color: '#6366F1',
            description: 'Restricted zone - unauthorized entry',
            severity: 'low',
            visualization: 'area'
        },
    ],
};

const CATEGORY_CONFIG: Record<CategoryType, { name: string; icon: React.ReactNode; description: string; legend: { color: string; label: string; visual: string }[] }> = {
    traffic_monitoring: {
        name: 'Traffic Monitoring',
        icon: <Car size={20} />,
        description: 'Accident-prone areas and recent incident locations',
        legend: [
            { color: '#EF4444', label: 'Accident Prone Zone', visual: 'Radiating Waves' },
            { color: '#FF6B6B', label: 'Recent Accident', visual: 'Pin Marker' },
        ],
    },
    traffic_violation: {
        name: 'Traffic Violation',
        icon: <AlertTriangle size={20} />,
        description: 'Violation hotspots by type',
        legend: [
            { color: '#EF4444', label: 'No Helmet Zone', visual: 'Radiating Area' },
            { color: '#F97316', label: 'Overspeed Zone', visual: 'Radiating Area' },
            { color: '#3B82F6', label: 'Signal Crossing Zone', visual: 'Radiating Area' },
        ],
    },
    public_safety: {
        name: 'Public Safety',
        icon: <Shield size={20} />,
        description: 'Crowd zones, theft-prone areas, and route violations',
        legend: [
            { color: '#A855F7', label: 'Crowd Zone', visual: 'Radiating Waves' },
            { color: '#EC4899', label: 'Theft Prone', visual: 'Circle Marker' },
            { color: '#6366F1', label: 'Wrong Route', visual: 'Radiating Area' },
        ],
    },
};

// Animated wave component
const AnimatedWave: React.FC<{ center: [number, number]; color: string; size: number }> = ({ center, color, size }) => {
    return (
        <>
            <CircleMarker
                center={center}
                radius={size}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.3,
                    weight: 2,
                }}
                className="animate-ping-slow"
            />
            <CircleMarker
                center={center}
                radius={size * 0.7}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5,
                    weight: 2,
                }}
            />
            <CircleMarker
                center={center}
                radius={size * 0.4}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 3,
                }}
            />
        </>
    );
};

// Radiating Area component
const RadiatingArea: React.FC<{ area: [number, number][]; color: string }> = ({ area, color }) => {
    return (
        <>
            {/* Outer radiating layer */}
            <Polygon
                positions={area}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    weight: 2,
                    opacity: 0.6,
                }}
                className="animate-pulse-area"
            />
            {/* Middle layer */}
            <Polygon
                positions={area}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.25,
                    weight: 1,
                    opacity: 0.8,
                }}
            />
            {/* Core layer */}
            <Polygon
                positions={area}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.4,
                    weight: 0,
                }}
                className="animate-pulse-area-slow"
            />
        </>
    );
};

// Map controller for setting view
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    React.useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const IncidentForecasting: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<CategoryType>('traffic_monitoring');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const currentConfig = CATEGORY_CONFIG[selectedCategory];
    const currentIncidents = MOCK_INCIDENTS[selectedCategory];

    const handleCategoryChange = (category: CategoryType) => {
        setSelectedCategory(category);
        setIsDropdownOpen(false);
    };

    // Calculate center for area-based incidents
    const getAreaCenter = (area: [number, number][]): [number, number] => {
        const lats = area.map(p => p[0]);
        const lngs = area.map(p => p[1]);
        return [
            lats.reduce((a, b) => a + b, 0) / lats.length,
            lngs.reduce((a, b) => a + b, 0) / lngs.length
        ];
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-700">
            {/* Add animation CSS */}
            <style>{`
                @keyframes ping-slow {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.5); opacity: 0.3; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .animate-ping-slow {
                    animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                @keyframes pulse-area {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                }
                @keyframes pulse-area-slow {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.6; }
                }
                .animate-pulse-area {
                    animation: pulse-area 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animate-pulse-area-slow {
                    animation: pulse-area-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            {/* Header */}
            <header className="flex justify-between items-end mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-electricTeal/10 border border-electricTeal/20 text-[8px] font-black text-electricTeal uppercase tracking-widest">CogniCam Intel</span>
                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em]">Predictive Analysis Module</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight uppercase italic text-white leading-none">
                        Incident <span className="text-electricTeal">Forecasting</span>
                    </h2>
                    <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">
                        Real-time Hotspot Visualization • Sector Intelligence Grid
                    </p>
                </div>

                {/* Category Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="bg-charcoal px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl hover:border-electricTeal/30 transition-all group min-w-[280px]"
                    >
                        <div className="w-10 h-10 rounded-xl bg-electricTeal/10 flex items-center justify-center text-electricTeal">
                            {currentConfig.icon}
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Analysis Mode</div>
                            <div className="font-black uppercase text-sm text-white tracking-widest">{currentConfig.name}</div>
                        </div>
                        <ChevronDown size={18} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-charcoal border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[1000]">
                            {(Object.keys(CATEGORY_CONFIG) as CategoryType[]).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategoryChange(cat)}
                                    className={`w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-all ${selectedCategory === cat ? 'bg-electricTeal/10 border-l-2 border-electricTeal' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedCategory === cat ? 'bg-electricTeal/20 text-electricTeal' : 'bg-white/5 text-gray-500'}`}>
                                        {CATEGORY_CONFIG[cat].icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-black uppercase text-white tracking-widest">{CATEGORY_CONFIG[cat].name}</div>
                                        <div className="text-[9px] text-gray-500 font-medium">{CATEGORY_CONFIG[cat].description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Map Container */}
            <div className="flex-1 relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                <MapContainer
                    center={[12.9716, 77.5946]}
                    zoom={12}
                    className="h-full w-full"
                    style={{ background: '#0D1117' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    <MapController center={[12.9716, 77.5946]} zoom={12} />

                    {currentIncidents.map((incident) => {
                        // Render based on visualization type
                        if (incident.visualization === 'wave' && incident.lat && incident.lng) {
                            return (
                                <React.Fragment key={incident.id}>
                                    <AnimatedWave
                                        center={[incident.lat, incident.lng]}
                                        color={incident.color}
                                        size={incident.severity === 'high' ? 18 : 12}
                                    />
                                    <Popup position={[incident.lat, incident.lng]}>
                                        <div className="p-2">
                                            <div className="font-bold text-sm mb-1" style={{ color: incident.color }}>{incident.type}</div>
                                            <div className="text-xs text-gray-600">{incident.description}</div>
                                            <div className="text-[10px] text-gray-400 mt-2 uppercase">Severity: {incident.severity}</div>
                                        </div>
                                    </Popup>
                                </React.Fragment>
                            );
                        } else if (incident.visualization === 'pin' && incident.lat && incident.lng) {
                            return (
                                <Marker
                                    key={incident.id}
                                    position={[incident.lat, incident.lng]}
                                    icon={createPinIcon(incident.color)}
                                >
                                    <Popup>
                                        <div className="p-2">
                                            <div className="font-bold text-sm mb-1" style={{ color: incident.color }}>{incident.type}</div>
                                            <div className="text-xs text-gray-600">{incident.description}</div>
                                            <div className="text-[10px] text-gray-400 mt-2 uppercase">Severity: {incident.severity}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        } else if (incident.visualization === 'area' && incident.area) {
                            const center = getAreaCenter(incident.area);
                            return (
                                <React.Fragment key={incident.id}>
                                    <RadiatingArea area={incident.area} color={incident.color} />
                                    <Popup position={center}>
                                        <div className="p-2">
                                            <div className="font-bold text-sm mb-1" style={{ color: incident.color }}>{incident.type}</div>
                                            <div className="text-xs text-gray-600">{incident.description}</div>
                                            <div className="text-[10px] text-gray-400 mt-2 uppercase">Severity: {incident.severity}</div>
                                        </div>
                                    </Popup>
                                </React.Fragment>
                            );
                        } else if (incident.visualization === 'circle' && incident.lat && incident.lng) {
                            return (
                                <CircleMarker
                                    key={incident.id}
                                    center={[incident.lat, incident.lng]}
                                    radius={incident.severity === 'high' ? 14 : incident.severity === 'medium' ? 10 : 7}
                                    pathOptions={{
                                        color: incident.color,
                                        fillColor: incident.color,
                                        fillOpacity: 0.6,
                                        weight: 2,
                                    }}
                                >
                                    <Popup>
                                        <div className="p-2">
                                            <div className="font-bold text-sm mb-1" style={{ color: incident.color }}>{incident.type}</div>
                                            <div className="text-xs text-gray-600">{incident.description}</div>
                                            <div className="text-[10px] text-gray-400 mt-2 uppercase">Severity: {incident.severity}</div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        }
                        return null;
                    })}
                </MapContainer>

                {/* Legend Panel */}
                <div className="absolute bottom-6 left-6 bg-obsidian/90 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl z-[500] max-w-[280px]">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={14} className="text-electricTeal" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Legend</span>
                    </div>
                    <div className="space-y-3">
                        {currentConfig.legend.map((item) => (
                            <div key={item.label} className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}50` }} />
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="text-[8px] text-gray-500 ml-7 italic">{item.visual}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Panel */}
                <div className="absolute top-6 right-6 bg-obsidian/90 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl z-[500]">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap size={14} className="text-biolumeGreen" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Stats</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center gap-8">
                            <span className="text-[9px] text-gray-500 font-bold uppercase">Active Hotspots</span>
                            <span className="text-lg font-black text-white">{currentIncidents.length}</span>
                        </div>
                        <div className="flex justify-between items-center gap-8">
                            <span className="text-[9px] text-gray-500 font-bold uppercase">High Severity</span>
                            <span className="text-lg font-black text-red-500">{currentIncidents.filter(i => i.severity === 'high').length}</span>
                        </div>
                        <div className="flex justify-between items-center gap-8">
                            <span className="text-[9px] text-gray-500 font-bold uppercase">Coverage</span>
                            <span className="text-lg font-black text-biolumeGreen">98%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncidentForecasting;
