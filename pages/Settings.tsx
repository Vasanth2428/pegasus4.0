
import React from 'react';
import { Settings, Cpu, Shield, Globe, Bell, Database, Save, LogOut } from 'lucide-react';

interface SettingsProps {
}

const SettingsPage: React.FC<SettingsProps> = () => {
   return (
      <div className="max-w-4xl mx-auto py-12">
         <div className="flex justify-between items-center mb-12">
            <div>
               <h2 className="text-3xl font-black uppercase italic tracking-tighter">System <span className="text-electricTeal">Settings</span></h2>
               <p className="text-gray-500 font-medium font-mono text-xs uppercase tracking-widest">Global configuration for CogniCam perception engines</p>
            </div>
            <button className="flex items-center gap-2 px-8 py-3 bg-electricTeal text-obsidian font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,232,255,0.3)]">
               <Save size={18} /> Deploy Changes
            </button>
         </div>

         <div className="space-y-8">
            {/* AI Model Config */}
            <section className="bg-charcoal p-8 rounded-3xl border border-white/5">
               <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-electricTeal uppercase tracking-tight italic"><Cpu size={24} /> AI Perception Engine</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <label className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Confidence Threshold (0.1 - 1.0)</label>
                     <input type="range" className="w-full accent-electricTeal h-1.5 bg-obsidian rounded-lg appearance-none cursor-pointer border border-white/5" />
                     <div className="flex justify-between text-[10px] font-mono text-gray-600 font-bold uppercase"><span>AGGRESSIVE (0.2)</span><span>STRICT (0.85)</span></div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Inference Device</label>
                     <select className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-electricTeal text-xs font-bold uppercase tracking-widest">
                        <option>GPU: NVIDIA RTX 4090 v1</option>
                        <option>NPU: Edge Core A-Series</option>
                     </select>
                  </div>
               </div>
            </section>

            {/* Agency Protocols */}
            <section className="bg-charcoal p-8 rounded-3xl border border-white/5">
               <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-red-500 uppercase tracking-tight italic"><Shield size={24} /> Security Protocols</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-obsidian/50 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                     <div>
                        <div className="font-black text-sm uppercase tracking-tight">Automated Dispatch</div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Trigger police response autonomously for Critical events</div>
                     </div>
                     <div className="w-12 h-6 bg-electricTeal rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(0,232,255,0.3)]">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                     </div>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-obsidian/50 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                     <div>
                        <div className="font-black text-sm uppercase tracking-tight">Biometric Masking</div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Apply real-time PII anonymization to public feeds</div>
                     </div>
                     <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-gray-600 rounded-full" />
                     </div>
                  </div>
               </div>
            </section>

            {/* Global Connection */}
            <section className="bg-charcoal p-8 rounded-3xl border border-white/5">
               <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-biolumeGreen uppercase tracking-tight italic"><Globe size={24} /> Infrastructure Link</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Mainframe Endpoint</label>
                     <input type="text" placeholder="https://api.cognicam.gov/v1" className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:border-electricTeal outline-none text-gray-300" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Encryption Key ID</label>
                     <input type="password" value="XXXXXXXXXXXXXXX" readOnly className="w-full bg-obsidian border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-gray-600" />
                  </div>
               </div>
            </section>

         </div>
      </div>
   );
};

export default SettingsPage;
