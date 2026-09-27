import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Boxes,
  BarChart3,
  Settings,
} from 'lucide-react';
import { type PageId } from './Sidebar';

interface MobileNavProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onSelectPage }) => {
  const tabs: { id: PageId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', icon: ShoppingBag },
    { id: 'purchases', label: 'Buy', icon: Truck },
    { id: 'stock', label: 'Stock', icon: Boxes },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 z-40 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectPage(tab.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
