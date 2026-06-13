import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import ReviewQueue from './components/ReviewQueue';
import { LayoutDashboard, CheckSquare, Eye, EyeOff, User, ShieldAlert } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [userRole, setUserRole] = useState('Admin');

  useEffect(() => {
    // RBAC: Update axios headers when role changes
    axios.defaults.headers.common['x-user-role'] = userRole;
  }, [userRole]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
            H
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
            HR Cost Intelligence
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <a
            href="http://localhost:8000/api/auth/login"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-semibold border border-blue-200"
          >
            Connect Google Calendar
          </a>

          <div className="flex items-center gap-2 bg-slate-100 rounded-full px-1 py-1 border border-slate-200">
            <button
              onClick={() => setUserRole('Admin')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${userRole === 'Admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Admin
            </button>
            <button
              onClick={() => setUserRole('Employee')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${userRole === 'Employee' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Employee
            </button>
          </div>

          <button 
            onClick={() => setPrivacyMode(!privacyMode)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium text-slate-700 border border-slate-200"
          >
            {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
            Privacy Mode: {privacyMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'review' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <CheckSquare size={20} />
            Review Queue
          </button>
          
          {userRole === 'Employee' && (
            <div className="mt-auto p-4 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-200 flex gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>You are viewing this dashboard as an Employee. Financial data is masked.</span>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {activeTab === 'dashboard' ? (
            <Dashboard privacyMode={privacyMode} userRole={userRole} />
          ) : (
            <ReviewQueue />
          )}
        </main>
      </div>
    </div>
  );
}
