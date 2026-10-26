import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  MessageSquare,
  MessageSquareOff,
  AlertTriangle,
  RefreshCw,
  Mail,
  Ban,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Pin,
  Sparkles,
} from 'lucide-react';
import { CommunityUser, ModerationReport, CommunityPost } from '../../types';
import { AuthService } from '../../services/authService';
import { ReportService } from '../../services/reportService';
import { CommunityService } from '../../services/communityService';
import { useApp } from '../../context/AppContext';
import { AdminConfirmationModal, ConfirmationVariant } from './AdminConfirmationModal';

// ==========================================
// 1. ROBUST ADMIN USERS TAB
// ==========================================
export interface AdminUsersTabProps {
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  currentUser?: CommunityUser | null;
  usersList?: CommunityUser[];
  onOpenSupportWithUser?: (userId: string) => void;
  onRefresh?: () => void;
}

type FilterTab = 'all' | 'active' | 'community_banned' | 'fully_banned' | 'reported';

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  onShowToast,
  onToast,
  currentUser: propCurrentUser,
  usersList,
  onOpenSupportWithUser,
  onRefresh,
}) => {
  const { language, isRTL, t } = useApp();
  const [renderError, setRenderError] = useState<string | null>(null);

  // Unified toast helper with default fallback
  const showToast = useMemo(() => {
    return onShowToast || onToast || ((_msg: string) => {});
  }, [onShowToast, onToast]);

  const [users, setUsers] = useState<CommunityUser[]>(() => {
    if (Array.isArray(usersList) && usersList.length > 0) {
      return usersList;
    }
    try {
      const initial = AuthService.getAllProfiles();
      return Array.isArray(initial) ? initial : [];
    } catch {
      return [];
    }
  });

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load all users, reports, and community posts defensively
  const loadData = () => {
    setIsRefreshing(true);
    try {
      if (Array.isArray(usersList) && usersList.length > 0) {
        setUsers(usersList);
      } else {
        const allProfiles = AuthService.getAllProfiles();
        setUsers(Array.isArray(allProfiles) ? allProfiles : []);
      }

      // Synchronize remote database profiles asynchronously
      AuthService.fetchProfilesFromSupabase()
        .then((remoteProfiles) => {
          if (Array.isArray(remoteProfiles) && remoteProfiles.length > 0) {
            setUsers(remoteProfiles);
          }
        })
        .catch(() => {});

      let allReports: ModerationReport[] = [];
      try {
        allReports = ReportService.getLocalReports();
      } catch (rErr) {
        console.warn('Failed to load local reports safely:', rErr);
      }
      setReports(Array.isArray(allReports) ? allReports : []);

      // Also fetch remote reports asynchronously without blocking
      ReportService.getAllReports()
        .then((fetchedReports) => {
          if (Array.isArray(fetchedReports)) {
            setReports(fetchedReports);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch remote reports:', err);
        });

      let allPosts: CommunityPost[] = [];
      try {
        allPosts = CommunityService.getLocalPosts();
      } catch (pErr) {
        console.warn('Failed to load posts safely:', pErr);
      }
      setPosts(Array.isArray(allPosts) ? allPosts : []);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.warn('Failed to load user moderation data:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  // Sync if usersList prop changes
  useEffect(() => {
    if (Array.isArray(usersList) && usersList.length > 0) {
      setUsers(usersList);
    }
  }, [usersList]);

  useEffect(() => {
    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('prombo_profiles_updated', handleStorageChange);
    window.addEventListener('prombo_profiles_change', handleStorageChange);
    window.addEventListener('prombo_reports_updated', handleStorageChange);

    return () => {
      window.removeEventListener('prombo_profiles_updated', handleStorageChange);
      window.removeEventListener('prombo_profiles_change', handleStorageChange);
      window.removeEventListener('prombo_reports_updated', handleStorageChange);
    };
  }, []);

  // Compute stats per user with ultra-defensive property guards
  const userMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        reportsCount: number;
        activeViolations: number;
        postsCount: number;
        recentReports: ModerationReport[];
      }
    >();

    if (!Array.isArray(users)) return map;

    const safeReports = Array.isArray(reports) ? reports : [];
    const safePosts = Array.isArray(posts) ? posts : [];

    users.forEach((u) => {
      if (!u || typeof u !== 'object') return;

      const uId = String(u.id || '');
      const uEmail = u.email && typeof u.email === 'string' ? u.email.toLowerCase().trim() : '';

      // Direct properties fallback (user.reports?.length, user.postsCount, etc.)
      const directReportsCount = Array.isArray((u as any).reports)
        ? (u as any).reports.length
        : typeof (u as any).reportsCount === 'number'
        ? (u as any).reportsCount
        : 0;

      const directPostsCount = Array.isArray((u as any).posts)
        ? (u as any).posts.length
        : typeof (u as any).postsCount === 'number'
        ? (u as any).postsCount
        : 0;

      // Filter reports safely
      const userReports = safeReports.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        const rUserId = String(r.reportedUserId || '');
        const rEmail =
          r.reportedUserEmail && typeof r.reportedUserEmail === 'string'
            ? r.reportedUserEmail.toLowerCase().trim()
            : '';
        return (uId && rUserId === uId) || (uEmail && rEmail && rEmail === uEmail);
      });

      const activeViolations = userReports.filter((r) => r && r.status === 'pending').length;

      // Filter community posts safely
      const userPosts = safePosts.filter((p) => {
        if (!p || typeof p !== 'object') return false;
        const pUserId = String(p.userId || (p as any).authorId || (p as any).author_id || '');
        const pEmail =
          p.userEmail && typeof p.userEmail === 'string'
            ? p.userEmail.toLowerCase().trim()
            : (p as any).authorEmail && typeof (p as any).authorEmail === 'string'
            ? (p as any).authorEmail.toLowerCase().trim()
            : '';
        return (uId && pUserId === uId) || (uEmail && pEmail && pEmail === uEmail);
      });

      const totalCalculatedReports = Math.max(userReports.length, directReportsCount);
      const totalCalculatedPosts = Math.max(userPosts.length, directPostsCount);

      map.set(uId, {
        reportsCount: totalCalculatedReports,
        activeViolations,
        postsCount: totalCalculatedPosts,
        recentReports: userReports,
      });
    });

    return map;
  }, [users, reports, posts]);

  // Overall KPI counts with defensive checks
  const stats = useMemo(() => {
    if (!Array.isArray(users)) {
      return { total: 0, active: 0, fullyBanned: 0, communityBanned: 0, reported: 0 };
    }

    const safeUsers = users.filter((u): u is CommunityUser => Boolean(u && typeof u === 'object'));
    const total = safeUsers.length;

    const fullyBanned = safeUsers.filter((u) => Boolean(u.isBanned || (u as any).is_banned)).length;

    const communityBanned = safeUsers.filter(
      (u) =>
        Boolean(u.isCommunityBanned || (u as any).is_community_banned) &&
        !u.isBanned &&
        !(u as any).is_banned
    ).length;

    const reported = safeUsers.filter((u) => {
      const uId = String(u.id || '');
      const metrics = userMetricsMap.get(uId);
      const directReports = Array.isArray((u as any).reports)
        ? (u as any).reports.length
        : typeof (u as any).reportsCount === 'number'
        ? (u as any).reportsCount
        : 0;
      return (metrics?.reportsCount || directReports || 0) > 0;
    }).length;

    const active = Math.max(0, total - fullyBanned - communityBanned);

    return { total, active, fullyBanned, communityBanned, reported };
  }, [users, userMetricsMap]);

  // Filter and search logic safely
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];

    const q = (searchQuery || '').trim().toLowerCase();

    return users.filter((u) => {
      if (!u || typeof u !== 'object') return false;

      const userName = String(u.name || (u as any).displayName || (u as any).fullName || '').toLowerCase();
      const userEmail = String(u.email || '').toLowerCase();
      const userSlug = String(u.username || (u as any).user_name || '').toLowerCase();
      const userId = String(u.id || '').toLowerCase();

      const matchesSearch =
        !q ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        userSlug.includes(q) ||
        userId.includes(q);

      if (!matchesSearch) return false;

      const isFullyBanned = Boolean(u.isBanned || (u as any).is_banned);
      const isCommBanned = Boolean(u.isCommunityBanned || (u as any).is_community_banned);

      if (activeFilter === 'active') {
        return !isFullyBanned && !isCommBanned;
      }
      if (activeFilter === 'community_banned') {
        return isCommBanned && !isFullyBanned;
      }
      if (activeFilter === 'fully_banned') {
        return isFullyBanned;
      }
      if (activeFilter === 'reported') {
        const uId = String(u.id || '');
        const metrics = userMetricsMap.get(uId);
        const directReports = Array.isArray((u as any).reports)
          ? (u as any).reports.length
          : typeof (u as any).reportsCount === 'number'
          ? (u as any).reportsCount
          : 0;
        return (metrics?.reportsCount || directReports || 0) > 0;
      }
      return true;
    });
  }, [users, searchQuery, activeFilter, userMetricsMap]);

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

  // Moderation Action 1: Toggle Full Block (Prompted via confirmation modal)
  const handleToggleFullBan = (user: CommunityUser) => {
    if (!user || !user.id) return;
    const isCurrentlyBanned = Boolean(user.isBanned || (user as any).is_banned);
    const newStatus = !isCurrentlyBanned;
    const userName = user.name || 'User';

    setConfirmModal({
      isOpen: true,
      title: newStatus
        ? (language === 'ar' ? 'تأكيد الحظر الشامل للحساب' : 'Confirm Full User Restriction')
        : (language === 'ar' ? 'تأكيد فك الحظر الشامل' : 'Confirm Lifting Full Ban'),
      description: newStatus
        ? (language === 'ar'
            ? `هل أنت متأكد من فرض الحظر الشامل على "${userName}"؟ سيتم منع المستخدم من إضافة أو تعديل أو التفاعل مع الأوامر، وسيقتصر حسابه فقط على المفضلة ومركز الدعم.`
            : `Are you sure you want to fully restrict "${userName}"? The user will be blocked from posting, editing, and interacting across Prombo.`)
        : (language === 'ar'
            ? `هل أنت متأكد من إلغاء الحظر الشامل عن "${userName}" واستعادة صلاحياته بالكامل؟`
            : `Are you sure you want to lift the full ban on "${userName}"? Full platform access will be restored.`),
      variant: newStatus ? 'danger' : 'info',
      confirmText: newStatus
        ? (language === 'ar' ? 'فرض الحظر الشامل' : 'Apply Full Ban')
        : (language === 'ar' ? 'فك الحظر' : 'Lift Ban'),
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: userName },
        { label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: user.email || 'N/A' },
        { label: language === 'ar' ? 'الحالة الحالية' : 'Current Status', value: isCurrentlyBanned ? (language === 'ar' ? 'محظور كلياً' : 'Fully Banned') : (language === 'ar' ? 'نشط' : 'Active') },
      ],
      onConfirm: async () => {
        const success = await AuthService.toggleBanUser(user.id, newStatus);
        if (success) {
          setUsers((prev) =>
            Array.isArray(prev)
              ? prev.map((u) =>
                  u.id === user.id
                    ? {
                        ...u,
                        isBanned: newStatus,
                        bannedAt: newStatus ? new Date().toISOString() : undefined,
                      }
                    : u
                )
              : []
          );
          showToast(
            newStatus
              ? language === 'ar'
                ? `تم حظر المستخدم "${userName}" كلياً (يقتصر على المفضلة والدعم)`
                : `User "${userName}" is now fully restricted.`
              : language === 'ar'
              ? `تم إلغاء الحظر الكلي للمستخدم "${userName}".`
              : `User "${userName}" full ban lifted.`,
            newStatus ? 'info' : 'success'
          );
        } else {
          showToast(language === 'ar' ? 'فشل تنفيذ الإجراء' : 'Action failed', 'error');
        }
      },
    });
  };

  // Moderation Action 2: Toggle Community Ban (Prompted via confirmation modal)
  const handleToggleCommunityBan = (user: CommunityUser) => {
    if (!user || !user.id) return;
    const isCurrentlyCommBanned = Boolean(user.isCommunityBanned || (user as any).is_community_banned);
    const newStatus = !isCurrentlyCommBanned;
    const userName = user.name || 'User';

    setConfirmModal({
      isOpen: true,
      title: newStatus
        ? (language === 'ar' ? 'حظر المستخدم من المجتمع' : 'Ban User from Community')
        : (language === 'ar' ? 'إلغاء حظر المستخدم من المجتمع' : 'Lift Community Ban'),
      description: newStatus
        ? (language === 'ar'
            ? `هل أنت متأكد من حظر "${userName}" من المشاركة في مجتمع Prombo؟ لن يتمكن من إنشاء منشورات جديدة أو كتابة تعليقات، مع بقاء تصفح المكتبة متاحاً.`
            : `Are you sure you want to ban "${userName}" from community posts and comments? Browsing prompts will remain active.`)
        : (language === 'ar'
            ? `هل أنت متأكد من رفع حظر المجتمع عن "${userName}" والسماح له بالنشر والتعليق مجدداً؟`
            : `Are you sure you want to restore community privileges for "${userName}"?`),
      variant: newStatus ? 'warning' : 'info',
      confirmText: newStatus
        ? (language === 'ar' ? 'حظر من المجتمع' : 'Ban from Community')
        : (language === 'ar' ? 'فك حظر المجتمع' : 'Restore Community Access'),
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: userName },
        { label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: user.email || 'N/A' },
      ],
      onConfirm: async () => {
        const success = await AuthService.toggleCommunityBanUser(user.id, newStatus);
        if (success) {
          setUsers((prev) =>
            Array.isArray(prev)
              ? prev.map((u) =>
                  u.id === user.id
                    ? {
                        ...u,
                        isCommunityBanned: newStatus,
                        communityBannedAt: newStatus ? new Date().toISOString() : undefined,
                      }
                    : u
                )
              : []
          );
          showToast(
            newStatus
              ? language === 'ar'
                ? `تم حظر المستخدم "${userName}" من مجتمع Prombo (المنشورات والردود)`
                : `User "${userName}" banned from community.`
              : language === 'ar'
              ? `تم إلغاء حظر المجتمع للمستخدم "${userName}".`
              : `User "${userName}" unbanned from community.`,
            newStatus ? 'info' : 'success'
          );
        } else {
          showToast(language === 'ar' ? 'فشل تنفيذ الإجراء' : 'Action failed', 'error');
        }
      },
    });
  };

  // Moderation Action 3: Toggle Admin / User Role (Prompted via confirmation modal)
  const handleToggleRole = (user: CommunityUser) => {
    if (!user || !user.id) return;
    const currentRole = user.role || 'user';
    const newRole: 'user' | 'admin' = currentRole === 'admin' ? 'user' : 'admin';
    const userName = user.name || 'User';

    setConfirmModal({
      isOpen: true,
      title: newRole === 'admin'
        ? (language === 'ar' ? 'ترقية المستخدم إلى مدير (Admin)' : 'Promote User to Administrator')
        : (language === 'ar' ? 'تجريد المستخدم من صلاحيات الإدارة' : 'Demote Administrator to User'),
      description: newRole === 'admin'
        ? (language === 'ar'
            ? `تحذير: سيحصل "${userName}" على صلاحيات لوحة التحكم الكاملة بما فيها تعديل الأوامر والتصنيفات وإدارة المستخدمين والتحليلات.`
            : `Warning: "${userName}" will receive full administrator dashboard access, moderation controls, and user management privileges.`)
        : (language === 'ar'
            ? `هل أنت متأكد من سحب صلاحيات الإدارة من "${userName}" وتحويل حسابه إلى مستخدم عادي؟`
            : `Are you sure you want to revoke admin privileges from "${userName}"?`),
      variant: newRole === 'admin' ? 'warning' : 'danger',
      confirmText: newRole === 'admin'
        ? (language === 'ar' ? 'تأكيد الترقية لمدير' : 'Promote to Admin')
        : (language === 'ar' ? 'تجريد الصلاحية' : 'Revoke Admin Role'),
      details: [
        { label: language === 'ar' ? 'المستخدم' : 'User', value: userName },
        { label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: user.email || 'N/A' },
        { label: language === 'ar' ? 'الصلاحية الجديدة' : 'New Role', value: newRole === 'admin' ? 'Admin (مدير)' : 'User (مستخدم)' },
      ],
      onConfirm: async () => {
        const success = await AuthService.updateUserRole(user.id, newRole);
        if (success) {
          setUsers((prev) =>
            Array.isArray(prev) ? prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)) : []
          );
          showToast(
            language === 'ar'
              ? `تم تغيير صلاحية "${userName}" إلى ${newRole === 'admin' ? 'مدير' : 'مستخدم عادي'}`
              : `User role updated to ${newRole}`,
            'success'
          );
        } else {
          showToast(language === 'ar' ? 'فشل تحديث الصلاحية' : 'Failed to update role', 'error');
        }
      },
    });
  };

  // Badging Action 1: Toggle VIP / Featured Creator Badge ("مميز")
  const handleToggleVIP = async (user: CommunityUser) => {
    if (!user || !user.id) return;
    const nextVIP = !user.isVIP;
    const userName = user.name || 'User';

    // Optimistic UI update
    setUsers((prev) =>
      Array.isArray(prev) ? prev.map((u) => (u.id === user.id ? { ...u, isVIP: nextVIP } : u)) : []
    );

    const success = await AuthService.updateUserProfileBadges(user.id, { isVIP: nextVIP });
    if (success) {
      showToast(
        language === 'ar'
          ? nextVIP
            ? `تم منح شارة "مميز" للمستخدم "${userName}" بنجاح`
            : `تمت إزالة شارة "مميز" من المستخدم "${userName}"`
          : nextVIP
          ? `VIP badge granted to "${userName}"`
          : `VIP badge removed from "${userName}"`,
        'success'
      );
      if (onRefresh) onRefresh();
    } else {
      // Revert if failed
      setUsers((prev) =>
        Array.isArray(prev) ? prev.map((u) => (u.id === user.id ? { ...u, isVIP: !nextVIP } : u)) : []
      );
      showToast(language === 'ar' ? 'فشل تحديث شارة المستخدم' : 'Failed to update user badge', 'error');
    }
  };

  // Badging Action 2: Toggle Admin Pinned Profile Badge ("مثبت من الإدارة")
  const handleTogglePinnedProfile = async (user: CommunityUser) => {
    if (!user || !user.id) return;
    const nextPinned = !user.isPinned;
    const userName = user.name || 'User';

    // Optimistic UI update
    setUsers((prev) =>
      Array.isArray(prev) ? prev.map((u) => (u.id === user.id ? { ...u, isPinned: nextPinned } : u)) : []
    );

    const success = await AuthService.updateUserProfileBadges(user.id, { isPinned: nextPinned });
    if (success) {
      showToast(
        language === 'ar'
          ? nextPinned
            ? `تم تثبيت ملف المستخدم "${userName}" من الإدارة`
            : `تم إلغاء تثبيت ملف المستخدم "${userName}"`
          : nextPinned
          ? `User "${userName}" pinned by admin`
          : `User "${userName}" unpinned`,
        'success'
      );
      if (onRefresh) onRefresh();
    } else {
      // Revert if failed
      setUsers((prev) =>
        Array.isArray(prev) ? prev.map((u) => (u.id === user.id ? { ...u, isPinned: !nextPinned } : u)) : []
      );
      showToast(language === 'ar' ? 'فشل تحديث حالة التثبيت' : 'Failed to update pin status', 'error');
    }
  };

  return (
    <div id="admin-users-moderation-tab" className="space-y-6 w-full max-w-full overflow-hidden">
      {/* HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'المستخدمين و الحظر' : 'Users & Moderation'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'إدارة حسابات الأعضاء، الحظر الشامل، وحظر المجتمع مع مؤشرات السلوك'
                  : 'Manage registered users, full bans, community restrictions, and behavior indicators'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1f2b3e] transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث السجلات' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Total Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 font-mono">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">
            {language === 'ar' ? 'حسابات مسجلة' : 'Registered accounts'}
          </div>
        </div>

        {/* Active Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{language === 'ar' ? 'النشطون' : 'Active Users'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {stats.active.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            {language === 'ar' ? 'بدون أي قيود' : 'No restrictions'}
          </div>
        </div>

        {/* Community Banned */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{language === 'ar' ? 'حظر المجتمع' : 'Community Ban'}</span>
            <MessageSquareOff className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {stats.communityBanned.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            {language === 'ar' ? 'تقييد النشر والردود' : 'Restricted posting'}
          </div>
        </div>

        {/* Fully Restricted */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{language === 'ar' ? 'حظر كلي' : 'Fully Restricted'}</span>
            <Ban className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
            {stats.fullyBanned.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            {language === 'ar' ? 'حظر شامل للحساب' : 'Total ban active'}
          </div>
        </div>

        {/* Reported Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{language === 'ar' ? 'المبلغ عنهم' : 'Reported Users'}</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-2 font-mono">
            {stats.reported.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-orange-600/80 dark:text-orange-400/80 mt-0.5">
            {language === 'ar' ? 'توجد بلاغات مسجلة' : 'Reports filed'}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'بحث بالاسم، البريد الإلكتروني، المعرف أو الاسم التعريفي...'
                  : 'Search by name, email, ID or username...'
              }
              className="w-full ps-10 pe-4 py-2 text-xs bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#2A384C] rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#141C2B] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'All'} ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#141C2B] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'النشطون' : 'Active'} ({stats.active})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('community_banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'community_banned'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#141C2B] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'حظر المجتمع' : 'Community Banned'} ({stats.communityBanned})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('fully_banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'fully_banned'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#141C2B] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'حظر كلي' : 'Fully Restricted'} ({stats.fullyBanned})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('reported')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'reported'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#141C2B] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'ar' ? 'المبلغ عنهم' : 'Reported'} ({stats.reported})
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {filteredUsers.length} {language === 'ar' ? 'مستخدم مطابق للشروط' : 'matching users found'}
        </div>
      </div>

      {/* RESPONSIVE DATA TABLE */}
      <div className="rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] overflow-hidden shadow-xs w-full max-w-full">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[650px] text-start text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#141c2b] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2A384C]">
              <tr>
                <th className="p-3.5 font-bold text-start">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="p-3.5 font-bold text-start">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="p-3.5 font-bold text-center">{language === 'ar' ? 'مؤشرات السلوك' : 'Behavior Indicators'}</th>
                <th className="p-3.5 font-bold text-center">{language === 'ar' ? 'تاريخ التسجيل' : 'Registered'}</th>
                <th className="p-3.5 font-bold text-center">{language === 'ar' ? 'حالة الحظر' : 'Ban Status'}</th>
                <th className="p-3.5 font-bold text-end">{language === 'ar' ? 'إجراءات الإشراف' : 'Moderation Actions'}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#2A384C]/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">
                      {language === 'ar' ? 'لا يوجد مستخدمون يطابقون شروط البحث.' : 'No users match the search criteria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const safeId = String(user?.id || 'unknown');
                  const metrics = userMetricsMap.get(safeId) || {
                    reportsCount: 0,
                    activeViolations: 0,
                    postsCount: 0,
                    recentReports: [],
                  };

                  // Fallbacks for direct user object properties
                  const reportsCount =
                    typeof (user as any)?.reportsCount === 'number'
                      ? (user as any).reportsCount
                      : Array.isArray((user as any)?.reports)
                      ? (user as any).reports.length
                      : metrics.reportsCount || 0;

                  const postsCount =
                    typeof (user as any)?.postsCount === 'number'
                      ? (user as any).postsCount
                      : Array.isArray((user as any)?.posts)
                      ? (user as any).posts.length
                      : metrics.postsCount || 0;

                  // Defensive date parser
                  const rawDate =
                    user?.createdAt ||
                    (user as any)?.created_at ||
                    (user as any)?.joinedAt ||
                    (user as any)?.timestamp;

                  let registrationDate = language === 'ar' ? '15 يناير 2025' : 'Jan 15, 2025';
                  if (rawDate) {
                    try {
                      const d = new Date(rawDate);
                      if (!isNaN(d.getTime())) {
                        registrationDate = d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                      }
                    } catch {
                      // fallback
                    }
                  }

                  const displayName =
                    user?.name ||
                    (user as any)?.displayName ||
                    (user as any)?.fullName ||
                    (language === 'ar' ? 'مستخدم بدون اسم' : 'Unnamed User');

                  const displayUsername = user?.username || (user as any)?.user_name || 'user';
                  const displayId = safeId.length > 8 ? `${safeId.substring(0, 8)}...` : safeId;

                  const isFullyBanned = Boolean(user?.isBanned || (user as any)?.is_banned);
                  const isCommBanned = Boolean((user?.isCommunityBanned || (user as any)?.is_community_banned) && !isFullyBanned);
                  const isAdmin = user?.role === 'admin' || (user as any)?.isAdmin === true;

                  const avatarSrc =
                    user?.avatar ||
                    (user as any)?.avatarUrl ||
                    (user as any)?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

                  return (
                    <tr
                      key={safeId}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#1f2b3e]/60 transition-colors"
                    >
                      {/* Column 1: Avatar, Name & Username Slug */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarSrc}
                            alt={displayName}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                {displayName}
                              </span>
                              {isAdmin && (
                                <span className="px-1.5 py-0.2 rounded-md text-[9.5px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  ADMIN
                                </span>
                              )}
                              {user.isPinned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9.5px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
                                  <Pin className="w-2.5 h-2.5 fill-current" />
                                  <span>{t('pinnedBadge')}</span>
                                </span>
                              )}
                              {user.isVIP && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9.5px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>{t('featured')}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <span>@{displayUsername}</span>
                              <span>•</span>
                              <span className="truncate max-w-[80px]">ID: {displayId}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Email */}
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {user?.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{user.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            {language === 'ar' ? 'حساب زائر' : 'Guest'}
                          </span>
                        )}
                      </td>

                      {/* Column 3: Behavior Indicators (Reports & Posts) */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {/* Reports Indicator */}
                          <div
                            title={
                              language === 'ar'
                                ? `${reportsCount} بلاغ مسجل ضد هذا المستخدم`
                                : `${reportsCount} reports filed`
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold ${
                              reportsCount > 0
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>
                              {reportsCount} {language === 'ar' ? 'بلاغ' : 'reports'}
                            </span>
                          </div>

                          {/* Posts / Comments Count */}
                          <div
                            title={
                              language === 'ar'
                                ? `${postsCount} منشور ورد في المجتمع`
                                : `${postsCount} community posts`
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            <span>
                              {postsCount} {language === 'ar' ? 'مشاركة' : 'posts'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Registration Date */}
                      <td className="p-3.5 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{registrationDate}</span>
                        </div>
                      </td>

                      {/* Column 5: Status Badges */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isFullyBanned ? (
                          <span
                            title={
                              language === 'ar'
                                ? 'حظر شامل: مستثنى منه المفضلة والدعم فقط'
                                : 'Full ban: Only favorites and support allowed'
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          >
                            <Ban className="w-3 h-3" />
                            <span>{language === 'ar' ? 'حظر شامل' : 'Fully Banned'}</span>
                          </span>
                        ) : isCommBanned ? (
                          <span
                            title={
                              language === 'ar'
                                ? 'حظر من المجتمع فقط: تصفح الأوامر والدعم متاح'
                                : 'Community banned: Library & support accessible'
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          >
                            <MessageSquareOff className="w-3 h-3" />
                            <span>{language === 'ar' ? 'حظر المجتمع' : 'Community Ban'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{language === 'ar' ? 'نشط' : 'Active'}</span>
                          </span>
                        )}
                      </td>

                      {/* Column 6: Moderation Action Buttons */}
                      <td className="p-3.5 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Action A: Community Ban Toggle */}
                          <button
                            type="button"
                            id={`user-community-ban-btn-${safeId}`}
                            onClick={() => handleToggleCommunityBan(user)}
                            title={
                              isCommBanned
                                ? language === 'ar'
                                  ? 'إلغاء حظر المجتمع'
                                  : 'Unban from community'
                                : language === 'ar'
                                ? 'حظر من المجتمع فقط'
                                : 'Ban from community only'
                            }
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              isCommBanned
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isCommBanned ? (
                              <>
                                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                                <span className="hidden sm:inline">
                                  {language === 'ar' ? 'فك حظر المجتمع' : 'Unban Comm.'}
                                </span>
                              </>
                            ) : (
                              <>
                                <MessageSquareOff className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden sm:inline">
                                  {language === 'ar' ? 'حظر المجتمع' : 'Ban Comm.'}
                                </span>
                              </>
                            )}
                          </button>

                          {/* Action B: Full Ban Toggle */}
                          <button
                            type="button"
                            id={`user-full-ban-btn-${safeId}`}
                            onClick={() => handleToggleFullBan(user)}
                            title={
                              isFullyBanned
                                ? language === 'ar'
                                  ? 'إلغاء الحظر الشامل'
                                  : 'Lift full ban'
                                : language === 'ar'
                                ? 'حظر شامل للحساب'
                                : 'Apply full ban'
                            }
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              isFullyBanned
                                ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                            }`}
                          >
                            {isFullyBanned ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">
                                  {language === 'ar' ? 'فك الحظر الكلي' : 'Lift Ban'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span className="hidden sm:inline">
                                  {language === 'ar' ? 'حظر كلي' : 'Full Ban'}
                                </span>
                              </>
                            )}
                          </button>

                          {/* Action C: Role Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleRole(user)}
                            title={language === 'ar' ? 'تغيير الصلاحية (مدير/مستخدم)' : 'Toggle Role'}
                            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                              isAdmin
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          {/* Action D: Admin Pinned Profile Toggle */}
                          <button
                            type="button"
                            id={`user-pin-btn-${safeId}`}
                            onClick={() => handleTogglePinnedProfile(user)}
                            title={
                              user.isPinned
                                ? language === 'ar'
                                  ? 'إلغاء تثبيت الملف من الإدارة'
                                  : 'Unpin Profile'
                                : language === 'ar'
                                ? 'تثبيت الملف من الإدارة'
                                : 'Pin Profile by Admin'
                            }
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              user.isPinned
                                ? 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 border border-orange-500/40 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Pin className={`w-3.5 h-3.5 ${user.isPinned ? 'fill-current text-orange-500' : ''}`} />
                            <span className="hidden sm:inline">
                              {user.isPinned
                                ? (language === 'ar' ? 'مثبت' : 'Pinned')
                                : (language === 'ar' ? 'تثبيت' : 'Pin')}
                            </span>
                          </button>

                          {/* Action E: VIP / Featured Creator Toggle */}
                          <button
                            type="button"
                            id={`user-vip-btn-${safeId}`}
                            onClick={() => handleToggleVIP(user)}
                            title={
                              user.isVIP
                                ? language === 'ar'
                                  ? 'إلغاء شارة "مميز"'
                                  : 'Revoke VIP badge'
                                : language === 'ar'
                                ? 'منح شارة "مميز"'
                                : 'Grant VIP badge'
                            }
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              user.isVIP
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${user.isVIP ? 'fill-current text-amber-500' : ''}`} />
                            <span className="hidden sm:inline">
                              {user.isVIP
                                ? (language === 'ar' ? 'مميز' : 'VIP')
                                : (language === 'ar' ? 'تمييز' : 'VIP')}
                            </span>
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

      {/* Unified Styled Admin Confirmation Modal */}
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
