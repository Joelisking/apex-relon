'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/types';
import {
  Search,
  MoreVertical,
  HeartPulse,
  Building2,
  XCircle,
  Briefcase,
  Zap,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface ClientsClientProps {
  clients: Client[];
}

const ClientsClient: React.FC<ClientsClientProps> = ({
  clients,
}) => {
  const router = useRouter();
  const [loadingMap, setLoadingMap] = useState<{
    [key: string]: boolean;
  }>({});

  const [selectedClient, setSelectedClient] = useState<Client | null>(
    null
  );
  const [aiUpsellData, setAiUpsellData] = useState<{
    strategy: string;
    opportunities: Array<{
      title: string;
      description: string;
      potentialValue: string;
    }>;
  } | null>(null);
  const [upsellLoading, setUpsellLoading] = useState(false);

  const handleHealthCheck = async (
    client: Client,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!client.id) return;

    setLoadingMap((prev) => ({ ...prev, [client.id]: true }));
    try {
      const report = await api.clients.generateHealthReport(client.id);
      router.refresh();

      if (selectedClient?.id === client.id) {
        setSelectedClient({
          ...client,
          aiHealthSummary: report.summary,
        });
      }
    } catch (error) {
      console.error('Failed to generate health report:', error);
      alert('Failed to generate health report. Please check if backend is running and AI provider is configured.');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [client.id]: false }));
    }
  };

  const handleOpenDetail = (client: Client) => {
    setSelectedClient(client);
    setAiUpsellData(null);
  };

  const handleGenerateUpsell = async () => {
    if (!selectedClient || !selectedClient.id) return;
    setUpsellLoading(true);
    try {
      const data = await api.clients.generateUpsellStrategy(selectedClient.id);
      setAiUpsellData(data);
    } catch (error) {
      console.error('Failed to generate upsell strategy:', error);
      alert('Failed to generate upsell strategy. Please check if backend is running and AI provider is configured.');
    } finally {
      setUpsellLoading(false);
    }
  };

  const safeClients = Array.isArray(clients) ? clients : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Client Relationships
        </h2>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {safeClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div
              className="p-6 cursor-pointer"
              onClick={() => handleOpenDetail(client)}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {client.individualName || client.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {client.individualName ? client.name : client.industry}
                    </p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Revenue</span>
                  <span className="font-semibold text-gray-900">
                    ${client.totalRevenue?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      client.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : client.status === 'At Risk'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                    {client.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Manager</span>
                  <span className="text-gray-900">
                    {client.accountManager?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <HeartPulse className="h-4 w-4 text-pink-500" />
                    <span>AI Health Insight</span>
                  </div>
                  {!client.aiHealthSummary && (
                    <button
                      onClick={(e) => handleHealthCheck(client, e)}
                      disabled={loadingMap[client.id]}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50">
                      {loadingMap[client.id]
                        ? 'Analyzing...'
                        : 'Generate'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 italic">
                  {client.aiHealthSummary ||
                    'No health summary generated yet.'}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Last interaction: {client.lastInteraction}
              </span>
              <button
                onClick={() => handleOpenDetail(client)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800">
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto animate-in">
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100 p-6 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedClient.name}
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{selectedClient.segment}</span>
                    <span>•</span>
                    <span>{selectedClient.industry}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-8 w-8" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Lifetime Revenue
                  </span>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    ${selectedClient.totalRevenue?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Active Projects
                  </span>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {selectedClient.projects?.length}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Health Status
                  </span>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-1 rounded text-sm font-bold ${
                        selectedClient.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : selectedClient.status === 'At Risk'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-200 text-gray-700'
                      }`}>
                      {selectedClient.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Projects List */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-gray-500" />
                  Active Projects
                </h3>
                <div className="space-y-3">
                  {selectedClient.projects?.map((proj, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="font-medium text-gray-700">
                          {proj.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {proj.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Uploads Section */}
              <div>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-500" />
                    Documents & Contracts
                  </h3>
                  <button
                    onClick={() => {
                      const newFile = {
                        id: `cf${Date.now()}`,
                        name: `Client_Contract_${Math.floor(Math.random() * 1000)}.pdf`,
                        url: '#',
                        uploadedAt: new Date()
                          .toISOString()
                          .split('T')[0],
                      };
                      // Mock upload - in production, this would call backend API
                      setSelectedClient({
                        ...selectedClient,
                        uploads: [
                          newFile,
                          ...(selectedClient.uploads || []),
                        ],
                      });
                    }}
                    className="text-xs text-blue-600 font-medium hover:underline">
                    + Upload Document (Mock)
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedClient.uploads &&
                  selectedClient.uploads.length > 0 ? (
                    selectedClient.uploads.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {file.uploadedAt}
                            </p>
                          </div>
                        </div>
                        <a
                          href={file.url}
                          className="text-xs text-blue-500 hover:text-blue-700">
                          View
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No documents attached.
                    </p>
                  )}
                </div>
              </div>

              {/* AI Upsell Generator */}
              <div className="bg-linear-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 h-24 w-24 rounded-full blur-xl"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                      AI Growth Engine
                    </h3>
                    <p className="text-indigo-200 text-sm mt-1">
                      Generate tailored upsell strategies based on
                      client history.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateUpsell}
                    disabled={upsellLoading}
                    className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50">
                    {upsellLoading
                      ? 'Analyzing...'
                      : 'Generate Strategy'}
                  </button>
                </div>

                {aiUpsellData && (
                  <div className="space-y-4 animate-in fade-in relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                      <p className="text-sm font-medium leading-relaxed">
                        &quot;{aiUpsellData.strategy}&quot;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {aiUpsellData.opportunities.map((opp, idx) => (
                        <div
                          key={idx}
                          className="bg-white/5 border border-white/10 p-3 rounded-lg flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer">
                          <div>
                            <p className="font-bold text-sm text-white">
                              {opp.title}
                            </p>
                            <p className="text-xs text-indigo-200">
                              {opp.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="block text-green-300 font-bold text-sm">
                              {opp.potentialValue}
                            </span>
                            <span className="text-[10px] text-indigo-300 uppercase">
                              Potential
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!aiUpsellData && !upsellLoading && (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-indigo-500/50 rounded-lg text-indigo-300 text-sm">
                    Click Generate to unlock opportunities
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsClient;
