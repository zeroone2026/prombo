import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Mail,
  AtSign,
  Tag,
  FileText,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Plus,
  MessageSquare,
  CornerDownLeft,
  CornerDownRight,
  Shield,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  Code2,
  Share2,
  Info,
  Calendar,
} from 'lucide-react';
import { AuditLogEntry, AuditLogAction, AuditLogTargetType } from '../../types';
import { AuditService } from '../../services/auditService';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../UserAvatar';
import { formatTimeAgo } from '../../utils/dateUtils';

interface AdminAuditLogSectionProps {
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

// Action classification for easy filtering
type ActionCategory = 'all' | 'prompts' | 'posts' | 'comments' | 'moderation_profile';

export const AdminAuditLogSection: React.FC<AdminAuditLogSectionProps> = ({ onShowToast }) => {
  const { language, isRTL } = useApp();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Inspect modal
  const [inspectedLog, setInspectedLog] = useState<AuditLogEntry | null>(null);

  // Fetch logs
  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await AuditService.getAuditLogs({ limit: 300 });
      const logList = Array.isArray(result) ? result : (Array.isArray(result?.logs) ? result.logs : []);
      setLogs(logList);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
      // Fallback to local
      setLogs(AuditService.getLocalAuditLogs());
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load and Realtime subscription
  useEffect(() => {
    fetchLogs();

    // Subscribe to both Supabase Realtime and Window Events
    const unsubscribe = AuditService.subscribeToAuditLogs((newEntry) => {
      setLogs((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        // Prevent duplicate insertion if already in array
        if (safePrev.some((item) => item.id === newEntry.id)) {
          return safePrev;
        }
        return [newEntry, ...safePrev];
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtered and Sorted Logs
  const filteredLogs = useMemo(() => {
    const safeLogs = Array.isArray(logs) ? logs : [];
    return safeLogs.filter((log) => {
      // 1. Category Filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'prompts') {
          if (!['CREATE_PROMPT', 'UPDATE_PROMPT', 'DELETE_PROMPT'].includes(log.action)) {
            return false;
          }
        } else if (selectedCategory === 'posts') {
          if (!['CREATE_POST', 'UPDATE_POST', 'DELETE_POST'].includes(log.action)) {
            return false;
          }
        } else if (selectedCategory === 'comments') {
          if (!['CREATE_COMMENT_POST', 'ADD_REPLY', 'ADD_NESTED_REPLY'].includes(log.action)) {
            return false;
          }
        } else if (selectedCategory === 'moderation_profile') {
          if (!['PIN_REPLY', 'UNPIN_REPLY', 'UPDATE_PROFILE'].includes(log.action)) {
            return false;
          }
        }
      }

      // 2. Specific Action Filter
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }

      // 3. Search Query (Matches user name, email, slug, target title, or ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (log.userName || '').toLowerCase().includes(q);
        const matchEmail = (log.userEmail || '').toLowerCase().includes(q);
        const matchSlug = (log.userSlug || '').toLowerCase().includes(q);
        const matchTitle = (log.targetTitle || '').toLowerCase().includes(q);
        const matchId = (log.id || '').toLowerCase().includes(q) || (log.targetId || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchSlug && !matchTitle && !matchId) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [logs, selectedCategory, selectedAction, searchQuery, sortOrder]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedAction, pageSize]);

  // Export as CSV
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Action', 'TargetType', 'TargetTitle', 'User', 'UserEmail', 'UserSlug', 'ContentURL', 'Date'];
      const rows = filteredLogs.map((l) => [
        `"${l.id}"`,
        `"${l.action}"`,
        `"${l.targetType}"`,
        `"${(l.targetTitle || '').replace(/"/g, '""')}"`,
        `"${(l.userName || '').replace(/"/g, '""')}"`,
        `"${l.userEmail || ''}"`,
        `"${l.userSlug || ''}"`,
        `"${l.contentUrl || ''}"`,
        `"${l.createdAt}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prombo_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast(language === 'ar' ? 'تم تصدير سجل التدقيق بصيغة CSV' : 'Exported audit logs as CSV', 'success');
    } catch {
      onShowToast(language === 'ar' ? 'فشل تصدير الملف' : 'Export failed', 'error');
    }
  };

  // Export as JSON
  const handleExportJSON = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `prombo_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onShowToast(language === 'ar' ? 'تم تصدير سجل التدقيق بصيغة JSON' : 'Exported audit logs as JSON', 'success');
    } catch {
      onShowToast(language === 'ar' ? 'فشل تصدير الملف' : 'Export failed', 'error');
    }
  };

  // Helper for exact date-time
  const formatExactDate = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  // Action badge configurations
  const getActionConfig = (action: AuditLogAction) => {
    switch (action) {
      case 'CREATE_PROMPT':
        return {
          label: language === 'ar' ? 'إنشاء مجلد برومبت' : 'Create Prompt Folder',
          badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          icon: Plus,
          dotClass: 'bg-emerald-500',
        };
      case 'UPDATE_PROMPT':
        return {
          label: language === 'ar' ? 'تعديل مجلد برومبت' : 'Update Prompt Folder',
          badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
          icon: Edit3,
          dotClass: 'bg-blue-500',
        };
      case 'DELETE_PROMPT':
        return {
          label: language === 'ar' ? 'حذف مجلد برومبت' : 'Delete Prompt Folder',
          badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
          icon: Trash2,
          dotClass: 'bg-rose-500',
        };
      case 'CREATE_POST':
        return {
          label: language === 'ar' ? 'نشر منشور مجتمع' : 'Create Community Post',
          badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
          icon: MessageSquare,
          dotClass: 'bg-teal-500',
        };
      case 'UPDATE_POST':
        return {
          label: language === 'ar' ? 'تعديل منشور' : 'Edit Post',
          badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
          icon: Edit3,
          dotClass: 'bg-indigo-500',
        };
      case 'DELETE_POST':
        return {
          label: language === 'ar' ? 'حذف منشور' : 'Delete Post',
          badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
          icon: Trash2,
          dotClass: 'bg-red-500',
        };
      case 'CREATE_COMMENT_POST':
        return {
          label: language === 'ar' ? 'تعليق على مجلد' : 'Folder Comment Post',
          badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
          icon: MessageSquare,
          dotClass: 'bg-cyan-500',
        };
      case 'ADD_REPLY':
        return {
          label: language === 'ar' ? 'إضافة رد' : 'Add Reply',
          badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
          icon: CornerDownLeft,
          dotClass: 'bg-sky-500',
        };
      case 'ADD_NESTED_REPLY':
        return {
          label: language === 'ar' ? 'رد فرعي متداخل' : 'Add Nested Reply',
          badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
          icon: CornerDownRight,
          dotClass: 'bg-violet-500',
        };
      case 'PIN_REPLY':
        return {
          label: language === 'ar' ? 'تثبيت رد' : 'Pin Reply',
          badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          icon: Pin,
          dotClass: 'bg-amber-500',
        };
      case 'UNPIN_REPLY':
        return {
          label: language === 'ar' ? 'إلغاء تثبيت رد' : 'Unpin Reply',
          badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
          icon: PinOff,
          dotClass: 'bg-slate-500',
        };
      case 'UPDATE_PROFILE':
        return {
          label: language === 'ar' ? 'تحديث الملف الشخصي' : 'Update Profile',
          badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
          icon: User,
          dotClass: 'bg-purple-500',
        };
      default:
        return {
          label: String(action),
          badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
          icon: Activity,
          dotClass: 'bg-slate-500',
        };
    }
  };

  // Helper for target type badge
  const getTargetTypeBadge = (targetType: AuditLogTargetType) => {
    switch (targetType) {
      case 'prompt':
        return {
          label: language === 'ar' ? 'مجلد برومبت' : 'Prompt',
          badge: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
        };
      case 'post':
        return {
          label: language === 'ar' ? 'منشور مجتمع' : 'Post',
          badge: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
        };
      case 'comment':
        return {
          label: language === 'ar' ? 'تعليق مجلد' : 'Comment',
          badge: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30',
        };
      case 'reply':
        return {
          label: language === 'ar' ? 'رد' : 'Reply',
          badge: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30',
        };
      case 'profile':
        return {
          label: language === 'ar' ? 'ملف شخصي' : 'Profile',
          badge: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
        };
      default:
        return {
          label: String(targetType),
          badge: 'bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header Title & Live Pulse */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {language === 'ar' ? 'سجل التدقيق والمراقبة المركزي' : 'Centralized Audit & Action Log'}
                </h2>
                {/* Live Realtime Indicator */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{language === 'ar' ? 'مراقبة فورية نشطة' : 'Live Sync Active'}</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {language === 'ar'
                  ? 'رصد وتوثيق كافة العمليات والأحداث التغييرية في المنصة (المجلدات، المنشورات، الردود، والملفات الشخصية)'
                  : 'Track and audit all state-changing events across Prombo (folders, community posts, replies, and author updates)'}
              </p>
            </div>
          </div>

          {/* Quick Actions (Refresh & Export) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#121824] hover:bg-slate-200 dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
              <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#121824] hover:bg-slate-200 dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#121824] hover:bg-slate-200 dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-[#2A384C]/60">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200/70 dark:border-[#2A384C]/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'إجمالي السجلات' : 'Total Log Entries'}
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {logs.length.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200/70 dark:border-[#2A384C]/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'عمليات البرومبت' : 'Prompt Actions'}
            </div>
            <div className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-1">
              {logs.filter((l) => ['CREATE_PROMPT', 'UPDATE_PROMPT', 'DELETE_PROMPT'].includes(l.action)).length}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200/70 dark:border-[#2A384C]/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'المنشورات والردود' : 'Posts & Replies'}
            </div>
            <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
              {logs.filter((l) => ['CREATE_POST', 'UPDATE_POST', 'DELETE_POST', 'CREATE_COMMENT_POST', 'ADD_REPLY', 'ADD_NESTED_REPLY'].includes(l.action)).length}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200/70 dark:border-[#2A384C]/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'نتائج التصفية' : 'Filtered Matches'}
            </div>
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {filteredLogs.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'بحث بالاسم، البريد الإلكتروني، المعرّف @slug، العنوان، أو ID...'
                  : 'Search user name, email, @slug, content title, or ID...'
              }
              className={`w-full h-10 text-xs sm:text-sm bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 ${
                isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ${
                  isRTL ? 'left-3' : 'right-3'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'}
            </button>

            <button
              onClick={() => setSelectedCategory('prompts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'prompts'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'مجلدات الأوامر' : 'Prompts'}
            </button>

            <button
              onClick={() => setSelectedCategory('posts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'posts'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'منشورات المجتمع' : 'Community Posts'}
            </button>

            <button
              onClick={() => setSelectedCategory('comments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'comments'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'التعليقات والردود' : 'Comments & Replies'}
            </button>

            <button
              onClick={() => setSelectedCategory('moderation_profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'moderation_profile'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'الإشراف والملف الشخصي' : 'Moderation & Profile'}
            </button>
          </div>

          {/* Specific Action Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="h-10 text-xs bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl px-3 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="all">{language === 'ar' ? 'كل أنواع الإجراءات' : 'All Action Types'}</option>
              <option value="CREATE_PROMPT">{language === 'ar' ? 'إنشاء مجلد برومبت' : 'CREATE_PROMPT'}</option>
              <option value="UPDATE_PROMPT">{language === 'ar' ? 'تعديل مجلد برومبت' : 'UPDATE_PROMPT'}</option>
              <option value="DELETE_PROMPT">{language === 'ar' ? 'حذف مجلد برومبت' : 'DELETE_PROMPT'}</option>
              <option value="CREATE_POST">{language === 'ar' ? 'نشر منشور مجتمع' : 'CREATE_POST'}</option>
              <option value="UPDATE_POST">{language === 'ar' ? 'تعديل منشور' : 'UPDATE_POST'}</option>
              <option value="DELETE_POST">{language === 'ar' ? 'حذف منشور' : 'DELETE_POST'}</option>
              <option value="CREATE_COMMENT_POST">{language === 'ar' ? 'تعليق مجلد' : 'CREATE_COMMENT_POST'}</option>
              <option value="ADD_REPLY">{language === 'ar' ? 'إضافة رد' : 'ADD_REPLY'}</option>
              <option value="ADD_NESTED_REPLY">{language === 'ar' ? 'رد متداخل' : 'ADD_NESTED_REPLY'}</option>
              <option value="PIN_REPLY">{language === 'ar' ? 'تثبيت رد' : 'PIN_REPLY'}</option>
              <option value="UNPIN_REPLY">{language === 'ar' ? 'إلغاء تثبيت رد' : 'UNPIN_REPLY'}</option>
              <option value="UPDATE_PROFILE">{language === 'ar' ? 'تحديث الملف الشخصي' : 'UPDATE_PROFILE'}</option>
            </select>

            {/* Sort Order Button */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e293b] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortOrder === 'desc' ? (language === 'ar' ? 'الأحدث أولاً' : 'Newest') : (language === 'ar' ? 'الأقدم أولاً' : 'Oldest')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Contrast Data Table */}
      <div className="rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#141c2b] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2A384C]">
              <tr>
                <th className="p-3.5 font-semibold">{language === 'ar' ? 'المستخدم المنفّذ' : 'Actor / User'}</th>
                <th className="p-3.5 font-semibold">{language === 'ar' ? 'نوع الإجراء' : 'Action Type'}</th>
                <th className="p-3.5 font-semibold">{language === 'ar' ? 'الكيان / المحتوى المستهدف' : 'Target Entity / Content'}</th>
                <th className="p-3.5 font-semibold">{language === 'ar' ? 'التوقيت' : 'Timestamp'}</th>
                <th className="p-3.5 font-semibold text-center">{language === 'ar' ? 'الإجراءات' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2A384C]/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                      <span>{language === 'ar' ? 'جاري تحميل سجل التدقيق...' : 'Loading audit logs...'}</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {language === 'ar' ? 'لا توجد سجلات مطابقة للبحث والتصفية' : 'No audit entries match current filters'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {language === 'ar' ? 'جرّب تغيير كلمات البحث أو إعادة ضبط التصنيفات.' : 'Try changing your search terms or clearing filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((entry) => {
                  const actionCfg = getActionConfig(entry.action);
                  const targetTypeCfg = getTargetTypeBadge(entry.targetType);
                  const ActionIcon = actionCfg.icon;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#1f2b3e]/60 transition-colors"
                    >
                      {/* Performing User Column */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={entry.userName}
                            avatar={entry.userAvatar}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#2A384C] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                              <span>{entry.userName}</span>
                            </div>
                            {/* Canonical User Slug Route */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <a
                                href={entry.userProfileUrl || `https://prombo.app/user/${entry.userSlug || '@user'}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-mono text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                                title={entry.userProfileUrl}
                              >
                                <span>{entry.userSlug || `@${entry.userName.replace(/\s+/g, '_').toLowerCase()}`}</span>
                              </a>
                              {entry.userEmail && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline truncate max-w-[140px]">
                                  • {entry.userEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge Column */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${actionCfg.badgeClass}`}
                        >
                          <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{actionCfg.label}</span>
                        </span>
                      </td>

                      {/* Target Content Entity Column */}
                      <td className="p-3.5">
                        <div className="space-y-1 max-w-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Target Type Tag */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${targetTypeCfg.badge}`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>{targetTypeCfg.label}</span>
                            </span>

                            {/* Direct Content Link */}
                            {entry.contentUrl && (
                              <a
                                href={entry.contentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-colors"
                                title={entry.contentUrl}
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="underline">{language === 'ar' ? 'معاينة المحتوى' : 'View Content'}</span>
                              </a>
                            )}
                          </div>

                          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs line-clamp-2">
                            {entry.targetTitle}
                          </div>
                        </div>
                      </td>

                      {/* Timestamp Column */}
                      <td className="p-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatTimeAgo(entry.createdAt, language)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {formatExactDate(entry.createdAt)}
                        </div>
                      </td>

                      {/* Details / Action Button */}
                      <td className="p-3.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => setInspectedLog(entry)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#121824] hover:bg-slate-200 dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2A384C] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'فحص التفاصيل' : 'Inspect'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 bg-slate-50 dark:bg-[#141c2b] border-t border-slate-200 dark:border-[#2A384C] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {language === 'ar'
                ? `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(currentPage * pageSize, totalItems)} من أصل ${totalItems} سجل`
                : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} entries`}
            </span>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value={10}>10 / {language === 'ar' ? 'صفحة' : 'page'}</option>
              <option value={15}>15 / {language === 'ar' ? 'صفحة' : 'page'}</option>
              <option value={30}>30 / {language === 'ar' ? 'صفحة' : 'page'}</option>
              <option value={50}>50 / {language === 'ar' ? 'صفحة' : 'page'}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] hover:bg-slate-100 dark:hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] hover:bg-slate-100 dark:hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Log Payload Modal */}
      <AnimatePresence>
        {inspectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-[calc(100vw-1.5rem)] max-w-2xl mx-auto bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2A384C] flex items-center justify-between bg-slate-50 dark:bg-[#141c2b]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {language === 'ar' ? 'تفاصيل سجل التدقيق' : 'Audit Log Record Details'}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      ID: {inspectedLog.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1e293b] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* User Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] space-y-2">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'ar' ? 'المستخدم المنفذ للعملية' : 'Performing Actor'}
                  </div>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={inspectedLog.userName} avatar={inspectedLog.userAvatar} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {inspectedLog.userName}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-slate-500">
                        <span className="font-mono text-orange-600 dark:text-orange-400 font-semibold">
                          {inspectedLog.userSlug || '@user'}
                        </span>
                        {inspectedLog.userEmail && <span>• {inspectedLog.userEmail}</span>}
                        {inspectedLog.userId && <span className="font-mono text-[10px]">({inspectedLog.userId})</span>}
                      </div>
                    </div>
                  </div>
                  {inspectedLog.userProfileUrl && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A384C]/50 flex items-center justify-between">
                      <span className="text-slate-500">{language === 'ar' ? 'رابط الملف الشخصي:' : 'Profile URL:'}</span>
                      <a
                        href={inspectedLog.userProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 dark:text-orange-400 font-mono hover:underline inline-flex items-center gap-1"
                      >
                        <span>{inspectedLog.userProfileUrl}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Event Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C]">
                    <div className="text-slate-500 font-semibold mb-1">{language === 'ar' ? 'نوع الإجراء' : 'Action'}</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {inspectedLog.action}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C]">
                    <div className="text-slate-500 font-semibold mb-1">{language === 'ar' ? 'نوع الكيان' : 'Target Type'}</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {inspectedLog.targetType}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C]">
                    <div className="text-slate-500 font-semibold mb-1">{language === 'ar' ? 'التوقيت الدقيق' : 'Timestamp'}</div>
                    <div className="font-mono text-slate-900 dark:text-slate-100">
                      {formatExactDate(inspectedLog.createdAt)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C]">
                    <div className="text-slate-500 font-semibold mb-1">{language === 'ar' ? 'مُعرّف الكيان' : 'Target ID'}</div>
                    <div className="font-mono text-slate-900 dark:text-slate-100 truncate">
                      {inspectedLog.targetId || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Target Content & Direct Link */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] space-y-2">
                  <div className="text-slate-500 font-semibold">{language === 'ar' ? 'المحتوى / العنوان المستهدف' : 'Target Content Title'}</div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {inspectedLog.targetTitle}
                  </div>
                  {inspectedLog.contentUrl && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A384C]/50 flex items-center justify-between">
                      <span className="text-slate-500">{language === 'ar' ? 'الرابط المباشر:' : 'Direct Link:'}</span>
                      <a
                        href={inspectedLog.contentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 dark:text-orange-400 font-mono hover:underline inline-flex items-center gap-1"
                      >
                        <span className="truncate max-w-[280px]">{inspectedLog.contentUrl}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Raw JSON Payload */}
                <div className="space-y-1.5">
                  <div className="text-slate-500 font-semibold">{language === 'ar' ? 'حمولة البيانات الكاملة (JSON Payload)' : 'Complete JSON Payload'}</div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(inspectedLog, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-[#141c2b] border-t border-slate-200 dark:border-[#2A384C] flex items-center justify-end">
                <button
                  onClick={() => setInspectedLog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-[#2A384C] hover:bg-slate-300 dark:hover:bg-[#32435b] text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
