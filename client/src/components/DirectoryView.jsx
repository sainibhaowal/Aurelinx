import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Download, AlertTriangle } from 'lucide-react';
import TalentCard from './TalentCard';
import { analysisAPI, employeesAPI } from '../services/apiClient';

const DirectoryView = ({ onExport }) => {
  const DIRECTORY_LOAD_LIMIT = 10000;
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [workforceTotal, setWorkforceTotal] = useState(null);

  useEffect(() => {
    employeesAPI.list(0, DIRECTORY_LOAD_LIMIT)
      .then(data => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    analysisAPI.getAnalyticsSnapshot()
      .then((snap) => {
        setWorkforceTotal(snap?.total ?? null);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    e.role.toLowerCase().includes(filter.toLowerCase()) ||
    e.department.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-full pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-white">Talent Directory</h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-3xl">Centralized governance for your entire organizational workforce.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onExport}
            className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/50 cursor-pointer"
          >
            <Download size={20} />
          </button>
           <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl text-primary text-xs font-bold uppercase tracking-widest">
             <Users size={16} /> {employees.length} Loaded{workforceTotal !== null ? ` / ${workforceTotal} Total` : ''}
           </div>
        </div>
      </header>

      <div className="premium-card p-4 flex flex-col md:flex-row gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, role, or department..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-12 pr-4 h-11 rounded-xl bg-slate-950/50 border border-white/10 focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm"
          />
        </div>
        <button 
          onClick={onExport}
          className="px-5 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/70 hover:bg-white/10 transition-all font-semibold cursor-pointer text-sm"
        >
          <Download size={18} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-10">
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">Visible Records</div>
          <div className="text-2xl font-extrabold">{filteredEmployees.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {workforceTotal !== null ? `Of ${workforceTotal} total workforce records` : 'Subset of the loaded page'}
          </div>
        </div>
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">At-Risk in View</div>
          <div className="text-2xl font-extrabold text-rose-300">{filteredEmployees.filter(e => e.is_at_risk).length}</div>
        </div>
        <div className="premium-card p-4">
          <div className="text-xs text-slate-300 uppercase tracking-[0.14em] mb-2">Departments</div>
          <div className="text-2xl font-extrabold">{new Set(filteredEmployees.map(e => e.department)).size}</div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`directory-skel-${idx}`} className="premium-card p-4 min-h-[180px] animate-pulse border border-white/10 bg-white/5">
              <div className="h-4 w-24 rounded bg-white/10 mb-3" />
              <div className="h-3 w-40 rounded bg-white/10 mb-6" />
              <div className="h-16 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {employees.length === 0 && (
            <div className="premium-card p-8 text-slate-300 flex items-center gap-3 col-span-full">
              <AlertTriangle size={18} /> No real employee records found. Add/import real data to continue end-to-end testing.
            </div>
          )}
          {filteredEmployees.map((emp, idx) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <TalentCard talent={emp} onOpenProfile={() => setSelectedProfile(emp)} />
            </motion.div>
          ))}
          {!filteredEmployees.length && (
            <div className="premium-card p-8 text-slate-300 flex items-center gap-3 md:col-span-3">
              <AlertTriangle size={18} /> No employee records matched your search.
            </div>
          )}
        </div>
      )}

      {selectedProfile && (
        <div
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="w-full max-w-2xl premium-card p-6 md:p-8 border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-extrabold mb-2">{selectedProfile.full_name}</h3>
            <p className="text-slate-300 mb-6">{selectedProfile.role} - {selectedProfile.department}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Email</div>
                <div>{selectedProfile.email || 'N/A'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Retention</div>
                <div>{selectedProfile.retention_prob ? `${(selectedProfile.retention_prob * 100).toFixed(1)}%` : 'N/A'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Sentiment</div>
                <div>{selectedProfile.sentiment_score ?? 'N/A'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">Risk</div>
                <div>{selectedProfile.is_at_risk ? 'High Attrition Risk' : 'Optimal Retention'}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">Skills</div>
              <div className="flex flex-wrap gap-2">
                {(selectedProfile.skills || []).slice(0, 12).map((skill, idx) => (
                  <span key={`${skill.name}-${idx}`} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                    {skill.name} (L{skill.level})
                  </span>
                ))}
                {(!selectedProfile.skills || selectedProfile.skills.length === 0) && (
                  <span className="text-slate-400 text-sm">No skills found.</span>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProfile(null)}
                className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryView;
