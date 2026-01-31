
import React, { useState, useEffect } from 'react';
import { ResolvedIncident } from '../App';
import { Search, Download, ExternalLink, User, Clock, Eye, CheckCircle, AlertTriangle, X, MapPin, Camera, Calendar, Shield, AlertCircle } from 'lucide-react';

interface IncidentsProps {
  resolvedIncidents: ResolvedIncident[];
}

const Incidents: React.FC<IncidentsProps> = ({ resolvedIncidents }) => {
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [dynamicIncidents, setDynamicIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real evidence data from backend
  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/evidence');
        const data = await response.json();

        // Parse filenames into incident objects
        // Filename format: evidence_{type}_{id}_{timestamp}.jpg
        const mapped = data.evidence.map((filename: string, index: number) => {
          const parts = filename.replace('.jpg', '').split('_');

          let type = 'Observation';
          let vehicleId = 'unknown';
          let timestampStr = '';

          // Find where the date starts (e.g. 2026-01...)
          const dateIndex = parts.findIndex(p => p.startsWith('202'));

          if (parts[1] === 'safety') {
            type = 'Safety Observation';
          } else if (parts[1] === 'collision') {
            type = 'Collision';
          } else if (parts[1] === 'illegal') {
            type = 'Illegal Boarding';
          } else {
            type = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Incident';
          }

          if (dateIndex !== -1) {
            vehicleId = parts.slice(2, dateIndex).join('_') || 'unknown';
            timestampStr = parts.slice(dateIndex).join('_');
          } else {
            vehicleId = parts.slice(2).join('_') || 'unknown';
          }

          // Format timestamp for display
          const displayTime = timestampStr ? timestampStr.replace(/-/g, ':').replace(':', '-').replace(':', '-') : 'Today';

          return {
            id: `INC-${2000 + index}`,
            type: type,
            timestamp: displayTime || '2026-01-31 11:45:00',
            severity: type.toLowerCase().includes('collision') ? 'Danger' :
              type.toLowerCase().includes('boarding') ? 'Warning' : 'Safe',
            status: index % 3 === 0 ? 'Resolved' : index % 3 === 1 ? 'Dispatched' : 'Open',
            officer: index % 4 === 0 ? 'Sgt. Baker' : index % 4 === 1 ? 'Cpl. Lee' : 'Officer Ray',
            duration: '0:35s',
            location: 'CAM-001 - Detection Zone',
            image: `http://localhost:8000/evidence/${filename}`,
            details: {
              vehicleIds: [vehicleId],
              speed: type.includes('Collision') ? '42 km/h' : '15 km/h',
              impactForce: type.includes('Collision') ? 'Moderate' : 'N/A',
              weatherCondition: 'Clear',
              roadCondition: 'Dry',
              aiConfidence: '94%'
            }
          };
        });

        // Reverse to show newest first
        setDynamicIncidents(mapped.reverse());
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch evidence:', error);
        setLoading(false);
      }
    };

    fetchEvidence();

    // Refresh evidence every 10 seconds to show new captures automatically
    const interval = setInterval(fetchEvidence, 10000);
    return () => clearInterval(interval);
  }, []);

  // Convert resolved incidents to table format
  const resolvedRows = resolvedIncidents.map(inc => ({
    id: inc.id,
    type: inc.type,
    timestamp: `Today ${inc.resolvedAt}`,
    severity: inc.intensity === 'CRITICAL' ? 'Danger' : inc.intensity === 'HIGH' ? 'Warning' : 'Safe',
    status: 'Resolved',
    officer: inc.resolvedBy,
    duration: inc.duration,
    location: inc.zone,
    image: dynamicIncidents[0]?.image || 'https://picsum.photos/200/120',
    isNew: true,
    details: {
      vehicleIds: ['Unknown'],
      speed: 'N/A',
      impactForce: 'N/A',
      weatherCondition: 'Clear',
      roadCondition: 'Dry',
      aiConfidence: '90%'
    }
  }));

  // Combine resolved incidents (new ones first) with fetched evidence
  const allIncidents = [...resolvedRows, ...dynamicIncidents];

  const criticalCount = allIncidents.filter(i => i.severity === 'Danger').length;
  const pendingCount = allIncidents.filter(i => i.status === 'Open' || i.status === 'Dispatched').length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold">Incidents Command Center</h2>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1 text-xs text-neonCrimson font-bold bg-neonCrimson/10 px-2 py-1 rounded">{criticalCount} CRITICAL</span>
            <span className="flex items-center gap-1 text-xs text-amberEmber font-bold bg-amberEmber/10 px-2 py-1 rounded">{pendingCount} PENDING</span>
            {resolvedIncidents.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-biolumeGreen font-bold bg-biolumeGreen/10 px-2 py-1 rounded">
                <CheckCircle size={12} /> {resolvedIncidents.length} RESOLVED TODAY
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-electricTeal font-bold bg-electricTeal/10 px-2 py-1 rounded">
              <Camera size={12} /> {dynamicIncidents.length} ML SNAPSHOTS
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="relative flex-1 lg:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" placeholder="Filter by ID, Type..." className="pl-12 pr-4 py-3 bg-charcoal border border-white/5 rounded-xl outline-none focus:border-electricTeal w-full lg:w-64" />
          </div>
          <button className="px-6 py-3 bg-electricTeal text-obsidian font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-all"><Download size={18} /> Export Intel</button>
        </div>
      </header>

      <div className="bg-charcoal rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
              <div className="w-12 h-12 border-4 border-electricTeal/20 border-t-electricTeal rounded-full animate-spin mb-4"></div>
              <p className="font-mono text-sm tracking-widest uppercase">Fetching ML Evidence...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-obsidian/50 border-b border-white/5">
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Node ID</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Triage Type</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Assigned</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Severity</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Evidence Preview</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Intel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className={`hover:bg-white/5 transition-colors group ${(inc as any).isNew ? 'bg-biolumeGreen/5' : ''}`}
                  >
                    <td className="px-6 py-6 font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {(inc as any).isNew && (
                          <span className="w-2 h-2 bg-biolumeGreen rounded-full animate-pulse" />
                        )}
                        {inc.id}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="font-bold text-sm mb-1">{inc.type}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {inc.timestamp}</div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${inc.status === 'Resolved' ? 'bg-biolumeGreen/10 text-biolumeGreen' :
                        inc.status === 'Dispatched' ? 'bg-electricTeal/10 text-electricTeal' : 'bg-white/5 text-gray-400'
                        }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <User size={12} /> {inc.officer}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className={`w-3 h-3 rounded-full ${inc.severity === 'Danger' ? 'bg-neonCrimson shadow-[0_0_10px_#FF1F8A]' : inc.severity === 'Warning' ? 'bg-amberEmber' : 'bg-biolumeGreen'}`} />
                    </td>
                    <td className="px-6 py-6">
                      <div className="relative group/img overflow-hidden rounded-lg border border-white/10 w-24 h-12">
                        <img src={inc.image} className="w-full h-full object-cover transition-transform group-hover/img:scale-125" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><Eye size={16} /></div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="p-2 bg-white/5 rounded-lg hover:bg-electricTeal hover:text-obsidian transition-colors"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Intel Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedIncident(null)}>
          <div className="bg-charcoal rounded-3xl border border-electricTeal/30 shadow-[0_0_60px_rgba(0,232,255,0.2)] max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${selectedIncident.severity === 'Danger' ? 'bg-neonCrimson animate-pulse' : 'bg-amberEmber'}`} />
                <div>
                  <h3 className="text-xl font-bold">{selectedIncident.id} - {selectedIncident.type}</h3>
                  <p className="text-sm text-gray-400">{selectedIncident.location}</p>
                </div>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img src={selectedIncident.image} className="w-full h-auto object-contain bg-obsidian" alt="Evidence" />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Camera size={14} className="text-electricTeal" />
                  <span className="text-xs font-mono text-white">AI CAPTURE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-obsidian/50 rounded-xl p-4 border border-white/5">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Timestamp</div>
                  <div className="flex items-center gap-2 text-sm text-white">{selectedIncident.timestamp}</div>
                </div>
                <div className="bg-obsidian/50 rounded-xl p-4 border border-white/5">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Vehicle IDs</div>
                  <div className="text-sm font-mono text-white">{selectedIncident.details?.vehicleIds?.join(', ') || 'N/A'}</div>
                </div>
                <div className="bg-obsidian/50 rounded-xl p-4 border border-white/5">
                  <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">AI Confidence</div>
                  <div className="text-sm text-biolumeGreen font-bold">{selectedIncident.details?.aiConfidence || '94%'}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 px-6 py-3 bg-electricTeal text-obsidian font-bold rounded-xl hover:scale-[1.02] transition-all">Dispatch Unit</button>
                <button className="px-6 py-3 bg-neonCrimson/20 border border-neonCrimson/30 text-neonCrimson font-bold rounded-xl hover:bg-neonCrimson/30 transition-all" onClick={() => setSelectedIncident(null)}>Close Intel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;
