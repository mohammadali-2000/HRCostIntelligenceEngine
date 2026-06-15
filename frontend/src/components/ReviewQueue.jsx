import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

const API_BASE = 'https://hrcostintelligenceengine.onrender.com/api';

export default function ReviewQueue() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_BASE}/meetings/review`);
      setMeetings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleCorrect = async (meetingId, projectId) => {
    try {
      await axios.post(`${API_BASE}/meetings/${meetingId}/correct`, { project_id: projectId });
      setMeetings(meetings.filter(m => m.id !== meetingId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 animate-in fade-in">
        <CheckCircle size={48} className="text-emerald-500 mb-4 opacity-80" />
        <h3 className="text-xl font-semibold text-slate-700">All Caught Up!</h3>
        <p>No meetings require manual review at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Needs Review</h2>
        <p className="text-slate-500 mt-1">Meetings flagged due to low AI confidence or high cost anomalies.</p>
      </div>

      <div className="flex flex-col gap-4">
        {meetings.map((m) => (
          <div key={m.id} className="card flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-l-4 border-l-amber-500">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{m.title}</h3>
                {m.is_anomaly && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wide">Anomaly</span>
                )}
                {m.ai_confidence < 0.7 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wide">Low Confidence</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Clock size={14} /> {m.duration_minutes} min</span>
                <span>•</span>
                <span>Cost: <span className="font-medium text-slate-700">${m.total_cost.toFixed(2)}</span></span>
                <span>•</span>
                <span>AI Confidence: <span className={`font-medium ${m.ai_confidence > 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>{(m.ai_confidence * 100).toFixed(0)}%</span></span>
              </div>
              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 border border-slate-100 mt-2">
                <strong>AI Reasoning:</strong> {m.ai_reasoning}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="flex-1 w-full">
                <select 
                  className="w-full md:w-48 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  onChange={(e) => {
                    if(e.target.value) handleCorrect(m.id, e.target.value);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select Project...</option>
                  <option value="proj_alpha">Project Alpha</option>
                  <option value="proj_beta">Project Beta</option>
                  <option value="proj_gamma">Project Gamma</option>
                  <option value="internal_ops">Internal Ops</option>
                  <option value="unknown">Unattributed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
