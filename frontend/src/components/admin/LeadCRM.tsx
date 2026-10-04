'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InquiryItem, fetchAdminInquiries, updateInquiryStatus } from '@/lib/api';
import { StatusBadgeDropdown, LeadStatus } from './StatusBadgeDropdown';
import { LeadKanban } from './LeadKanban';
import { formatINR } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Sun,
  Star,
  Zap,
  IndianRupee,
  Calendar,
  AlertCircle,
  Building,
  RefreshCw,
  Loader2
} from 'lucide-react';

export function LeadCRM() {
  const { getIdToken } = useAuth();
  
  // Requirement 2: Live Inquiries state and loading indicator
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & View State
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Requirement 2: Fetch data from GET /api/admin/inquiries with Admin Firebase auth token
  const loadInquiries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const data = await fetchAdminInquiries(token);
      setInquiries(data);
    } catch (err: any) {
      console.error('Error loading live inquiries:', err);
      setError(err.message || 'Failed to retrieve live database inquiries.');
    } finally {
      setIsLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  // Requirement 3: Dynamic Metrics Calculation
  const totalInquiries = inquiries.length;
  const pendingValidation = inquiries.filter(
    (i) => i.status === 'Pending' || i.status === 'PENDING'
  ).length;
  const totalDemandedLoad = inquiries.reduce(
    (sum, i) => sum + (Number(i.calculatedKw) || 0),
    0
  );
  const grossPipelineCapex = inquiries.reduce(
    (sum, i) => sum + (Number(i.grossCost) || Number(i.calculatedCost) || 0),
    0
  );

  // Citizen satisfaction average score
  const avgSatisfaction = useMemo(() => {
    const rated = inquiries.filter((i) => i.feedbackRating && Number(i.feedbackRating) > 0);
    if (rated.length === 0) return '5.0';
    const sum = rated.reduce((acc, curr) => acc + Number(curr.feedbackRating), 0);
    return (sum / rated.length).toFixed(1);
  }, [inquiries]);

  // Filtered inquiries for search & status filters
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const inqStatus = (inq.status || '').toUpperCase();
        if (inqStatus !== statusFilter.toUpperCase()) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const meter = (inq.user?.meterNumber || inq.meterNumber || '').toLowerCase();
        const userName = (inq.user?.name || inq.name || inq.consumerName || '').toLowerCase();
        const userEmail = (inq.user?.email || inq.email || inq.userEmail || '').toLowerCase();
        const city = (inq.city || '').toLowerCase();
        const phone = (inq.userPhone || inq.consumerPhone || '').toLowerCase();
        if (!meter.includes(q) && !userName.includes(q) && !userEmail.includes(q) && !city.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [inquiries, statusFilter, searchQuery]);

  // Pagination for high density table view
  const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / pageSize));
  const paginatedInquiries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInquiries.slice(start, start + pageSize);
  }, [filteredInquiries, page, pageSize]);

  // Handle interactive status change in database
  const handleStatusChange = async (inquiryId: string, newStatus: LeadStatus) => {
    // Optimistic UI update
    setInquiries((prev) =>
      prev.map((inq) => (inq._id === inquiryId ? { ...inq, status: newStatus } : inq))
    );

    try {
      const token = await getIdToken();
      await updateInquiryStatus(inquiryId, newStatus, token);
    } catch (err: any) {
      console.error('Status update failed:', err);
      // Revert from server on failure
      loadInquiries();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards: Requirement 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Inquiries */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Inquiries
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {isLoading ? (
              <span className="animate-pulse text-slate-300">...</span>
            ) : (
              totalInquiries
            )}
          </div>
          <span className="text-[11px] text-slate-500">Live demand radar</span>
        </div>

        {/* Pending Validation */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Pending Validation
            </span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 mt-1">
            {isLoading ? (
              <span className="animate-pulse text-slate-300">...</span>
            ) : (
              pendingValidation
            )}
          </div>
          <span className="text-[11px] text-slate-500">Awaiting engineering check</span>
        </div>

        {/* Total Demanded Load */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Total Demanded Load
            </span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {isLoading ? (
              <span className="animate-pulse text-slate-300">...</span>
            ) : (
              <>
                {totalDemandedLoad.toFixed(1)}{' '}
                <span className="text-sm font-semibold">kW</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            ~{(totalDemandedLoad * 4).toFixed(0)} kWh/day generation
          </span>
        </div>

        {/* Gross Pipeline CapEx */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Gross Pipeline CapEx
            </span>
            <IndianRupee className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 mt-1">
            {isLoading ? (
              <span className="animate-pulse text-slate-300">...</span>
            ) : (
              <>
                ₹{(grossPipelineCapex / 100000).toFixed(1)}{' '}
                <span className="text-sm font-semibold">L</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            {formatINR(grossPipelineCapex)}
          </span>
        </div>

        {/* Citizen Feedback Score */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm col-span-2 lg:col-span-1 transition-all hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Avg Feedback Score
            </span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-600 mt-1 flex items-center gap-1.5">
            <span>{isLoading ? '...' : avgSatisfaction}</span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <span className="text-[11px] text-slate-500">Citizen satisfaction</span>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Meter #, User Name, Email, City..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
          />
        </form>

        {/* Status Filter & View Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses ({inquiries.length})</option>
              <option value="PENDING">Pending ({pendingValidation})</option>
              <option value="APPROVED">Approved ({inquiries.filter(i => (i.status || '').toUpperCase() === 'APPROVED').length})</option>
              <option value="COMMISSIONED">Commissioned ({inquiries.filter(i => (i.status || '').toUpperCase() === 'COMMISSIONED').length})</option>
            </select>
          </div>

          <div className="h-5 w-[1px] bg-slate-200" />

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadInquiries}
            disabled={isLoading}
            title="Refresh database inquiries"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <div className="h-5 w-[1px] bg-slate-200" />

          {/* View Mode Toggle */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadInquiries}
            className="font-semibold underline cursor-pointer text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main View Area: Table or Kanban */}
      {viewMode === 'kanban' ? (
        <LeadKanban leads={filteredInquiries} onStatusChange={handleStatusChange} />
      ) : (
        /* Requirement 4: Styled High-Density Live Database Inquiries Table */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User Name / Email</th>
                  <th className="py-3 px-4">Circle / City</th>
                  <th className="py-3 px-4">Input Mode</th>
                  <th className="py-3 px-4">Target kW</th>
                  <th className="py-3 px-4">Gross Cost</th>
                  <th className="py-3 px-4">Subsidy</th>
                  <th className="py-3 px-4">Net Outlay</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Status (Interactive)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* Requirement 4: Loading skeleton inside table body while isLoading is true */}
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-slate-200 rounded w-28 mb-1.5" />
                        <div className="h-3 bg-slate-100 rounded w-36" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-slate-100 rounded w-20" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-slate-100 rounded w-16" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-emerald-100/60 rounded w-20" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-emerald-100/60 rounded w-20" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-slate-100 rounded w-10" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-6 bg-slate-100 rounded-full w-24" />
                      </td>
                    </tr>
                  ))
                ) : filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                      No matching inquiries found in the database.
                    </td>
                  </tr>
                ) : (
                  paginatedInquiries.map((inquiry) => {
                    const userName = inquiry.user?.name || inquiry.name || inquiry.consumerName || 'Citizen User';
                    const userEmail = inquiry.user?.email || inquiry.email || inquiry.userEmail || (inquiry.consumerName ? `${inquiry.consumerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com` : 'citizen@example.com');
                    const calculatedKw = Number(inquiry.calculatedKw) || 0;
                    const grossCost = Number(inquiry.grossCost) || Number(inquiry.calculatedCost) || 0;
                    const subsidyAmount = Number(inquiry.subsidyAmount) || 0;
                    const netCost = Number(inquiry.netCost) || (grossCost - subsidyAmount);

                    return (
                      <tr key={inquiry._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Column 1: Display Name prominently and Email Address underneath */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm">
                            {userName}
                          </div>
                          <div className="text-xs text-slate-500 font-normal">
                            {userEmail}
                          </div>
                          {inquiry.vendorContacted && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold">
                              <Building className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>
                                Vendor: {(typeof inquiry.selectedVendorId === 'object' && inquiry.selectedVendorId?.companyName) || inquiry.selectedVendor?.companyName || 'Empanelled Vendor'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Column 2: Circle / City */}
                        <td className="py-3 px-4 text-slate-600">
                          {inquiry.city || 'Delhi NCR'}
                        </td>

                        {/* Column 3: Input Mode */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 uppercase font-semibold">
                            {inquiry.consumptionData?.type || 'BILL'}
                          </span>
                        </td>

                        {/* Column 4: calculatedKw */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {calculatedKw.toFixed(1)} kW
                          </span>
                          <div className="text-[10px] text-slate-400">
                            ~{(calculatedKw * 4).toFixed(0)} u/day
                          </div>
                        </td>

                        {/* Column 5: grossCost */}
                        <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                          {formatINR(grossCost)}
                        </td>

                        {/* Column 6: subsidyAmount */}
                        <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">
                          {formatINR(subsidyAmount)}
                        </td>

                        {/* Column 7: netCost */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatINR(netCost)}
                        </td>

                        {/* Column 8: Rating */}
                        <td className="py-3 px-4">
                          {inquiry.feedbackRating ? (
                            <div className="flex items-center gap-1 font-mono font-bold text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{inquiry.feedbackRating}.0</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Column 9: Status dropdown reading from DB status */}
                        <td className="py-3 px-4">
                          <StatusBadgeDropdown
                            currentStatus={inquiry.status as LeadStatus}
                            leadId={inquiry._id}
                            onStatusChange={handleStatusChange}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <strong>{filteredInquiries.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(page * pageSize, filteredInquiries.length)}</strong> of{' '}
              <strong>{filteredInquiries.length}</strong> inquiries
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="px-3 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer font-medium hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="px-3 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 cursor-pointer font-medium hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
