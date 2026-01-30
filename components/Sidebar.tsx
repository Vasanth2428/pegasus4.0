
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAVIGATION_ITEMS, OFFICIAL_NAVIGATION_ITEMS } from '../constants';
import { UserRole } from '../types';
import { LogOut, Shield, User } from 'lucide-react';

interface SidebarProps {
  userRole: UserRole;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, onLogout }) => {
  const location = useLocation();
  const items = userRole === 'admin' ? NAVIGATION_ITEMS : OFFICIAL_NAVIGATION_ITEMS;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-charcoal border-r border-white/5 flex flex-col z-50 shadow-2xl">
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${userRole === 'admin' ? 'bg-electricTeal shadow-electricTeal/20' : 'bg-biolumeGreen shadow-biolumeGreen/20'
            }`}>
            {userRole === 'admin' ? <Shield size={20} className="text-obsidian" /> : <User size={20} className="text-obsidian" />}
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-white">Cogni<span className="text-electricTeal">Cam</span></h1>
            <p className="text-[8px] text-gray-500 uppercase tracking-[0.3em] font-black">{userRole === 'admin' ? 'Strategic Command' : 'Field Operations'}</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                  ? (userRole === 'admin' ? 'bg-electricTeal/10 text-electricTeal border border-electricTeal/20' : 'bg-biolumeGreen/10 text-biolumeGreen border border-biolumeGreen/20')
                  : 'text-gray-500 hover:bg-white/[0.03] hover:text-white'
                  }`}
              >
                <span className={`${isActive ? (userRole === 'admin' ? 'text-electricTeal' : 'text-biolumeGreen') : 'text-gray-600 group-hover:text-white'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="font-black text-[10px] uppercase tracking-widest">{item.name}</span>
                {isActive && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full shadow-lg ${userRole === 'admin' ? 'bg-electricTeal shadow-electricTeal/50' : 'bg-biolumeGreen shadow-biolumeGreen/50'
                    }`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 space-y-4">
          <div className="p-4 bg-obsidian/40 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Protocol</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-biolumeGreen animate-pulse" />
                <span className="text-[9px] font-black text-biolumeGreen uppercase tracking-tighter">Secure</span>
              </div>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${userRole === 'admin' ? 'bg-electricTeal w-full' : 'bg-biolumeGreen w-full'}`} />
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all duration-300 group border border-transparent hover:border-red-500/20"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-[10px] uppercase tracking-widest text-shadow-sm">Terminate</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
