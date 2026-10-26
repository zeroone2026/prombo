import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  User,
  Mail,
  Trash2,
  Filter,
  RefreshCw,
  AlertOctagon,
  FileText,
  CornerDownLeft,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ModerationReport, ReportStatus, ReportTargetType } from '../../types';
import { ReportService } from '../../services/reportService';
import { useApp } from '../../context/AppContext';
import { copyTextToClipboard } from '../../utils/slugUtils';
import { AdminConfirmationModal } from './AdminConfirmationModal';

interface AdminReportsSectionProps {
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshParent?: () => void;
}

export const AdminReportsSection: React.FC<AdminReportsSectionProps> = ({
  onShowToast,
}) => {
  const { t, language, isRTL } = useApp();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | ReportTargetType>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await ReportService.getAllReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      onShowToast(language === 'ar' ? 'حدث خطأ أثناء تحميل البلاغات' : 'Failed to load reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();

    // Listen to real-time events when new report is submitted
    const handleReportAdded = () => {
      loadReports();
    };
    const handleReportUpdated = () => {
      loadReports();
    };

    window.addEventListener('prombo_report_added', handleReportAdded);
    window.addEventListener('prombo_report_updated', handleReportUpdated);

    return () => {
      window.removeEventListener('prombo_report_added', handleReportAdded);
      window.removeEventListener('prombo_report_updated', handleReportUpdated);
    };
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      await ReportService.updateReportStatus(reportId, newStatus);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      const statusLabel =
        newStatus === 'resolved'
          ? language === 'ar'
            ? 'تم تحديد البلاغ كـ معالج ومغلق'
            : 'Report marked as resolved'
          : newStatus === 'dismissed'
          ? language === 'ar'
            ? 'تم رفض / تجاهل البلاغ'
            : 'Report dismissed'
          : language === 'ar'
          ? 'تمت إعادة البلاغ لقيد المراجعة'
          : 'Report reopened';

      onShowToast(statusLabel, 'success');
    } catch (err) {
      onShowToast(language === 'ar' ? 'فشل تحديث حالة البلاغ' : 'Failed to update report', 'error');
    }
  };

  const [reportToDelete, setReportToDelete] = useState<ModerationReport | null>(null);

  const handleDeleteReport = (report: ModerationReport) => {
    setReportToDelete(report);
  };

  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;
    const reportId = reportToDelete.id;
    try {
      await ReportService.deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      onShowToast(language === 'ar' ? 'تم حذف البلاغ بنجاح' : 'Report deleted successfully', 'info');
      setReportToDelete(null);
    } catch {
      onShowToast(language === 'ar' ? 'فشل حذف البلاغ' : 'Failed to delete report', 'error');
    }
  };

  const handleCopyLink = async (url: string, id: string) => {
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      onShowToast(language === 'ar' ? 'تم نسخ الرابط المباشر للمحتوى' : 'Direct link copied', 'success');
    }
  };

  // KPI counts
  const totalCount = reports.length;
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const dismissedCount = reports.filter((r) => r.status === 'dismissed').length;

  // Filtered reports
  const filteredReports = reports.filter((report) => {
    // Status filter
    if (statusFilter !== 'all' && report.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && report.targetType !== typeFilter) {
      return false;
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchReporter =
        (report.reporterName && report.reporterName.toLowerCase().includes(q)) ||
        (report.reporterEmail && report.reporterEmail.toLowerCase().includes(q));
      const matchReportedUser =
        (report.reportedUserName && report.reportedUserName.toLowerCase().includes(q)) ||
        (report.reportedUserEmail && report.reportedUserEmail.toLowerCase().includes(q));
      const matchContent =
        (report.targetTitle && report.targetTitle.toLowerCase().includes(q)) ||
        (report.targetContent && report.targetContent.toLowerCase().includes(q)) ||
        (report.customReason && report.customReason.toLowerCase().includes(q)) ||
        (report.tag && report.tag.toLowerCase().includes(q));

      return matchReporter || matchReportedUser || matchContent;
    }

    return true;
  });

  const getTargetTypeBadge = (type: ReportTargetType) => {
    switch (type) {
      case 'prompt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'ar' ? 'أمر برومبت' : 'Prompt'}</span>
          </span>
        );
      case 'post':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <FileText className="w-3 h-3" />
            <span>{language === 'ar' ? 'منشور مجتمعي' : 'Post'}</span>
          </span>
        );
      case 'reply':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            <CornerDownLeft className="w-3 h-3" />
            <span>{language === 'ar' ? 'رد' : 'Reply'}</span>
          </span>
        );
      case 'comment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <MessageSquare className="w-3 h-3" />
            <span>{language === 'ar' ? 'تعليق' : 'Comment'}</span>
          </span>
        );
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#2A384C]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'طابور الشكاوي والبلاغات' : 'Moderation & Reports Queue'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'متابعة وفحص البلاغات الواردة من المستخدمين والزوار واتخاذ الإجراءات الرادعة'
                  : 'Review incoming violation reports, inspect payloads, and moderate user content'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadReports}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1f2c3e] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث البلاغات' : 'Refresh'}</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'إجمالي البلاغات' : 'Total Reports'}
            </span>
            <AlertOctagon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {totalCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
              {language === 'ar' ? 'قيد المراجعة' : 'Pending Review'}
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-200 mt-1">
            {pendingCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
              {language === 'ar' ? 'تم التعامل معها' : 'Resolved'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-1">
            {resolvedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {language === 'ar' ? 'مرفوضة / متجاهلة' : 'Dismissed'}
            </span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-300 mt-1">
            {dismissedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#182232] p-3.5 rounded-2xl border border-slate-200 dark:border-[#2A384C] shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'بحث بالاسم، البريد، سبب البلاغ، أو محتوى النص المخالف...'
                : 'Search by reporter, reported user, tag, or content snippet...'
            }
            className={`w-full text-xs py-2 bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-slate-100 ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filters */}
          <div className="flex items-center bg-slate-100 dark:bg-[#121824] p-1 rounded-xl border border-slate-200 dark:border-[#2A384C]">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'قيد المراجعة' : 'Pending'} ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'معالجة' : 'Resolved'} ({resolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('dismissed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'dismissed'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'متجاهلة' : 'Dismissed'} ({dismissedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'} ({totalCount})
            </button>
          </div>

          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121824] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#2A384C]">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-hidden cursor-pointer"
            >
              <option value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
              <option value="post">{language === 'ar' ? 'منشورات' : 'Posts'}</option>
              <option value="prompt">{language === 'ar' ? 'أوامر برومبت' : 'Prompts'}</option>
              <option value="reply">{language === 'ar' ? 'ردود' : 'Replies'}</option>
              <option value="comment">{language === 'ar' ? 'تعليقات' : 'Comments'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#182232] rounded-2xl border border-slate-200 dark:border-[#2A384C]">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-xs text-slate-500">{language === 'ar' ? 'جاري تحميل قائمة البلاغات...' : 'Loading reports queue...'}</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#182232] rounded-2xl border border-slate-200 dark:border-[#2A384C]">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {language === 'ar' ? 'لا توجد بلاغات تطابق التصفية الحالية' : 'No reports matching current filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {language === 'ar'
              ? 'كل شيء سليم وتحت السيطرة، أو قم بتغيير فلاتر البحث للاطلاع على البلاغات الأخرى.'
              : 'The moderation queue is clear for the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReports.map((report) => {
            const isPending = report.status === 'pending';
            const isResolved = report.status === 'resolved';
            const isDismissed = report.status === 'dismissed';

            return (
              <div
                key={report.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#182232] border transition-all shadow-xs ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-800/60 ring-1 ring-amber-400/20'
                    : 'border-slate-200 dark:border-[#2A384C]'
                }`}
              >
                {/* Report Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#233144]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Target Type Badge */}
                    {getTargetTypeBadge(report.targetType)}

                    {/* Predefined Tag Badge (High contrast solid gray badge) */}
                    {report.tag && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-900 shadow-2xs">
                        {report.tag}
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isPending
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50'
                          : isResolved
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isPending && <Clock className="w-3 h-3" />}
                      {isResolved && <CheckCircle2 className="w-3 h-3" />}
                      {isDismissed && <XCircle className="w-3 h-3" />}
                      <span>
                        {isPending
                          ? language === 'ar'
                            ? 'قيد المراجعة'
                            : 'Pending'
                          : isResolved
                          ? language === 'ar'
                            ? 'تم التعامل'
                            : 'Resolved'
                          : language === 'ar'
                          ? 'مرفوض / متجاهل'
                          : 'Dismissed'}
                      </span>
                    </span>
                  </div>

                  {/* Creation Time */}
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {formatDateTime(report.createdAt)}
                  </span>
                </div>

                {/* Report Payload Details Grid:
                    - Reporter Name/Email
                    - Reported User Name/Email
                    - Complaint Content/Tag
                    - Direct Content URL Link
                */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                  {/* Left Column: People (Reporter & Reported User) */}
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#141b28] border border-slate-200/80 dark:border-[#233144]">
                    {/* Reporter Info */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {language === 'ar' ? 'مقدم البلاغ (Reporter):' : 'Reporter:'}
                      </span>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                        <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{report.reporterName || (language === 'ar' ? 'زائر' : 'Guest')}</span>
                      </div>
                      {report.reporterEmail && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{report.reporterEmail}</span>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-slate-200 dark:bg-[#233144]" />

                    {/* Reported User Info */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {language === 'ar' ? 'المستخدم المبلغ عنه (Reported User):' : 'Reported User:'}
                      </span>
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                        <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{report.reportedUserName || (language === 'ar' ? 'مستخدم غير محدد' : 'Unknown')}</span>
                      </div>
                      {report.reportedUserEmail && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{report.reportedUserEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Complaint Reason & Snippet */}
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#141b28] border border-slate-200/80 dark:border-[#233144]">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {language === 'ar' ? 'محتوى الشكوى / سبب البلاغ:' : 'Complaint Reason:'}
                      </span>
                      {report.tag && (
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="text-slate-500 font-normal">{language === 'ar' ? 'التصنيف:' : 'Category:'}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {report.tag}
                          </span>
                        </div>
                      )}
                      {report.customReason ? (
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-white dark:bg-[#182232] p-2 rounded-lg border border-slate-200 dark:border-[#2a384c]">
                          «{report.customReason}»
                        </p>
                      ) : (
                        !report.tag && (
                          <span className="text-xs text-slate-400 italic">
                            {language === 'ar' ? 'لم يتم إدخال تفاصيل إضافية' : 'No extra details provided'}
                          </span>
                        )
                      )}
                    </div>

                    {/* Target Content Snippet */}
                    {(report.targetTitle || report.targetContent) && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          {language === 'ar' ? 'محتوى المنشور أو البرومبت المخالف:' : 'Target Content Snippet:'}
                        </span>
                        {report.targetTitle && (
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                            {report.targetTitle}
                          </div>
                        )}
                        {report.targetContent && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 italic">
                            "{report.targetContent}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Content URL Link bar */}
                <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-[200px]">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {language === 'ar' ? 'الرابط المباشر:' : 'Direct URL:'}
                    </span>
                    <a
                      href={report.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline truncate inline-flex items-center gap-1"
                    >
                      <span className="truncate">{report.contentUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(report.contentUrl, report.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1f2c3e] transition-colors cursor-pointer"
                    >
                      {copiedId === report.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>{t('actions.linkCopied') || (language === 'ar' ? 'تم النسخ' : 'Copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>{t('actions.copyLink')}</span>
                        </>
                      )}
                    </button>

                    <a
                      href={report.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{language === 'ar' ? 'معاينة المحتوى' : 'Inspect'}</span>
                    </a>
                  </div>
                </div>

                {/* Bottom Actions: Status Controls & Delete */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#233144] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Resolve button */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      disabled={isResolved}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300 opacity-60 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'قبول / تم التعامل' : 'Mark Resolved'}</span>
                    </button>

                    {/* Dismiss button */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      disabled={isDismissed}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isDismissed
                          ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 opacity-60 cursor-default'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{language === 'ar' ? 'تجاهل / رفض البلاغ' : 'Dismiss'}</span>
                    </button>

                    {/* Reopen button */}
                    {(isResolved || isDismissed) && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'pending')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إعادة قيد المراجعة' : 'Reopen'}</span>
                      </button>
                    )}
                  </div>

                  {/* Delete Report record */}
                  <button
                    type="button"
                    onClick={() => handleDeleteReport(report)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                    title={language === 'ar' ? 'حذف سجل البلاغ' : 'Delete report record'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Styled Admin Confirmation Modal */}
      <AdminConfirmationModal
        isOpen={Boolean(reportToDelete)}
        onClose={() => setReportToDelete(null)}
        onConfirm={handleConfirmDeleteReport}
        title={language === 'ar' ? 'حذف سجل البلاغ نهائياً' : 'Delete Report Record'}
        description={
          language === 'ar'
            ? 'هل أنت متأكد من رغبتك في إزالة هذا البلاغ بشكل نهائي من الأرشيف؟ لا يمكن التراجع عن هذه العملية.'
            : 'Are you sure you want to permanently remove this moderation report from the database? This action cannot be undone.'
        }
        variant="danger"
        confirmText={language === 'ar' ? 'تأكيد حذف البلاغ' : 'Delete Report'}
        details={
          reportToDelete
            ? [
                { label: language === 'ar' ? 'معرّف البلاغ' : 'Report ID', value: reportToDelete.id },
                { label: language === 'ar' ? 'نوع المحتوى' : 'Target Type', value: reportToDelete.targetType },
                { label: language === 'ar' ? 'السبب' : 'Reason', value: reportToDelete.reason },
              ]
            : undefined
        }
      />
    </div>
  );
};
