import React, { useState } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

export type LeadStatus = 'PENDING' | 'APPROVED' | 'COMMISSIONED' | 'Pending' | 'Approved' | 'Commissioned' | string;

interface StatusBadgeDropdownProps {
  currentStatus: LeadStatus;
  leadId: string;
  onStatusChange: (leadId: string, newStatus: any) => Promise<void>;
}

export function StatusBadgeDropdown({
  currentStatus,
  leadId,
  onStatusChange
}: StatusBadgeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const STATUS_CONFIG: Record<
    string,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    PENDING: {
      label: 'Pending',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
      dotClass: 'bg-amber-500'
    },
    APPROVED: {
      label: 'Approved',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
      dotClass: 'bg-purple-500'
    },
    COMMISSIONED: {
      label: 'Commissioned',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
      dotClass: 'bg-emerald-500'
    }
  };

  const normalizedKey = (currentStatus?.toUpperCase() || 'PENDING');
  const current = STATUS_CONFIG[normalizedKey] || STATUS_CONFIG.PENDING;

  const handleSelect = async (status: string) => {
    if (status.toUpperCase() === (currentStatus || '').toUpperCase()) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    setIsOpen(false);
    try {
      await onStatusChange(leadId, status);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${current.badgeClass} disabled:opacity-50`}
      >
        {isUpdating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${current.dotClass}`} />
        )}
        <span>{current.label}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              Update CRM Status
            </div>

            {(['PENDING', 'APPROVED', 'COMMISSIONED'] as LeadStatus[]).map(
              (statusKey) => {
                const config = STATUS_CONFIG[statusKey];
                const isSelected = statusKey === currentStatus;

                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => handleSelect(statusKey)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                      <span className={isSelected ? 'font-bold text-slate-900' : 'text-slate-700'}>
                        {config.label}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                );
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}
