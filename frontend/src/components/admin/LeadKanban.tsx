import React from 'react';
import { LeadItem } from '@/lib/api';
import { LeadStatus } from './StatusBadgeDropdown';
import { formatINR } from '@/lib/constants';
import {
  Sun,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Building,
  Phone
} from 'lucide-react';

interface LeadKanbanProps {
  leads: any[];
  onStatusChange: (leadId: string, newStatus: any) => Promise<void>;
}

const COLUMNS: {
  id: LeadStatus;
  title: string;
  badge: string;
  headerBorder: string;
}[] = [
  {
    id: 'PENDING',
    title: 'Pending Verification',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    headerBorder: 'border-t-amber-500'
  },
  {
    id: 'APPROVED',
    title: 'Feasibility Approved',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    headerBorder: 'border-t-purple-500'
  },
  {
    id: 'COMMISSIONED',
    title: 'Commissioned & Grid Synced',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerBorder: 'border-t-emerald-500'
  }
];

export function LeadKanban({ leads, onStatusChange }: LeadKanbanProps) {
  const getNextStatus = (current: LeadStatus): LeadStatus | null => {
    switch (current) {
      case 'PENDING':
        return 'APPROVED';
      case 'APPROVED':
        return 'COMMISSIONED';
      default:
        return null;
    }
  };

  const getNextActionLabel = (current: LeadStatus): string => {
    switch (current) {
      case 'PENDING':
        return 'Approve Feasibility →';
      case 'APPROVED':
        return 'Mark Commissioned ✓';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((item) => (item.status || '').toUpperCase() === col.id);
        const colTotalKw = colLeads.reduce((sum, item) => sum + (item.calculatedKw || 0), 0);

        return (
          <div
            key={col.id}
            className={`bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-col max-h-[calc(100vh-250px)] border-t-4 ${col.headerBorder}`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200/80 bg-white/60 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{col.title}</h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {colTotalKw.toFixed(1)} kW demand
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.badge}`}>
                {colLeads.length}
              </span>
            </div>

            {/* Column Cards List */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {colLeads.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No inquiries in this phase
                </div>
              ) : (
                colLeads.map((lead) => {
                  const nextStatus = getNextStatus(lead.status);

                  return (
                    <div
                      key={lead._id}
                      className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 group"
                    >
                      {/* Top Row: Meter & Rating */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {lead.meterNumber}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-800 mt-1.5">
                            {lead.consumerName || 'Residential Consumer'}
                          </h4>
                        </div>

                        {lead.feedbackRating && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{lead.feedbackRating}.0</span>
                          </div>
                        )}
                      </div>

                      {/* Location & Input Mode */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{lead.city || 'Delhi NCR'}</span>
                        </div>
                        <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                          {lead.consumptionData.type}
                        </span>
                      </div>

                      {/* Admin CRM Sync: Blue Vendor Contacted Badge */}
                      {lead.vendorContacted && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                          <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">
                            Vendor Contacted: {(typeof lead.selectedVendorId === 'object' && lead.selectedVendorId?.companyName) || lead.selectedVendor?.companyName || 'Empanelled Vendor'}
                          </span>
                        </div>
                      )}

                      {lead.userPhone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono px-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Phone: {lead.userPhone}</span>
                        </div>
                      )}

                      {/* Metrics: kW & Net Cost */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Capacity
                          </span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {lead.calculatedKw.toFixed(1)} kW
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Net Outlay
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {formatINR(lead.netCost || lead.calculatedCost)}
                          </span>
                        </div>
                      </div>

                      {/* Action Button to progress status */}
                      {nextStatus && (
                        <button
                          type="button"
                          onClick={() => onStatusChange(lead._id, nextStatus)}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-colors cursor-pointer border border-slate-200 hover:border-slate-900"
                        >
                          <span>{getNextActionLabel(lead.status)}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
