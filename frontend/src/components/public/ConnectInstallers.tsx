import React from 'react';
import {
  Award,
  Download,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface ConnectInstallersProps {
  inquiryId?: string;
  meterNumber?: string;
  calculatedKw?: number;
  initialCity?: string;
  onVendorContacted?: (vendorName: string) => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
}

export function ConnectInstallers({
  calculatedKw = 0,
  onDownloadPdf,
  isDownloadingPdf
}: ConnectInstallersProps) {
  const googleSearchUrl =
    'https://www.google.com/search?q=solar+pennel+vendors+nearby&sca_esv=7a80360a426ed37a&sxsrf=APpeQnuCc3DjeXbiMqcpP9ShRSDpmgX4dg%3A1791095326059&ei=HvLBapyYA4f2seMPyIKUyAk&biw=1536&bih=730&uact=5&oq=solar+pennel+vendors+nearby';

  return (
    <div className="w-full mt-8 p-6 sm:p-8 rounded-3xl glass-card-dark border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>MNRE & State Gov Empanelled Installers</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Connect with Approved Local Installers</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Forward your verified{' '}
            <strong className="text-white font-mono">{calculatedKw.toFixed(1)} kW</strong> sizing{' '}
            report directly to certified EPC contractors for site survey & subsidy processing.
          </p>
        </div>

        {onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Generating Document...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Detailed PDF Report</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Centered Primary Call-To-Action: Solar Capital External Link Button */}
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center space-y-4">
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <button
            type="button"
            className="inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-extrabold text-slate-950 bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:from-lime-300 hover:to-emerald-300 shadow-[0_0_35px_rgba(132,204,22,0.45)] hover:shadow-[0_0_55px_rgba(132,204,22,0.65)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer tracking-wide"
          >
            <span>Solar Capital</span>
            <ExternalLink className="w-5 h-5 text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </a>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md">
          Explore nearby certified solar panel installers and approved vendors on Google Search.
        </p>
      </div>
    </div>
  );
}
