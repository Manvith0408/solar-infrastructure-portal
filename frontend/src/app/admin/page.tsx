'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LeadCRM } from '@/components/admin/LeadCRM';
import { AreaDPRGenerator } from '@/components/admin/AreaDPRGenerator';
import { RequireAdmin } from '@/components/ProtectedRoute';

export default function AdminDashboardPage() {
  const [currentTab, setCurrentTab] = useState<'crm' | 'dpr'>('crm');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <RequireAdmin>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        {/* Sidebar Navigation */}
        <AdminSidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          pendingCount={2}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            title={
              currentTab === 'crm'
                ? 'Public Inquiries & Citizen Demand Radar'
                : 'Detailed Project Report (DPR) Feeder Sizing Engine'
            }
            subtitle={
              currentTab === 'crm'
                ? 'Real-time B2C rooftop demand pipeline with interactive lifecycle verification'
                : 'Microgrid and feeder planning with strict land allocation and grid loss constraints'
            }
            onRefresh={handleRefresh}
            isLoading={isRefreshing}
          />

          {/* Scrollable Content View */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {currentTab === 'crm' ? (
                <LeadCRM key={isRefreshing ? 'refreshing' : 'active'} />
              ) : (
                <AreaDPRGenerator />
              )}
            </div>
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
}
