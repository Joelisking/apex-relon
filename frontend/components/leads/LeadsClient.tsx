'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, PipelineStage } from '@/lib/types';
import {
  Filter,
  Plus,
  Search,
  MoreHorizontal,
  Clock,
  AlertCircle,
  XCircle,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DatePicker } from '@/components/ui/date-picker';

interface LeadsClientProps {
  leads: Lead[];
}

const LeadsClient: React.FC<LeadsClientProps> = ({ leads }) => {
  const router = useRouter();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState(() => ({
    contactName: '',
    company: '',
    expectedValue: '',
    urgency: 'Medium',
    stage: 'New',
    priority: 'Medium',
    source: 'Manual Entry',
    channel: 'Direct',
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    notes: '',
  }));

  const columns = Object.values(PipelineStage);

  const handleAnalyzeRisk = async (lead: Lead) => {
    if (!lead.id) return;

    setAiLoading(true);
    try {
      const result = await api.leads.analyzeRisk(lead.id);
      // Refresh the page to get updated data from server
      router.refresh();

      // Update selected lead with new data
      const updatedLead = {
        ...lead,
        aiRiskLevel: result.riskLevel,
        aiSummary: result.summary,
      };
      setSelectedLead(updatedLead);
    } catch (error) {
      console.error('Failed to analyze risk:', error);
      alert(
        'Failed to analyze risk. Please check if backend is running and AI provider is configured.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.leads.create({
        contactName: newLeadForm.contactName,
        company: newLeadForm.company,
        expectedValue: Number(newLeadForm.expectedValue),
        urgency: newLeadForm.urgency,
        stage: newLeadForm.stage,
        source: newLeadForm.source,
        channel: newLeadForm.channel,
        likelyStartDate: new Date(newLeadForm.expectedCloseDate),
        notes: newLeadForm.notes,
      });

      // Refresh to get updated list from server
      router.refresh();

      setIsNewLeadModalOpen(false);
      setNewLeadForm({
        contactName: '',
        company: '',
        expectedValue: '',
        urgency: 'Medium',
        stage: 'New',
        priority: 'Medium',
        source: 'Manual Entry',
        channel: 'Direct',
        expectedCloseDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0],
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create lead:', error);
      alert(
        'Failed to create lead. Please check if backend is running.',
      );
    }
  };

  const safeLeads = Array.isArray(leads) ? leads : [];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Filters & Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
            />
          </div>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <button
          onClick={() => setIsNewLeadModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-300 h-full">
          {columns.map((stage) => (
            <div
              key={stage}
              className="flex-col flex-1 min-w-70 bg-gray-100/50 rounded-xl p-3 border border-gray-200 h-full overflow-hidden flex">
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-semibold text-gray-700 text-sm">
                  {stage}
                </h3>
                <span className="bg-white text-gray-500 text-xs px-2 py-0.5 rounded-full border shadow-sm">
                  {safeLeads.filter((l) => l.stage === stage).length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {safeLeads
                  .filter((l) => l.stage === stage)
                  .map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            lead.urgency === 'High'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}>
                          {lead.urgency} Priority
                        </span>
                        <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-gray-800 text-sm truncate">
                        {lead.contactName || lead.name}
                      </h4>
                      <p className="text-gray-500 text-xs mb-3">
                        {lead.company}
                      </p>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                        <span className="text-sm font-medium text-gray-700">
                          $
                          {lead.expectedValue?.toLocaleString() ||
                            '0'}
                        </span>
                        <div className="flex items-center text-gray-400 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {new Date(
                              lead.createdAt || Date.now(),
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {lead.aiRiskLevel && (
                        <div
                          className={`mt-2 text-xs flex items-center space-x-1 ${
                            lead.aiRiskLevel === 'High'
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                          <AlertCircle className="h-3 w-3" />
                          <span className="font-medium">
                            {lead.aiRiskLevel} Risk
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Lead Modal */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                Add New Lead
              </h3>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={handleCreateLead}
              className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. John Doe"
                    value={newLeadForm.contactName}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        contactName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Acme Corp"
                    value={newLeadForm.company}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        company: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value ($)
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="0.00"
                    value={newLeadForm.expectedValue}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        expectedValue: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={newLeadForm.source}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        source: e.target.value,
                      })
                    }>
                    <option>Manual Entry</option>
                    <option>LinkedIn</option>
                    <option>Website</option>
                    <option>Referral</option>
                    <option>Cold Call</option>
                    <option>Event</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={newLeadForm.urgency}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        urgency: e.target.value,
                      })
                    }>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={newLeadForm.priority}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        priority: e.target.value,
                      })
                    }>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Email"
                    value={newLeadForm.channel}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        channel: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Close
                  </label>
                  <DatePicker
                    value={newLeadForm.expectedCloseDate}
                    onChange={(val) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        expectedCloseDate: val,
                      })
                    }
                    placeholder="Pick a date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Stage
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={newLeadForm.stage}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        stage: e.target.value,
                      })
                    }>
                    {Object.values(PipelineStage).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Any additional notes..."
                  rows={3}
                  value={newLeadForm.notes}
                  onChange={(e) =>
                    setNewLeadForm({
                      ...newLeadForm,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex justify-center items-center">
                  <Save className="h-4 w-4 mr-2" />
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal (Slide-over) */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-0 overflow-y-auto animate-in flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedLead.contactName || selectedLead.name}
                </h2>
                <p className="text-gray-500">
                  {selectedLead.company}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-8 w-8" />
              </button>
            </div>

            <div className="p-6 space-y-8 flex-1">
              {/* AI Risk Assessment Section */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-indigo-900 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-indigo-600" />
                    AI Risk Analysis
                  </h3>
                  {!selectedLead.aiRiskLevel && (
                    <button
                      onClick={() => handleAnalyzeRisk(selectedLead)}
                      disabled={aiLoading}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                      {aiLoading ? 'Analyzing...' : 'Analyze Now'}
                    </button>
                  )}
                </div>

                {selectedLead.aiRiskLevel ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">
                        Risk Level:
                      </span>
                      <span
                        className={`text-sm font-bold px-2 py-0.5 rounded ${
                          selectedLead.aiRiskLevel === 'High'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                        {selectedLead.aiRiskLevel}
                      </span>
                    </div>
                    {selectedLead.aiSummary && (
                      <p className="text-sm text-gray-700 italic border-l-2 border-indigo-300 pl-3">
                        &quot;{selectedLead.aiSummary}&quot;
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Run AI analysis to get risk predictions and
                    conversion probability. Make sure backend has an
                    AI provider configured.
                  </p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <DetailItem
                  label="Value"
                  value={`$${selectedLead.expectedValue?.toLocaleString() || '0'}`}
                />
                <DetailItem
                  label="Stage"
                  value={selectedLead.stage}
                />
                <DetailItem
                  label="Expected Close"
                  value={
                    selectedLead.likelyStartDate
                      ? new Date(
                          String(selectedLead.likelyStartDate),
                        ).toLocaleDateString()
                      : 'Not set'
                  }
                />
                <DetailItem
                  label="Source"
                  value={selectedLead.source}
                />
                <DetailItem
                  label="Channel"
                  value={selectedLead.channel}
                />
                <DetailItem
                  label="Urgency"
                  value={selectedLead.urgency}
                />
              </div>

              {/* Notes Section */}
              {selectedLead.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                    {selectedLead.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div>
    <span className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
      {label}
    </span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

export default LeadsClient;
