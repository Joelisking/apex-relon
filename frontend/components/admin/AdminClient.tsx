'use client';

import React, { useState } from 'react';
import {
  Settings,
  Users,
  Bell,
  Shield,
  ToggleLeft,
  ToggleRight,
  Database,
} from 'lucide-react';
import { Role } from '@/lib/types';

const AdminClient: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>(
    'users'
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        System Administration
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Settings className="h-4 w-4" />
            <span>System Settings</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 bg-gray-50/30">
          {activeTab === 'users' ? (
            <UserManagement />
          ) : (
            <SystemSettings />
          )}
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const users = [
    {
      id: 1,
      name: 'Maria Manager',
      email: 'maria@khy.com',
      role: Role.BDM,
      status: 'Active',
    },
    {
      id: 2,
      name: 'Alex Sales',
      email: 'alex@khy.com',
      role: Role.SALES,
      status: 'Active',
    },
    {
      id: 3,
      name: 'John CEO',
      email: 'john@khy.com',
      role: Role.CEO,
      status: 'Active',
    },
    {
      id: 4,
      name: 'Sarah Admin',
      email: 'sarah@khy.com',
      role: Role.ADMIN,
      status: 'Inactive',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-700">
          Team Members
        </h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          Add New User
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-3">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-blue-50 text-blue-700 py-1 px-2 rounded text-xs font-medium border border-blue-100">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`py-1 px-2 rounded text-xs font-medium flex items-center w-fit ${
                      user.status === 'Active'
                        ? 'text-green-700 bg-green-50'
                        : 'text-gray-600 bg-gray-100'
                    }`}>
                    <div
                      className={`h-1.5 w-1.5 rounded-full mr-2 ${
                        user.status === 'Active'
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                      }`}></div>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-blue-600 text-sm font-medium">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SystemSettings = () => {
  return (
    <div className="max-w-3xl">
      <h3 className="text-lg font-bold text-gray-700 mb-6">
        Global Preferences
      </h3>

      <div className="space-y-6">
        <SettingSection
          icon={Bell}
          title="Notifications"
          description="Manage how the team receives alerts for new leads.">
          <ToggleItem
            label="Email Alerts for High Priority Leads"
            enabled={true}
          />
          <ToggleItem label="Daily Digest Summary" enabled={false} />
        </SettingSection>

        <SettingSection
          icon={Shield}
          title="Security & Access"
          description="Configure login requirements and session timeouts.">
          <ToggleItem
            label="Require Two-Factor Authentication"
            enabled={true}
          />
          <ToggleItem
            label="Force Logout after 2 hours"
            enabled={false}
          />
        </SettingSection>

        <SettingSection
          icon={Database}
          title="AI Configuration"
          description="Manage Gemini API usage and data processing levels.">
          <ToggleItem label="Auto-Analyze New Leads" enabled={true} />
          <ToggleItem
            label="Generate Nightly Revenue Reports"
            enabled={true}
          />
        </SettingSection>
      </div>
    </div>
  );
};

const SettingSection = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
    <div className="flex items-start mb-6">
      <div className="p-2 bg-indigo-50 rounded-lg mr-4">
        <Icon className="h-5 w-5 text-indigo-600" />
      </div>
      <div>
        <h4 className="text-base font-semibold text-gray-900">
          {title}
        </h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
    <div className="space-y-4 pl-14">{children}</div>
  </div>
);

const ToggleItem = ({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) => {
  const [isOn, setIsOn] = useState(enabled);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 font-medium">
        {label}
      </span>
      <button
        onClick={() => setIsOn(!isOn)}
        className={`transition-colors duration-200 focus:outline-none`}>
        {isOn ? (
          <ToggleRight className="h-8 w-8 text-blue-600" />
        ) : (
          <ToggleLeft className="h-8 w-8 text-gray-300" />
        )}
      </button>
    </div>
  );
};

export default AdminClient;
