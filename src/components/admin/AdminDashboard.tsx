import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Code2,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Layers,
  Search,
  Key,
  Mail,
  LogOut,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Shield,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Clock,
  Check,
  Ban,
  User,
  Users,
  Inbox,
  Megaphone,
  BarChart3,
  Activity,
  Headphones,
  CheckCheck,
  Film,
  Palette,
} from 'lucide-react';
import { Prompt, Category, PromptStatus, AdsEngineConfig, SiteSettings } from '../../types';
import { StorageService } from '../../services/storage';
import { AuthService } from '../../services/authService';
import { ReportService } from '../../services/reportService';
import { SupportService } from '../../services/supportService';
import { CategoryIcon } from '../CategoryIcon';
import { PromptEditorModal } from './PromptEditorModal';
import { CategoryEditorModal } from './CategoryEditorModal';
import { AdminModerationTab } from './AdminModerationTab';
import { ContentMediaTab } from './ContentMediaTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminReportsSection } from './AdminReportsSection';
import { AdminAuditLogSection } from './AdminAuditLogSection';
import { AdminCategoryManager } from './AdminCategoryManager';
import { LogoutConfirmModal } from '../LogoutConfirmModal';
import { AdminConfirmationModal, ConfirmationVariant } from './AdminConfirmationModal';
import { AdminAnalyticsTab } from './AdminAnalyticsTab';
import { AdsManager } from './AdsManager';
import { AdminSupportTab } from './AdminSupportTab';
import { AdminAppearanceTab } from './AdminAppearanceTab';
import { AdminOwnershipTransferTab } from './AdminOwnershipTransferTab';
import { getSupabaseClient } from '../../services/supabaseClient';
import { isAdminEmail } from '../../utils/authUtils';
import { useApp } from '../../context/AppContext';
import { SoundNotificationSettings } from '../SoundNotificationSettings';

interface AdminDashboardProps {
  prompts: Prompt[];
  categories: Category[];
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  onRefreshData: () => void;
  onNavigateHome: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  prompts,
  categories,
  siteSettings,
  onUpdateSiteSettings,
  onRefreshData,
  onNavigateHome,
  onShowToast,
  onLogout,
}) => {
  const { t, language, isRTL } = useApp();
  const VALID_ADMIN_TABS = [
    'prompts',
    'content-media',
    'analytics',
    'moderation',
    'users',
    'reports',
    'audit',
    'categories',
    'appearance',
    'ads',
    'support',
    'account',
    'ownership',
    'sync',
  ] as const;
  type AdminTab = typeof VALID_ADMIN_TABS[number];
  const ADMIN_TAB_STORAGE_KEY = 'prombo_admin_active_tab';

  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    try {
      // 1. Check URL hash if set (e.g., #tab-analytics or #analytics)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashClean = window.location.hash.replace(/^#(admin-tab-|tab-|admin-)?/, '') as AdminTab;
        if (VALID_ADMIN_TABS.includes(hashClean)) {
          return hashClean;
        }
      }
      // 2. Check localStorage for persisted active tab across F5 refreshes
      const savedTab = localStorage.getItem(ADMIN_TAB_STORAGE_KEY) as AdminTab | null;
      if (savedTab && VALID_ADMIN_TABS.includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'prompts';
  });

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(ADMIN_TAB_STORAGE_KEY, tab);
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const currentUrl = new URL(window.location.href);
        currentUrl.hash = `tab-${tab}`;
        window.history.replaceState(null, '', currentUrl.toString());
      }
    } catch {}
  };

  const [adsConfig, setAdsConfig] = useState<AdsEngineConfig>(() => StorageService.getAdsConfig());
  const [searchTable, setSearchTable] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [moderationStatusFilter, setModerationStatusFilter] = useState<'all' | PromptStatus>('all');

  // Modals state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Support unread badge count
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(() => {
    return SupportService.getTotalUnreadCountForAdmin();
  });

  useEffect(() => {
    const updateSupportCount = () => {
      setUnreadSupportCount(SupportService.getTotalUnreadCountForAdmin());
    };
    updateSupportCount();
    const unsubscribe = SupportService.subscribe(updateSupportCount);
    return () => unsubscribe();
  }, []);

  // Strict Active Session Verification on mount:
  // If no active valid session exists or user is logged out, block access completely and call onLogout()
  useEffect(() => {
    let isMounted = true;
    const verifyActiveSession = async () => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (error || !data?.session?.user) {
            onLogout();
            return;
          }
          const email = (data.session.user.email || '').toLowerCase();
          if (email && isMounted) {
            setAdminEmail((prev) => (prev ? prev : email));
          }
          const userRole = data.session.user.user_metadata?.role || data.session.user.app_metadata?.role;
          const existingProfile = AuthService.getAllProfiles().find(
            (p) => p.id === data.session.user.id || (p.email && p.email.toLowerCase() === email)
          );
          const isOwnerOrAdmin =
            isAdminEmail(email) || userRole === 'admin' || existingProfile?.role === 'admin';
          if (!isOwnerOrAdmin) {
            onLogout();
            return;
          }
        } catch {
          if (isMounted) onLogout();
        }
      } else {
        if (!StorageService.isLoggedIn()) {
          onLogout();
        }
      }
    };
    verifyActiveSession();
    return () => {
      isMounted = false;
    };
  }, [onLogout]);

  // Admin control for user read receipts (double blue checks)
  const [userReadReceiptsEnabled, setUserReadReceiptsEnabled] = useState<boolean>(() => {
    return SupportService.isUserReadReceiptsEnabled();
  });

  const handleToggleUserReadReceipts = (enabled: boolean) => {
    SupportService.setUserReadReceiptsEnabled(enabled);
    setUserReadReceiptsEnabled(enabled);
    onShowToast(
      enabled
        ? (language === 'ar' ? 'تم تفعيل علامات القراءة (الصحين الأزرقين) للمستخدمين' : 'User read receipts enabled')
        : (language === 'ar' ? 'تم تعطيل علامات القراءة للمستخدمين' : 'User read receipts disabled'),
      'success'
    );
  };

  // Account Settings Form State
  const currentAdmin = StorageService.getAdminConfig();
  const [adminEmail, setAdminEmail] = useState(currentAdmin.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pending count for moderation badge
  const pendingCount = prompts.filter((p) => p.status === 'pending').length;

  // Pending count for reports badge
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(() => {
    return ReportService.getLocalReports().filter((r) => r.status === 'pending').length;
  });

  useEffect(() => {
    const updateReportsBadge = async () => {
      try {
        const list = await ReportService.getAllReports();
        setPendingReportsCount(list.filter((r) => r.status === 'pending').length);
      } catch {
        setPendingReportsCount(ReportService.getLocalReports().filter((r) => r.status === 'pending').length);
      }
    };
    updateReportsBadge();
    window.addEventListener('prombo_report_added', updateReportsBadge);
    window.addEventListener('prombo_report_updated', updateReportsBadge);
    return () => {
      window.removeEventListener('prombo_report_added', updateReportsBadge);
      window.removeEventListener('prombo_report_updated', updateReportsBadge);
    };
  }, []);

  // Real-time synchronization using Supabase Realtime for community posts & submissions
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`admin_dashboard_community_posts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
        },
        () => {
          // Sync fresh community posts and trigger dashboard refresh
          StorageService.fetchCommunityPosts().catch(() => {});
          onRefreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefreshData]);

  // Filtered prompts for management table
  const filteredPrompts = prompts.filter((p) => {
    const matchesCategory = categoryFilter ? p.categoryId === categoryFilter : true;
    const matchesSearch =
      searchTable === '' ||
      p.title.toLowerCase().includes(searchTable.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchTable.toLowerCase()) ||
      p.targetModel.toLowerCase().includes(searchTable.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchTable.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Filtered community/moderation submissions
  const moderatedPrompts = prompts.filter((p) => {
    // Status filter
    if (moderationStatusFilter !== 'all') {
      const pStatus = p.status || 'approved';
      if (pStatus !== moderationStatusFilter) return false;
    }
    // Category filter
    if (categoryFilter && p.categoryId !== categoryFilter) return false;
    // Search query
    if (searchTable.trim()) {
      const q = searchTable.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthor = p.author?.toLowerCase().includes(q);
      const matchEmail = p.authorEmail?.toLowerCase().includes(q);
      const matchContent = p.prompt.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchEmail && !matchContent) return false;
    }
    return true;
  });

  // Status update handler (Approve / Deactivate / Inactive)
  const handleUpdateStatus = (id: string, newStatus: PromptStatus, promptTitle: string) => {
    StorageService.updatePromptStatus(id, newStatus);
    onRefreshData();
    if (newStatus === 'approved') {
      onShowToast(
        language === 'ar'
          ? `تمت الموافقة على "${promptTitle}" ونشره في المكتبة العامة!`
          : `Approved and published "${promptTitle}"!`,
        'success'
      );
    } else if (newStatus === 'inactive') {
      onShowToast(
        language === 'ar'
          ? `تم إلغاء نشر "${promptTitle}" وإخفاؤه من المكتبة العامة.`
          : `Unpublished "${promptTitle}".`,
        'info'
      );
    } else {
      onShowToast(
        language === 'ar'
          ? `تمت إعادة "${promptTitle}" إلى قائمة المراجعة.`
          : `Moved "${promptTitle}" to review queue.`,
        'info'
      );
    }
  };

  // Confirmation dialog state for sensitive admin actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmationVariant;
    details?: { label: string; value: string }[];
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Prompt actions
  const handleSavePrompt = (promptData: Partial<Prompt>) => {
    StorageService.savePrompt(promptData);
    onRefreshData();
    onShowToast(promptData.id ? 'Prompt updated successfully' : 'New prompt created', 'success');
  };

  const handleDeletePrompt = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'ar' ? 'حذف الأمر نهائياً' : 'Delete Prompt',
      description: language === 'ar'
        ? `هل أنت متأكد من حذف الأمر "${title}" نهائياً من المكتبة؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to permanently delete "${title}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: language === 'ar' ? 'تأكيد الحذف' : 'Delete Prompt',
      details: [
        { label: language === 'ar' ? 'عنوان الأمر' : 'Title', value: title },
        { label: 'ID', value: id },
      ],
      onConfirm: () => {
        StorageService.deletePrompt(id);
        onRefreshData();
        onShowToast(language === 'ar' ? 'تم حذف الأمر بنجاح' : 'Prompt deleted', 'info');
      },
    });
  };

  const handleClonePrompt = (prompt: Prompt) => {
    const cloned = {
      ...prompt,
      id: undefined,
      title: `${prompt.title} (Copy)`,
      copyCount: 0,
      status: 'approved' as PromptStatus,
    };
    StorageService.savePrompt(cloned);
    onRefreshData();
    onShowToast(language === 'ar' ? 'تم تكرار الأمر بنجاح' : 'Prompt duplicated successfully', 'success');
  };

  // Category actions
  const handleSaveCategory = (catData: Partial<Category>) => {
    StorageService.saveCategory(catData);
    onRefreshData();
    onShowToast(catData.id ? 'Category updated' : 'New category created', 'success');
  };

  const handleDeleteCategory = (cat: Category) => {
    const count = prompts.filter((p) => p.categoryId === cat.id).length;
    if (count > 0) {
      onShowToast(
        language === 'ar' 
          ? `لا يمكن حذف التصنيف "${cat.name}" لأنه يحتوي على ${count} أمر. يرجى نقل الأوامر أو حذفها أولاً.`
          : `Cannot delete category "${cat.name}" because it contains ${count} prompt(s). Reassign or delete them first.`,
        'error'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: language === 'ar' ? 'حذف التصنيف نهائياً' : 'Delete Category',
      description: language === 'ar'
        ? `هل أنت متأكد من رغبتك في حذف تصنيف "${cat.name}"؟`
        : `Are you sure you want to delete category "${cat.name}"?`,
      variant: 'danger',
      confirmText: language === 'ar' ? 'تأكيد الحذف' : 'Delete Category',
      details: [
        { label: language === 'ar' ? 'اسم التصنيف' : 'Name', value: cat.name },
        { label: language === 'ar' ? 'الاسم اللطيف' : 'Slug', value: cat.slug },
      ],
      onConfirm: () => {
        StorageService.deleteCategory(cat.id);
        onRefreshData();
        onShowToast(language === 'ar' ? 'تم حذف التصنيف بنجاح' : 'Category deleted', 'info');
      },
    });
  };

  // Account Update Handlers (Guarded by AdminConfirmationModal)
  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMsg(null);
    const currentEmail = (StorageService.getAdminConfig().email || adminEmail).trim().toLowerCase();

    if (!adminEmail || !adminEmail.includes('@')) {
      setAccountMsg({ type: 'error', text: language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please provide a valid email address' });
      return;
    }

    if (adminEmail.trim().toLowerCase() === currentEmail) {
      onShowToast(language === 'ar' ? 'لم تقم بتغيير البريد الإلكتروني' : 'No changes to email address', 'info');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: language === 'ar' ? 'تأكيد تغيير بريد المشرف' : 'Confirm Admin Email Update',
      description: language === 'ar'
        ? 'هل أنت متأكد من تغيير عنوان البريد الإلكتروني لحساب الإدارة؟ سيتم اعتماده لتسجيل الدخول مستقبلاً.'
        : 'Are you sure you want to update the administrator email address? It will be required for subsequent logins.',
      variant: 'warning',
      confirmText: language === 'ar' ? 'تحديث البريد' : 'Update Email',
      details: [
        { label: language === 'ar' ? 'البريد الحالي' : 'Current Email', value: currentEmail },
        { label: language === 'ar' ? 'البريد الجديد' : 'New Email', value: adminEmail.trim().toLowerCase() },
      ],
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const cleanEmail = adminEmail.trim().toLowerCase();
        const supabase = getSupabaseClient();
        let noticeMsg = '';

        if (supabase) {
          try {
            const { data, error } = await supabase.auth.updateUser({ email: cleanEmail });
            if (error) {
              setAccountMsg({ type: 'error', text: error.message });
              onShowToast(error.message, 'error');
              return;
            }
            if ((data?.user as any)?.new_email) {
              noticeMsg = language === 'ar'
                ? 'تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد. يرجى تأكيده لإتمام التحديث.'
                : 'Confirmation link sent to your new email. Please verify to complete update.';
            }
          } catch (err: any) {
            console.warn('Supabase updateUser error:', err);
          }
        }

        // Synchronize with StorageService & local state
        StorageService.updateAdminEmail(cleanEmail);
        setAdminEmail(cleanEmail);

        // Update local profiles list if exists
        try {
          const allProfiles = AuthService.getAllProfiles();
          const targetIdx = allProfiles.findIndex(
            (p) => p.email && (p.email.toLowerCase() === currentEmail.toLowerCase() || p.email.toLowerCase() === cleanEmail)
          );
          if (targetIdx !== -1) {
            allProfiles[targetIdx].email = cleanEmail;
            allProfiles[targetIdx].role = 'admin';
            AuthService.saveProfiles(allProfiles);
          }
          const currentUser = AuthService.getCurrentUser();
          if (currentUser && currentUser.role === 'admin') {
            AuthService.setCurrentUser({ ...currentUser, email: cleanEmail, role: 'admin' });
          }
        } catch {}

        const successText = noticeMsg || t('adminEmailSuccess');
        setAccountMsg({ type: 'success', text: successText });
        onShowToast(successText, 'success');
      },
    });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMsg(null);

    if (!currentPassword) {
      setAccountMsg({ type: 'error', text: language === 'ar' ? 'يرجى إدخال كلمة المرور الحالية' : 'Current password is required' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setAccountMsg({ type: 'error', text: language === 'ar' ? 'يجب أن لا تقل كلمة المرور عن 6 خانات' : 'New password must be at least 6 characters' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountMsg({ type: 'error', text: language === 'ar' ? 'كلمات المرور الجديدة غير متطابقة' : 'New passwords do not match' });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: language === 'ar' ? 'تأكيد تغيير كلمة مرور المشرف' : 'Confirm Admin Password Change',
      description: language === 'ar'
        ? 'هل أنت متأكد من تغيير كلمة المرور لحساب الإدارة؟ يرجى الاحتفاظ بكلمة المرور الجديدة في مكان آمن.'
        : 'Are you sure you want to change the administrator password? Please store it securely.',
      variant: 'warning',
      confirmText: language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const currentAdminEmail = (adminEmail || StorageService.getAdminConfig().email).trim().toLowerCase();
        const supabase = getSupabaseClient();

        if (supabase) {
          try {
            // 1. Validate current password against Supabase Auth
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: currentAdminEmail,
              password: currentPassword,
            });

            if (signInError || !signInData?.user) {
              const errMsg = language === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password does not match';
              setAccountMsg({ type: 'error', text: errMsg });
              onShowToast(errMsg, 'error');
              return;
            }

            // 2. Update to new password on Supabase backend
            const { error: updateError } = await supabase.auth.updateUser({
              password: newPassword,
            });

            if (updateError) {
              setAccountMsg({ type: 'error', text: updateError.message });
              onShowToast(updateError.message, 'error');
              return;
            }

            // 3. Clear inputs, notify success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setAccountMsg({ type: 'success', text: t('adminPasswordSuccess') });
            onShowToast(t('adminPasswordSuccess'), 'success');
          } catch (err: any) {
            setAccountMsg({ type: 'error', text: err?.message || 'Error updating password' });
            onShowToast(err?.message || 'Error updating password', 'error');
          }
        } else {
          // Fallback if Supabase is offline
          try {
            const res = await StorageService.updateAdminPassword(currentPassword, newPassword);
            if (res.success) {
              setAccountMsg({ type: 'success', text: t('adminPasswordSuccess') });
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              onShowToast(t('adminPasswordSuccess'), 'success');
            } else {
              setAccountMsg({ type: 'error', text: res.message });
              onShowToast(res.message, 'error');
            }
          } catch (err: any) {
            setAccountMsg({ type: 'error', text: err.message || 'Error updating password' });
          }
        }
      },
    });
  };

  // Backup handlers
  const handleExportJSON = () => {
    const jsonStr = StorageService.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prombo-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(language === 'ar' ? 'تم تحميل النسخة الاحتياطية بنجاح' : 'Backup JSON downloaded', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = StorageService.importBackupJSON(content);
        if (res.success) {
          onRefreshData();
          onShowToast(res.message, 'success');
        } else {
          onShowToast(res.message, 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalCopies = prompts.reduce((acc, p) => acc + (p.copyCount || 0), 0);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#121824] text-slate-800 dark:text-slate-100 pb-16 transition-colors duration-200">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#121824]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#2A384C] py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#182232] dark:hover:bg-[#1f2b3e] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#2A384C] transition-colors cursor-pointer"
            >
              {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />}
              <span>{t('adminBackToLibrary')}</span>
            </button>
            <div className="h-5 w-px bg-slate-300 dark:bg-[#2A384C]" />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('adminDashboardTitle')}
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {currentAdmin.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('adminLogout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 space-y-6 max-w-full">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{prompts.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'ar' ? 'إجمالي الأوامر' : 'Total Prompts'}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{pendingCount}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'ar' ? 'طلبات بانتظار المراجعة' : 'Pending Submissions'}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{categories.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'ar' ? 'التصنيفات' : 'Categories'}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCopies.toLocaleString()}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'ar' ? 'مرات النسخ' : 'Total Copies'}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#2A384C] pb-3 overflow-x-auto custom-scrollbar w-full max-w-full">
          {/* Tab 1: Prompts */}
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'prompts'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>{t('adminTabPrompts')}</span>
          </button>

          {/* Tab: Content & Media Management */}
          <button
            id="admin-tab-content-media"
            onClick={() => setActiveTab('content-media')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'content-media'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>{language === 'ar' ? 'المحتوى والميديا' : 'Content & Media'}</span>
          </button>

          {/* Tab 2: Analytics & Community Control */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('adminTabAnalytics')}</span>
          </button>

          {/* Tab 3: Community Submissions & Moderation */}
          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'moderation'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>{t('adminTabModeration')}</span>
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'moderation' ? 'bg-white text-orange-600' : 'bg-orange-600 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          {/* Tab: Users & Moderation */}
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('adminTabUsers')}</span>
          </button>

          {/* Tab: Reports & Moderation Queue */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{language === 'ar' ? 'بلاغات المحتوى' : 'Content Reports'}</span>
            {pendingReportsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'reports' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
              }`}>
                {pendingReportsCount}
              </span>
            )}
          </button>

          {/* Tab: Centralized Audit & Action Log */}
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{language === 'ar' ? 'سجل التدقيق والمراقبة' : 'Audit Log'}</span>
          </button>

          {/* Tab 4: Categories */}
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t('adminTabCategories')}</span>
          </button>

          {/* Tab: Site Appearance (مظهر الموقع) */}
          <button
            id="admin-tab-appearance"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{language === 'ar' ? 'مظهر الموقع' : 'Site Appearance'}</span>
          </button>

          {/* Tab 4: Ad Monetization */}
          <button
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ads'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>{t('adminTabAds')}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              adsConfig.masterEnabled
                ? (activeTab === 'ads' ? 'bg-white text-orange-600' : 'bg-emerald-500 text-white')
                : (activeTab === 'ads' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500')
            }`}>
              {adsConfig.masterEnabled ? (language === 'ar' ? 'مفعل' : 'ON') : (language === 'ar' ? 'معطل' : 'OFF')}
            </span>
          </button>

          {/* Tab: Technical Support (WhatsApp-style) */}
          <button
            id="admin-tab-support"
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'support'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>{t('support.adminTitle')}</span>
            {unreadSupportCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'support' ? 'bg-white text-orange-600' : 'bg-red-500 text-white animate-pulse'
                }`}
              >
                {unreadSupportCount}
              </span>
            )}
          </button>

          {/* Tab 5: Account */}
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'account'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{t('adminTabAccount')}</span>
          </button>

          {/* Tab: Ownership Transfer (نقل الملكية) */}
          <button
            id="admin-tab-ownership"
            onClick={() => setActiveTab('ownership')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ownership'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>{language === 'ar' ? 'نقل الملكية' : 'Ownership Transfer'}</span>
          </button>

          {/* Tab 6: JSON Sync */}
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{t('adminTabBackup')}</span>
          </button>
        </div>

        {/* Tab 1 Content: Prompts Management */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                  <input
                    type="text"
                    value={searchTable}
                    onChange={(e) => setSearchTable(e.target.value)}
                    placeholder={language === 'ar' ? 'بحث في جدول الأوامر...' : 'Search prompts in table...'}
                    className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500`}
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white dark:bg-[#182232] border border-slate-300 dark:border-[#2A384C] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 shrink-0 cursor-pointer"
                >
                  <option value="">{t('allCategories')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingPrompt(null);
                  setIsPromptModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('adminAddPrompt')}</span>
              </button>
            </div>

            {/* Prompts Table */}
            <div className="rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] overflow-hidden shadow-xs w-full max-w-full">
              <div className="w-full overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[700px] text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-[#141c2b] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2A384C]">
                    <tr>
                      <th className="p-3.5 font-semibold">{language === 'ar' ? 'عنوان الأمر' : 'Title & Target'}</th>
                      <th className="p-3.5 font-semibold">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                      <th className="p-3.5 font-semibold">{language === 'ar' ? 'النموذج' : 'Model'}</th>
                      <th className="p-3.5 font-semibold">{language === 'ar' ? 'اسم المستخدم / الناشر' : 'Author'}</th>
                      <th className="p-3.5 font-semibold">{language === 'ar' ? 'تاريخ النشر' : 'Publish Date'}</th>
                      <th className="p-3.5 font-semibold text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="p-3.5 font-semibold text-center">{language === 'ar' ? 'النسخ' : 'Copies'}</th>
                      <th className="p-3.5 font-semibold text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2A384C]/50">
                    {filteredPrompts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          {t('noPromptsFound')}
                        </td>
                      </tr>
                    ) : (
                      filteredPrompts.map((p) => {
                        const cat = categories.find((c) => c.id === p.categoryId);
                        const status = p.status || 'approved';
                        const authorDisplay = p.author?.trim() || (language === 'ar' ? 'مجهول' : 'Anonymous');
                        const publishDateRaw = p.createdAt || p.submittedAt;
                        const formattedDate = publishDateRaw
                          ? new Date(publishDateRaw).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : (language === 'ar' ? 'غير محدد' : 'N/A');

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1f2b3e]/60 transition-colors">
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{p.title}</div>
                              <div className="text-slate-500 text-[11px] truncate max-w-xs">{p.description || p.prompt.substring(0, 80)}</div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] font-medium">
                                <CategoryIcon name={cat?.icon || 'Bookmark'} className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                {cat?.name || p.categoryId}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {p.targetModel}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{authorDisplay}</span>
                              </div>
                              {p.authorEmail && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                                  {p.authorEmail}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formattedDate}</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap">
                              {status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                  <Check className="w-3 h-3" />
                                  {t('moderationApproved')}
                                </span>
                              ) : status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                                  <Clock className="w-3 h-3" />
                                  {t('moderationPending')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                  <Ban className="w-3 h-3" />
                                  {t('moderationInactive')}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-mono text-xs">
                              {p.copyCount || 0}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleClonePrompt(p)}
                                  title="Duplicate"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#121824] dark:hover:bg-[#1f2b3e] text-slate-600 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPrompt(p);
                                    setIsPromptModalOpen(true);
                                  }}
                                  title="Edit"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#121824] dark:hover:bg-[#1f2b3e] text-slate-600 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePrompt(p.id, p.title)}
                                  title="Delete"
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Content & Media Management */}
        {activeTab === 'content-media' && (
          <ContentMediaTab
            prompts={prompts}
            onRefreshData={onRefreshData}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 2 Content: Analytics & Community Control */}
        {activeTab === 'analytics' && (
          <AdminAnalyticsTab
            siteSettings={siteSettings}
            onUpdateSiteSettings={onUpdateSiteSettings}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 3 Content: Community Submissions & Moderation Dashboard */}
        {activeTab === 'moderation' && (
          <AdminModerationTab
            prompts={prompts}
            categories={categories}
            onRefreshData={onRefreshData}
            onShowToast={onShowToast}
            onEditPrompt={(p) => {
              setEditingPrompt(p);
              setIsPromptModalOpen(true);
            }}
            onDeletePrompt={handleDeletePrompt}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Tab: Users & Moderation */}
        {activeTab === 'users' && (
          <AdminUsersTab
            onShowToast={onShowToast}
            onOpenSupportWithUser={() => {
              setActiveTab('support');
            }}
          />
        )}

        {/* Tab: Reports & Moderation Queue */}
        {activeTab === 'reports' && (
          <AdminReportsSection
            onShowToast={onShowToast}
            onRefreshParent={onRefreshData}
          />
        )}

        {/* Tab: Centralized Audit Log & Monitoring */}
        {activeTab === 'audit' && (
          <AdminAuditLogSection
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 4 Content: Categories Management */}
        {activeTab === 'categories' && (
          <AdminCategoryManager
            categories={categories}
            prompts={prompts}
            onAddCategory={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(true);
            }}
            onEditCategory={(cat) => {
              setEditingCategory(cat);
              setIsCategoryModalOpen(true);
            }}
            onDeleteCategory={(cat) => {
              handleDeleteCategory(cat);
            }}
          />
        )}

        {/* Tab: Site Appearance (مظهر الموقع) */}
        {activeTab === 'appearance' && (
          <AdminAppearanceTab
            onRefreshData={onRefreshData}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 4 Content: Ad Monetization Engine */}
        {activeTab === 'ads' && (
          <AdsManager
            adsConfig={adsConfig}
            onSaveConfig={(newCfg) => {
              StorageService.saveAdsConfig(newCfg);
              setAdsConfig(newCfg);
            }}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 5 Content: Account & Security */}
        {activeTab === 'account' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {accountMsg && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
                  accountMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
                }`}
              >
                {accountMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                )}
                <span>{accountMsg.text}</span>
              </div>
            )}

            {/* Update Email Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-[#2A384C]">
                <Mail className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('adminUpdateEmail')}</h3>
              </div>
              <form onSubmit={handleUpdateEmail} className="space-y-4" autoComplete="off">
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('adminEmailLabel')}
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    autoComplete="off"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {t('adminSave')}
                </button>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-[#2A384C]">
                <Key className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('adminUpdatePassword')}</h3>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4" autoComplete="off">
                {/* Invisible decoy inputs to prevent browser autofill/password manager injection */}
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('adminCurrentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2 pe-10 rtl:pe-3.5 rtl:ps-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showCurrentPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('adminNewPassword')}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2 pe-10 rtl:pe-3.5 rtl:ps-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showNewPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('adminConfirmPassword')}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2 pe-10 rtl:pe-3.5 rtl:ps-10 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showConfirmPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {t('adminUpdatePassword')}
                </button>
              </form>
            </div>

            {/* Ownership Transfer Quick Link Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'نقل ملكية الموقع بالكامل' : 'Transfer Site Ownership'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'ar'
                      ? 'التنازل الكامل عن ملكية الموقع وصلاحيات الإدارة الرئيسية لحساب ومالك جديد'
                      : 'Permanently transfer site ownership and primary administrator credentials to a new owner'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ownership')}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] cursor-pointer shrink-0"
              >
                {language === 'ar' ? 'الانتقال إلى نقل الملكية' : 'Go to Ownership Transfer'}
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Ownership Transfer (نقل الملكية) */}
        {activeTab === 'ownership' && (
          <AdminOwnershipTransferTab
            onShowToast={onShowToast}
            onTransferSuccess={onLogout}
          />
        )}

        {/* Tab 5 Content: Backup & JSON Sync */}
        {activeTab === 'sync' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-4 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                {t('adminTabBackup')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('adminImportHelp')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleExportJSON}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('adminExportJSON')}</span>
                </button>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#121824] dark:hover:bg-[#1f2b3e] text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-[#2A384C] cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>{t('adminImportJSON')}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Live Audio & Sound Notification Settings */}
            <SoundNotificationSettings />
          </div>
        )}

        {/* Tab: Technical Support (WhatsApp-style user inquiries & messaging) */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            {/* Admin Control for User Read Receipts (Double Blue Checks) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('support.showReadReceiptsToggle')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('support.showReadReceiptsDesc')}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="admin-toggle-read-receipts"
                  checked={userReadReceiptsEnabled}
                  onChange={(e) => handleToggleUserReadReceipts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <AdminSupportTab onShowToast={onShowToast} />
          </div>
        )}
      </main>

      {/* Prompt Editor Modal */}
      <PromptEditorModal
        isOpen={isPromptModalOpen}
        prompt={editingPrompt}
        categories={categories}
        onClose={() => {
          setIsPromptModalOpen(false);
          setEditingPrompt(null);
        }}
        onSave={handleSavePrompt}
      />

      {/* Category Editor Modal */}
      <CategoryEditorModal
        isOpen={isCategoryModalOpen}
        category={editingCategory}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />

      {/* Admin Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          onLogout();
        }}
      />

      {/* Unified Admin Confirmation Modal */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        details={confirmModal.details}
      />
    </div>
  );
};
