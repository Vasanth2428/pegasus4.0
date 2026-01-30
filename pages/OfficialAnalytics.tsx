
import React from 'react';
import { BarChart3, TrendingUp, Award, Calendar, CheckCircle, Zap, Target, ArrowUpRight, Activity, Shield } from 'lucide-react';

const OfficialAnalytics: React.FC = () => {
    // High-Volume Mock Data for Weekly Analysis
    const weeklyProduction = [
        { day: 'MON', tasks: 85 },
        { day: 'TUE', tasks: 120 },
        { day: 'WED', tasks: 95 },
        { day: 'THU', tasks: 145 },
        { day: 'FRI', tasks: 130 },
        { day: 'SAT', tasks: 72 },
        { day: 'SUN', tasks: 58 },
    ];

    const weeklyResponseTrends = [
        { day: 'MON', time: 48 },
        { day: 'TUE', time: 35 },
        { day: 'WED', time: 42 },
        { day: 'THU', time: 28 },
        { day: 'FRI', time: 32 },
        { day: 'SAT', time: 50 },
        { day: 'SUN', time: 55 },
    ];

    const incidentCategories = [
        { name: 'Vehicle Accidents', volume: 42, color: '#EF4444', icon: <Activity size={12} /> },
        { name: 'Structural Hazards', volume: 28, color: '#FFB800', icon: <Shield size={12} /> },
        { name: 'Public Safety', volume: 15, color: '#00E8FF', icon: <CheckCircle size={12} /> },
        { name: 'Medical Assists', volume: 15, color: '#00FF85', icon: <Zap size={12} /> },
    ];

    // Fixed SVG Smooth Curve Path Generator
    const chartWidth = 600;
    const chartHeight = 250;
    const maxTime = 60;
    const padding = 40;

    const getPoint = (index: number, time: number) => {
        const x = padding + (index / (weeklyResponseTrends.length - 1)) * (chartWidth - padding * 2);
        const y = chartHeight - padding - ((time / maxTime) * (chartHeight - padding * 2));
        return { x, y };
    };

    const generateCurvePath = () => {
        const points = weeklyResponseTrends.map((d, i) => getPoint(i, d.time));
        if (points.length < 2) return '';

        let path = `M ${points[0].x},${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            const cpX = (curr.x + next.x) / 2;
            path += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
        }
        return path;
    };

    const generateAreaPath = () => {
        const points = weeklyResponseTrends.map((d, i) => getPoint(i, d.time));
        if (points.length < 2) return '';

        let path = `M ${points[0].x},${chartHeight - padding}`;
        path += ` L ${points[0].x},${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            const cpX = (curr.x + next.x) / 2;
            path += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
        }

        path += ` L ${points[points.length - 1].x},${chartHeight - padding}`;
        path += ` Z`;
        return path;
    };

    const curvePath = generateCurvePath();
    const areaPath = generateAreaPath();
    const dataPoints = weeklyResponseTrends.map((d, i) => ({ ...d, ...getPoint(i, d.time) }));

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-biolumeGreen/10 border border-biolumeGreen/20 text-[8px] font-black text-biolumeGreen uppercase tracking-widest">CogniCam Core</span>
                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em]">Operational Analytics Terminal</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight uppercase italic text-white leading-none">
                        Service <span className="text-biolumeGreen">Metrics</span>
                    </h2>
                    <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">
                        Tactical Output & Response Latency Recap • M-S Cycle
                    </p>
                </div>
                <div className="bg-charcoal px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4 shadow-2xl">
                    <Calendar size={18} className="text-biolumeGreen" />
                    <div className="text-left">
                        <div className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Recap Window</div>
                        <div className="font-black uppercase text-xs text-white tracking-widest">Sector Alpha</div>
                    </div>
                </div>
            </header>

            {/* KPI Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Tactical Volume', value: '1,248', delta: '+15.2%', color: 'text-biolumeGreen', icon: <CheckCircle /> },
                    { label: 'Mean Resolution', value: '32m', delta: '-8m', color: 'text-electricTeal', icon: <TrendingUp /> },
                    { label: 'Sector Rank', value: 'Elite', delta: 'Tier 0', color: 'text-goldPrimary', icon: <Award /> },
                    { label: 'Sync Efficiency', value: '99.8%', delta: 'Optimal', color: 'text-red-500', icon: <Shield /> },
                ].map((kpi, i) => (
                    <div key={i} className="bg-charcoal p-7 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-white/10 transition-all">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            {React.cloneElement(kpi.icon as React.ReactElement, { size: 12 })} {kpi.label}
                        </div>
                        <div className={`text-4xl font-black mb-2 ${kpi.color} italic tracking-tighter`}>{kpi.value}</div>
                        <div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] flex items-center gap-1">
                            <ArrowUpRight size={12} className={kpi.color} /> {kpi.delta} vs standard
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* 1. Efficiency Flow Curve - FIXED */}
                <div className="col-span-12 lg:col-span-8 bg-charcoal p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                                <Activity className="text-electricTeal" size={24} /> Efficiency Flow Curve
                            </h3>
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Operational resolution trajectory (minutes per tactical day)</p>
                        </div>
                        <div className="px-4 py-1.5 bg-electricTeal/10 border border-electricTeal/20 rounded-full text-[9px] font-black text-electricTeal uppercase tracking-widest">Real-time Sync Active</div>
                    </div>

                    <div className="relative">
                        <svg width="100%" height="280" viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00E8FF" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#00E8FF" stopOpacity="0.02" />
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {/* Grid Lines */}
                            {[0, 1, 2, 3, 4].map((i) => (
                                <line key={i} x1={padding} y1={padding + i * ((chartHeight - padding * 2) / 4)} x2={chartWidth - padding} y2={padding + i * ((chartHeight - padding * 2) / 4)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            ))}

                            {/* Y-Axis Labels */}
                            {['60m', '45m', '30m', '15m', '0m'].map((label, i) => (
                                <text key={i} x={padding - 10} y={padding + i * ((chartHeight - padding * 2) / 4) + 4} fill="#4B5563" fontSize="10" textAnchor="end" fontFamily="monospace" fontWeight="bold">{label}</text>
                            ))}

                            {/* Area Fill */}
                            <path d={areaPath} fill="url(#areaGradient)" />

                            {/* Main Curve Line */}
                            <path d={curvePath} fill="none" stroke="#00E8FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

                            {/* Data Points */}
                            {dataPoints.map((point, i) => (
                                <g key={i}>
                                    <circle cx={point.x} cy={point.y} r="8" fill="#0D1117" stroke="#00E8FF" strokeWidth="3" />
                                    <title>{point.day}: {point.time}m</title>
                                </g>
                            ))}

                            {/* X-Axis Labels */}
                            {dataPoints.map((point, i) => (
                                <text key={i} x={point.x} y={chartHeight + 5} fill="#4B5563" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{point.day}</text>
                            ))}
                        </svg>
                    </div>
                </div>

                {/* 2. Tactical Accuracy Audit */}
                <div className="col-span-12 lg:col-span-4 bg-obsidian p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center items-center text-center group cursor-pointer hover:border-biolumeGreen/30 transition-all shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-biolumeGreen/5 blur-3xl pointer-events-none" />
                    <div className="w-24 h-24 rounded-[2.5rem] bg-biolumeGreen/10 flex items-center justify-center border-2 border-biolumeGreen/20 group-hover:scale-110 transition-all duration-500 mb-8 shadow-[0_0_40px_rgba(0,255,133,0.1)]">
                        <Target size={42} className="text-biolumeGreen" />
                    </div>
                    <div className="text-5xl font-black text-white mb-2 italic tracking-tighter">99.2<span className="text-sm text-gray-500 font-mono not-italic ml-1">%</span></div>
                    <div className="text-[11px] font-black text-goldPrimary uppercase tracking-[0.4em] mb-6">Tactical Accuracy</div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest max-w-[200px]">Audited decision flow based on neural response patterns</p>
                </div>

                {/* 3. Workload Intensity Bar Graph - FIXED */}
                <div className="col-span-12 lg:col-span-7 bg-charcoal p-8 rounded-[3rem] border border-white/5 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                                <BarChart3 className="text-biolumeGreen" size={24} /> Workload Intensity
                            </h3>
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Daily resolution volume across unified tactical grid</p>
                        </div>
                    </div>

                    <div className="relative h-64">
                        <svg width="100%" height="100%" viewBox="0 0 560 220" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00FF85" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#00FF85" stopOpacity="0.3" />
                                </linearGradient>
                                <filter id="barGlow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {/* Grid Lines */}
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <line key={i} x1="50" y1={20 + i * 30} x2="540" y2={20 + i * 30} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            ))}

                            {/* Y-Axis Labels */}
                            {['150', '120', '90', '60', '30', '0'].map((label, i) => (
                                <text key={i} x="40" y={24 + i * 30} fill="#4B5563" fontSize="10" textAnchor="end" fontFamily="monospace" fontWeight="bold">{label}</text>
                            ))}

                            {/* Bars */}
                            {weeklyProduction.map((item, i) => {
                                const barWidth = 50;
                                const gap = 20;
                                const startX = 70;
                                const x = startX + i * (barWidth + gap);
                                const maxHeight = 150;
                                const barHeight = (item.tasks / 150) * maxHeight;
                                const y = 170 - barHeight;

                                return (
                                    <g key={item.day}>
                                        {/* Bar */}
                                        <rect x={x} y={y} width={barWidth} height={barHeight} rx="12" fill="url(#barGradient)" filter="url(#barGlow)" />

                                        {/* Value Label */}
                                        <text x={x + barWidth / 2} y={y - 8} fill="#00FF85" fontSize="12" textAnchor="middle" fontWeight="bold">{item.tasks}</text>

                                        {/* Day Label */}
                                        <text x={x + barWidth / 2} y="200" fill="#4B5563" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{item.day}</text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                {/* 4. Categorical Distribution */}
                <div className="col-span-12 lg:col-span-5 bg-charcoal p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white mb-10 italic">Sector Distribution</h3>
                    <div className="space-y-8">
                        {incidentCategories.map((cat) => (
                            <div key={cat.name} className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-obsidian flex items-center justify-center border border-white/10 shadow-inner" style={{ color: cat.color }}>
                                            {cat.icon}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{cat.name}</span>
                                    </div>
                                    <span className="text-lg font-black text-white">{cat.volume}%</span>
                                </div>
                                <div className="h-2.5 bg-obsidian rounded-full overflow-hidden border border-white/5 p-0.5">
                                    <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: cat.color, width: `${cat.volume}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Tactical Precision Audit Section */}
                <div className="col-span-12 bg-obsidian/60 p-8 rounded-[3rem] border border-white/5 border-dashed flex items-center justify-between">
                    <div className="flex gap-8 items-center">
                        <div className="w-16 h-16 bg-biolumeGreen/10 rounded-2xl flex items-center justify-center border border-biolumeGreen/10">
                            <Shield className="text-biolumeGreen" size={28} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase text-white tracking-widest italic mb-1">Tactical Precision Audit</h4>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Automated compliance sync • Status: <span className="text-biolumeGreen">Optimal</span></p>
                        </div>
                    </div>
                    <div className="flex gap-10">
                        {[
                            { label: 'Decision Latency', value: '42ms' },
                            { label: 'Protocol Sync', value: '100%' },
                            { label: 'Safety Quotient', value: '0.98' }
                        ].map(stat => (
                            <div key={stat.label} className="text-center">
                                <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{stat.label}</div>
                                <div className="text-xl font-black text-white italic">{stat.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficialAnalytics;
