
import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, Zap, Globe } from 'lucide-react';
import { UserRole } from '../types';

interface LoginProps {
    onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [selectedRole, setSelectedRole] = useState<UserRole>(null);
    const [isHovered, setIsHovered] = useState<UserRole>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRole) {
            onLogin(selectedRole);
        }
    };

    return (
        <div className="min-h-screen bg-obsidian flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electricTeal/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-biolumeGreen/10 blur-[120px] rounded-full animate-pulse" />

            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-charcoal/40 backdrop-blur-2xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative z-10">

                {/* Left Side - Branding */}
                <div className="p-12 flex flex-col justify-between bg-gradient-to-br from-charcoal to-obsidian border-r border-white/5">
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-electricTeal/20 rounded-2xl flex items-center justify-center border border-electricTeal/30 shadow-[0_0_20px_rgba(0,232,255,0.2)]">
                                <Shield className="text-electricTeal" size={28} />
                            </div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white">Cogni<span className="text-electricTeal">Cam</span></h1>
                        </div>

                        <h2 className="text-5xl font-black leading-none uppercase mb-6 tracking-tight">
                            Integrated <br />
                            <span className="text-electricTeal text-shadow-glow">Vision</span> <br />
                            Intelligence
                        </h2>
                        <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-sm">
                            Securing municipal sectors with next-generation neural analysis and real-time intervention logic.
                        </p>
                    </div>

                    <div className="space-y-4 pt-12">
                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                            <div className="w-8 h-[1px] bg-white/10" /> Authorized Access Only
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono font-bold">
                                <Globe size={14} /> CLOUD.SERVER.SECURE
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono font-bold">
                                <Zap size={14} /> KERNEL.P4.V1
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="p-12 flex flex-col justify-center">
                    <div className="mb-10 text-center">
                        <h3 className="text-3xl font-black uppercase tracking-tight mb-2">Gate Identity</h3>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Select Access Protocol</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Role: Admin */}
                            <button
                                type="button"
                                onClick={() => setSelectedRole('admin')}
                                onMouseEnter={() => setIsHovered('admin')}
                                onMouseLeave={() => setIsHovered(null)}
                                className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-4 group ${selectedRole === 'admin'
                                    ? 'bg-electricTeal/5 border-electricTeal shadow-[0_0_30px_rgba(0,232,255,0.2)]'
                                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedRole === 'admin' || isHovered === 'admin' ? 'bg-electricTeal text-obsidian scale-110' : 'bg-charcoal text-gray-400 border border-white/5'
                                    }`}>
                                    <Shield size={28} />
                                </div>
                                <div className="text-center">
                                    <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${selectedRole === 'admin' ? 'text-electricTeal' : 'text-gray-500'
                                        }`}>Command</span>
                                    <span className="text-base font-black uppercase">Admin</span>
                                </div>
                            </button>

                            {/* Role: Official */}
                            <button
                                type="button"
                                onClick={() => setSelectedRole('official')}
                                onMouseEnter={() => setIsHovered('official')}
                                onMouseLeave={() => setIsHovered(null)}
                                className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-4 group ${selectedRole === 'official'
                                    ? 'bg-biolumeGreen/5 border-biolumeGreen shadow-[0_0_30px_rgba(0,255,133,0.2)]'
                                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedRole === 'official' || isHovered === 'official' ? 'bg-biolumeGreen text-obsidian scale-110' : 'bg-charcoal text-gray-400 border border-white/5'
                                    }`}>
                                    <User size={28} />
                                </div>
                                <div className="text-center">
                                    <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${selectedRole === 'official' ? 'text-biolumeGreen' : 'text-gray-500'
                                        }`}>Field Duty</span>
                                    <span className="text-base font-black uppercase">Official</span>
                                </div>
                            </button>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-electricTeal transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="AUTHORIZATION CODE"
                                    className="w-full bg-obsidian border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-mono font-bold uppercase tracking-widest focus:border-white/20 outline-none transition-all placeholder:text-gray-700"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedRole}
                                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all duration-500 ${selectedRole
                                    ? (selectedRole === 'admin' ? 'bg-electricTeal text-obsidian shadow-[0_0_30px_rgba(0,232,255,0.4)] hover:scale-[1.02]' : 'bg-biolumeGreen text-obsidian shadow-[0_0_30px_rgba(0,255,133,0.4)] hover:scale-[1.02]')
                                    : 'bg-white/5 text-gray-700 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                Initiate Session <ArrowRight size={20} />
                            </button>
                        </div>

                        <div className="pt-8 text-center">
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-loose">
                                By entering this terminal, you acknowledge adherence to <br />
                                <span className="text-gray-400">Section 4.B of the Surveillance Ethics Protocol</span>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
