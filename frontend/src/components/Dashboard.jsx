import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { RefreshCw, DollarSign, Clock, AlertTriangle, PlusCircle, X, EyeOff } from 'lucide-react';

const API_BASE = 'https://hrcostintelligenceengine.onrender.com/api';
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

export default function Dashboard({ privacyMode, userRole }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [timeframe, setTimeframe] = useState(30);
  
  // Add Meeting Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', description: '', duration_minutes: 30, attendees: ['emp_1'] });
  const [addingMeeting, setAddingMeeting] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dashboard/summary?days=${timeframe}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [timeframe, userRole]); // refetch when timeframe or role changes

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await axios.post(`${API_BASE}/meetings/ingest`);
      await fetchSummary();
    } catch (err) {
      console.error(err);
    } finally {
      setIngesting(false);
    }
  };

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    setAddingMeeting(true);
    try {
      await axios.post(`${API_BASE}/meetings/add`, newMeeting);
      setShowAddModal(false);
      setNewMeeting({ title: '', description: '', duration_minutes: 30, attendees: ['emp_1'] });
      await fetchSummary();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingMeeting(false);
    }
  };

  const formatCurrency = (val) => {
    if (privacyMode || userRole === 'Employee') return '****';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading && !data) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Summary</h2>
          <p className="text-slate-500 mt-1">Real-time HR cost attribution from calendar intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 shadow-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>All Time</option>
          </select>

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm"
          >
            <PlusCircle size={18} />
            Add Meeting
          </button>

          <button 
            onClick={handleIngest}
            disabled={ingesting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 shadow-md"
          >
            <RefreshCw size={18} className={ingesting ? 'animate-spin' : ''} />
            {ingesting ? 'Analyzing...' : 'Trigger AI Ingestion'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-t-4 border-t-blue-500 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <DollarSign size={18} className="text-blue-500" />
            Total Meeting Cost
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {formatCurrency(data?.total_cost || 0)}
          </div>
        </div>
        <div className="card border-t-4 border-t-purple-500 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Clock size={18} className="text-purple-500" />
            Total Meeting Hours
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {data?.total_hours?.toFixed(1) || 0} hrs
          </div>
        </div>
        <div className="card border-t-4 border-t-rose-500 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <AlertTriangle size={18} className="text-rose-500" />
            Pending Reviews
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {data?.pending_reviews || 0}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col gap-4">
          <h3 className="font-semibold text-lg text-slate-800">Cost by Project</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.cost_by_project || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => privacyMode || userRole === 'Employee' ? '***' : `$${v}`} />
                <RechartsTooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formatCurrency(value), "Cost"]}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <h3 className="font-semibold text-lg text-slate-800">Cost by Department</h3>
          {userRole === 'Employee' ? (
            <div className="h-72 flex items-center justify-center text-slate-400 flex-col gap-2">
              <EyeOff size={32} />
              <p>Department costs are hidden for Employees</p>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.cost_by_role || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {(data?.cost_by_role || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatCurrency(value), "Cost"]}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="card bg-gradient-to-br from-slate-900 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <span className="text-xl">✨</span> AI Cost Insights & Anomalies
        </h3>
        <div className="text-indigo-100 whitespace-pre-wrap leading-relaxed relative z-10">
          {data?.insights || "No insights generated yet. Ensure Gemini API key is configured and trigger ingestion."}
        </div>
      </div>

      {/* Recent AI Attributions */}
      <div className="card flex flex-col gap-4">
        <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
          Recent AI Attributions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Meeting Title</th>
                <th className="px-4 py-3">Data Source</th>
                <th className="px-4 py-3">Assigned Project</th>
                <th className="px-4 py-3 text-center">Confidence</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 rounded-tr-lg">AI Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recent_meetings?.length > 0 ? (
                data.recent_meetings.map((m) => {
                  const source = String(m.id).includes('-') ? 'Manual Entry' : 'Google Calendar';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{m.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${source === 'Google Calendar' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                          {source}
                        </span>
                      </td>
                      <td className="px-4 py-3">{m.project_id}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${m.ai_confidence > 85 ? 'bg-green-100 text-green-800' : m.ai_confidence > 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {m.ai_confidence}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(m.total_cost)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={m.ai_reasoning}>
                        "{m.ai_reasoning}"
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    No recent attributions found. Trigger AI ingestion.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Meeting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-lg">Simulate Calendar Meeting</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddMeeting} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Title</label>
                <input 
                  required
                  type="text" 
                  value={newMeeting.title}
                  onChange={e => setNewMeeting({...newMeeting, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="e.g. Brainstorming UI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  required
                  rows={2}
                  value={newMeeting.description}
                  onChange={e => setNewMeeting({...newMeeting, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Discussing the new landing page..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (mins)</label>
                  <input 
                    type="number" 
                    min={15} step={15}
                    value={newMeeting.duration_minutes}
                    onChange={e => setNewMeeting({...newMeeting, duration_minutes: Number(e.target.value)})}
                    className="w-full border border-slate-300 rounded-md p-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attendees</label>
                  <select 
                    multiple
                    value={newMeeting.attendees}
                    onChange={e => {
                      const options = [...e.target.options];
                      const values = options.filter(o => o.selected).map(o => o.value);
                      setNewMeeting({...newMeeting, attendees: values});
                    }}
                    className="w-full border border-slate-300 rounded-md p-2 h-20 text-sm"
                  >
                    <option value="emp_1">Alice (Eng)</option>
                    <option value="emp_2">Bob (PM)</option>
                    <option value="emp_3">Charlie (UX)</option>
                    <option value="emp_4">Diana (QA)</option>
                    <option value="emp_5">Evan (Data)</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addingMeeting}
                  className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {addingMeeting && <RefreshCw size={16} className="animate-spin" />}
                  {addingMeeting ? 'Processing via AI...' : 'Add Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
