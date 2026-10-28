import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Film,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Maximize2,
  X,
  Play,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Prompt,
  CommunityPost,
  ContentMediaSettings,
  SectionMediaConfig,
} from '../../types';
import { StorageService } from '../../services/storage';
import { CommunityService } from '../../services/communityService';
import { AdminConfirmationModal, ConfirmationVariant } from './AdminConfirmationModal';
import { getPostUrl } from '../../utils/slugUtils';

interface ContentMediaTabProps {
  prompts: Prompt[];
  onRefreshData: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ContentMediaTab: React.FC<ContentMediaTabProps> = ({
  prompts,
  onRefreshData,
  onShowToast,
}) => {
  const { language, isRTL } = useApp();

  // Settings State
  const [settings, setSettings] = useState<ContentMediaSettings>(() =>
    StorageService.getContentMediaSettings()
  );

  // Form states for Section Constraints
  const [homeConstraints, setHomeConstraints] = useState<SectionMediaConfig>(
    () => settings.homePrompts
  );
  const [communityConstraints, setCommunityConstraints] = useState<SectionMediaConfig>(
    () => settings.community
  );

  // Community Posts
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() =>
    CommunityService.getAllPostsForAdmin()
  );

  // Active Sub-view inside Tab: 'queue' (طلبات النشر بالانتظار) | 'published' (المنشورات الحالية) | 'settings' (الإعدادات والقيود)
  const [activeSubView, setActiveSubView] = useState<'queue' | 'published' | 'settings'>('queue');

  // Filters for Published section
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'home' | 'community'>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');

  // Confirmation Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    variant: ConfirmationVariant;
    icon?: React.ReactNode;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'primary',
    onConfirm: () => {},
  });

  // Rejection Dialog with reason input
  const [rejectionDialog, setRejectionDialog] = useState<{
    isOpen: boolean;
    item: { id: string; type: 'prompt' | 'post'; title: string } | null;
    reason: string;
  }>({
    isOpen: false,
    item: null,
    reason: '',
  });

  // Media Lightbox Modal
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: 'image' | 'video';
    url: string;
    title?: string;
  } | null>(null);

  // Refresh community posts and settings
  const refreshData = () => {
    setCommunityPosts(CommunityService.getAllPostsForAdmin());
    const currentSettings = StorageService.getContentMediaSettings();
    setSettings(currentSettings);
    setHomeConstraints(currentSettings.homePrompts);
    setCommunityConstraints(currentSettings.community);
    onRefreshData();
  };

  useEffect(() => {
    const handleSettingsChanged = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
        setHomeConstraints(e.detail.homePrompts);
        setCommunityConstraints(e.detail.community);
      }
    };
    window.addEventListener('prombo_content_media_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('prombo_content_media_settings_changed', handleSettingsChanged);
  }, []);

  // Listen for admin real-time sync events to immediately re-read from storage
  useEffect(() => {
    const handleRealtimeSync = () => {
      refreshData();
    };
    window.addEventListener('prombo_admin_realtime_sync', handleRealtimeSync);
    window.addEventListener('prombo_community_posts_change', handleRealtimeSync);
    window.addEventListener('prombo_post_created', handleRealtimeSync);
    return () => {
      window.removeEventListener('prombo_admin_realtime_sync', handleRealtimeSync);
      window.removeEventListener('prombo_community_posts_change', handleRealtimeSync);
      window.removeEventListener('prombo_post_created', handleRealtimeSync);
    };
  }, []);

  // Compute Pending Queue (Prompts with pending status OR community posts with pending status)
  const pendingPrompts = useMemo(() => {
    return prompts.filter((p) => p.status === 'pending');
  }, [prompts]);

  const pendingCommunityPosts = useMemo(() => {
    return communityPosts.filter((p) => p.status === 'pending');
  }, [communityPosts]);

  const totalPendingCount = pendingPrompts.length + pendingCommunityPosts.length;

  // Compute Live Published Content (both Home Prompts and Community Posts)
  const publishedPrompts = useMemo(() => {
    return prompts.filter((p) => p.status === 'approved' || !p.status);
  }, [prompts]);

  const publishedCommunityPosts = useMemo(() => {
    return communityPosts.filter((p) => p.status !== 'pending' && p.status !== 'deleted');
  }, [communityPosts]);

  // Combined published items with unified metadata
  const filteredPublishedItems = useMemo(() => {
    const items: Array<{
      id: string;
      source: 'home' | 'community';
      title: string;
      content: string;
      author: string;
      authorEmail?: string;
      avatar?: string;
      createdAt: string;
      status: string;
      images: string[];
      videos: string[];
      videoUrl?: string;
      mediaType: 'image' | 'video' | 'mixed' | 'none';
      promptCategory?: string;
      promptModel?: string;
      directUrl: string;
      rawPrompt?: Prompt;
      rawPost?: CommunityPost;
    }> = [];

    // Add Home prompts
    if (sectionFilter === 'all' || sectionFilter === 'home') {
      publishedPrompts.forEach((p) => {
        const imgs: string[] = [];
        if (p.imageUrl) imgs.push(p.imageUrl);
        if (p.images) imgs.push(...p.images);

        const vids: string[] = [];
        if (p.videoUrl) vids.push(p.videoUrl);
        if (p.videos) vids.push(...p.videos);

        let mediaType: 'image' | 'video' | 'mixed' | 'none' = 'none';
        if (imgs.length > 0 && vids.length > 0) mediaType = 'mixed';
        else if (vids.length > 0) mediaType = 'video';
        else if (imgs.length > 0) mediaType = 'image';

        // Filter by media type if requested
        if (mediaTypeFilter === 'image' && imgs.length === 0) return;
        if (mediaTypeFilter === 'video' && vids.length === 0) return;

        // Filter by search query
        if (
          searchQuery &&
          !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.prompt.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(p.author || '').toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return;
        }

        items.push({
          id: p.id,
          source: 'home',
          title: p.title,
          content: p.prompt,
          author: p.author || 'Anonymous',
          authorEmail: p.authorEmail,
          avatar: p.authorAvatar,
          createdAt: p.createdAt || p.submittedAt || new Date().toISOString(),
          status: p.status || 'approved',
          images: imgs,
          videos: vids,
          videoUrl: p.videoUrl,
          mediaType,
          promptCategory: p.categoryId,
          promptModel: p.targetModel,
          directUrl: `${window.location.origin}/#prompt-${p.id}`,
          rawPrompt: p,
        });
      });
    }

    // Add Community posts
    if (sectionFilter === 'all' || sectionFilter === 'community') {
      publishedCommunityPosts.forEach((post) => {
        const imgs: string[] = [];
        if (post.images) imgs.push(...post.images);

        const vids: string[] = [];
        if (post.videoUrl) vids.push(post.videoUrl);
        if (post.videos) vids.push(...post.videos);

        let mediaType: 'image' | 'video' | 'mixed' | 'none' = 'none';
        if (imgs.length > 0 && vids.length > 0) mediaType = 'mixed';
        else if (vids.length > 0) mediaType = 'video';
        else if (imgs.length > 0) mediaType = 'image';

        if (mediaTypeFilter === 'image' && imgs.length === 0) return;
        if (mediaTypeFilter === 'video' && vids.length === 0) return;

        if (
          searchQuery &&
          !post.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !post.userName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(post.promptTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return;
        }

        items.push({
          id: post.id,
          source: 'community',
          title: post.promptTitle ? `${language === 'ar' ? 'مشاركة حول:' : 'Post on:'} ${post.promptTitle}` : (language === 'ar' ? 'منشور مجتمع' : 'Community Post'),
          content: post.content,
          author: post.userName || 'Member',
          authorEmail: post.userEmail,
          avatar: post.userAvatar,
          createdAt: post.createdAt,
          status: post.status,
          images: imgs,
          videos: vids,
          videoUrl: post.videoUrl,
          mediaType,
          promptCategory: post.promptCategory,
          promptModel: post.promptModel,
          directUrl: getPostUrl(post.id),
          rawPost: post,
        });
      });
    }

    // Sort descending by date
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [publishedPrompts, publishedCommunityPosts, sectionFilter, mediaTypeFilter, searchQuery, language]);

  // -------------------------------------------------------------
  // ACTION HANDLERS WITH ADMIN CONFIRMATION MODAL
  // -------------------------------------------------------------

  // 1. Toggle Master Moderation Switch
  const handleTogglePriorModeration = () => {
    const nextState = !settings.priorModerationEnabled;
    setModalConfig({
      isOpen: true,
      title: nextState
        ? (language === 'ar' ? 'تفعيل الإشراف المسبق على المحتوى' : 'Enable Prior Moderation')
        : (language === 'ar' ? 'تعطيل الإشراف المسبق على المحتوى' : 'Disable Prior Moderation'),
      description: nextState ? (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {language === 'ar'
              ? 'عند تفعيل الإشراف المسبق، سيتم تحويل أي منشور أو برومبت يحتوي على وسائط ومرفقات إلى حالة "قيد الانتظار" ولن يظهر للجمهور إلا بعد موافقة الإدارة.'
              : 'When prior moderation is enabled, all new posts or prompts with media will enter "Pending" status and require Admin approval before appearing publicly.'}
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 font-medium">
            {language === 'ar'
              ? '⚡ يضمن هذا الخيار حماية المنصة والتحقق من سلامة المرفقات قبل عرضها.'
              : '⚡ This ensures platform safety and integrity before user attachments go live.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {language === 'ar'
              ? 'عند تعطيل الإشراف المسبق، سيتم نشر جميع المنشورات والبرومبتات الجديدة مع الوسائط فوراً دون مراجعة مسبقة.'
              : 'When disabled, all new submissions with media will publish immediately without prior Admin review.'}
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-800 dark:text-red-300 font-medium">
            {language === 'ar'
              ? '⚠️ تنبيه: قد يؤدي النشر الفوري إلى ظهور محتوى غير مناسب حتى يقوم المشرف بحذفه.'
              : '⚠️ Warning: Instant publishing means content goes live immediately until manually moderated.'}
          </div>
        </div>
      ),
      variant: nextState ? 'primary' : 'warning',
      confirmText: nextState
        ? (language === 'ar' ? 'نعم، تفعيل الإشراف' : 'Enable Moderation')
        : (language === 'ar' ? 'نعم، تعطيل الإشراف' : 'Disable Moderation'),
      icon: nextState ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />,
      onConfirm: () => {
        const updated = StorageService.updateContentMediaSettings({
          priorModerationEnabled: nextState,
        });
        setSettings(updated);
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          nextState
            ? (language === 'ar' ? 'تم تفعيل الإشراف المسبق بنجاح' : 'Prior moderation enabled')
            : (language === 'ar' ? 'تم تعطيل الإشراف المسبق' : 'Prior moderation disabled'),
          'success'
        );
      },
    });
  };

  // 2. Toggle Section Master Media Uploads
  const handleToggleSectionMaster = (section: 'home' | 'community') => {
    const currentSectionConfig = section === 'home' ? settings.homePrompts : settings.community;
    const nextState = !currentSectionConfig.masterEnabled;
    const sectionName = section === 'home'
      ? (language === 'ar' ? 'الصفحة الرئيسية (البرومبتات)' : 'Home Page (Prompts)')
      : (language === 'ar' ? 'صفحة المجتمع' : 'Community Section');

    setModalConfig({
      isOpen: true,
      title: nextState
        ? (language === 'ar' ? `تفعيل رفع الميديا في ${sectionName}` : `Enable Media Uploads for ${sectionName}`)
        : (language === 'ar' ? `تعطيل رفع الميديا في ${sectionName}` : `Disable Media Uploads for ${sectionName}`),
      description: (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {nextState
            ? (language === 'ar'
                ? `سيتم السماح للمستخدمين بإرفاق الصور والفيديوهات في قسم ${sectionName} وفقاً للقيود المحددة.`
                : `Users will be allowed to upload photos and videos in ${sectionName} according to defined constraints.`)
            : (language === 'ar'
                ? `سيتم إخفاء أزرار رفع الميديا بالكامل في قسم ${sectionName} ومنع أي رفع جديد.`
                : `Media upload buttons will be hidden completely in ${sectionName}, preventing any new uploads.`)}
        </p>
      ),
      variant: nextState ? 'primary' : 'warning',
      confirmText: nextState ? (language === 'ar' ? 'تأكيد التفعيل' : 'Confirm Enable') : (language === 'ar' ? 'تأكيد التعطيل' : 'Confirm Disable'),
      onConfirm: () => {
        const partial = section === 'home'
          ? { homePrompts: { ...settings.homePrompts, masterEnabled: nextState } }
          : { community: { ...settings.community, masterEnabled: nextState } };
        const updated = StorageService.updateContentMediaSettings(partial);
        setSettings(updated);
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          language === 'ar' ? `تم تحديث حالة الميديا في ${sectionName}` : `Updated media settings for ${sectionName}`,
          'success'
        );
      },
    });
  };

  // 3. Toggle Sub-flags (Photos / Videos)
  const handleToggleSubFlag = (section: 'home' | 'community', field: 'enablePhotoUploads' | 'enableVideoUploads') => {
    const currentSectionConfig = section === 'home' ? settings.homePrompts : settings.community;
    const nextState = !currentSectionConfig[field];
    const fieldName = field === 'enablePhotoUploads'
      ? (language === 'ar' ? 'رفع الصور' : 'Photo Uploads')
      : (language === 'ar' ? 'رفع الفيديوهات' : 'Video Uploads');
    const sectionName = section === 'home'
      ? (language === 'ar' ? 'الصفحة الرئيسية' : 'Home Page')
      : (language === 'ar' ? 'المجتمع' : 'Community');

    setModalConfig({
      isOpen: true,
      title: nextState
        ? (language === 'ar' ? `تفعيل ${fieldName} في ${sectionName}` : `Enable ${fieldName} in ${sectionName}`)
        : (language === 'ar' ? `تعطيل ${fieldName} في ${sectionName}` : `Disable ${fieldName} in ${sectionName}`),
      description: (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {nextState
            ? (language === 'ar' ? `سيتم تمكين خيار ${fieldName} للمستخدمين في ${sectionName}.` : `Enables ${fieldName} for users in ${sectionName}.`)
            : (language === 'ar' ? `سيتم إيقاف خيار ${fieldName} في ${sectionName}.` : `Disables ${fieldName} in ${sectionName}.`)}
        </p>
      ),
      variant: nextState ? 'primary' : 'warning',
      onConfirm: () => {
        const partial = section === 'home'
          ? { homePrompts: { ...settings.homePrompts, [field]: nextState } }
          : { community: { ...settings.community, [field]: nextState } };
        const updated = StorageService.updateContentMediaSettings(partial);
        setSettings(updated);
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(language === 'ar' ? 'تم تحديث الإعداد بنجاح' : 'Setting updated successfully', 'success');
      },
    });
  };

  // 4. Save Constraints Configuration
  const handleSaveConstraints = (section: 'home' | 'community') => {
    const currentConfig = section === 'home' ? homeConstraints : communityConstraints;
    const sectionName = section === 'home'
      ? (language === 'ar' ? 'الصفحة الرئيسية' : 'Home Page')
      : (language === 'ar' ? 'صفحة المجتمع' : 'Community Section');

    setModalConfig({
      isOpen: true,
      title: language === 'ar' ? `حفظ قيود الميديا: ${sectionName}` : `Save Media Constraints: ${sectionName}`,
      description: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>{language === 'ar' ? 'سيتم تطبيق القيود التالية فوراً على كافة عمليات الرفع الجديدة:' : 'The following constraints will apply immediately to all new uploads:'}</p>
          <ul className="list-disc list-inside space-y-1 p-3 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
            <li>{language === 'ar' ? 'الحد الأقصى لحجم الصورة:' : 'Max Photo Size:'} {currentConfig.maxPhotoSizeMB} MB</li>
            <li>{language === 'ar' ? 'الحد الأقصى لحجم الفيديو:' : 'Max Video Size:'} {currentConfig.maxVideoSizeMB} MB</li>
            <li>{language === 'ar' ? 'الحد الأقصى لعدد الصور:' : 'Max Photos Count:'} {currentConfig.maxPhotosCount}</li>
            <li>{language === 'ar' ? 'الحد الأقصى لمدة الفيديو:' : 'Max Video Duration:'} {currentConfig.maxVideoDurationSec} {language === 'ar' ? 'ثانية' : 'sec'}</li>
          </ul>
        </div>
      ),
      variant: 'primary',
      confirmText: language === 'ar' ? 'تأكيد وحفظ القيود' : 'Confirm & Save Constraints',
      onConfirm: () => {
        const partial = section === 'home'
          ? { homePrompts: homeConstraints }
          : { community: communityConstraints };
        const updated = StorageService.updateContentMediaSettings(partial);
        setSettings(updated);
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(language === 'ar' ? 'تم حفظ قيود الميديا بنجاح' : 'Media constraints saved', 'success');
      },
    });
  };

  // 5. Approve Pending Submission
  const handleApproveSubmission = (item: { id: string; type: 'prompt' | 'post'; title: string }) => {
    setModalConfig({
      isOpen: true,
      title: language === 'ar' ? 'الموافقة على النشر' : 'Approve Submission',
      description: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {language === 'ar'
              ? `هل أنت متأكد من رغبتك في الموافقة على نشر: "${item.title}"؟`
              : `Are you sure you want to approve and publish: "${item.title}"?`}
          </p>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300">
            {language === 'ar'
              ? '✓ سيصبح هذا المحتوى متاحاً ومرئياً لجميع الزوار فوراً، وسيتم إشعار صاحب المشاركة بقبولها.'
              : '✓ Content will become publicly visible immediately, and the author will receive an in-app notification.'}
          </div>
        </div>
      ),
      variant: 'primary',
      confirmText: language === 'ar' ? 'موافقة ونشر' : 'Approve & Publish',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      onConfirm: async () => {
        if (item.type === 'prompt') {
          StorageService.updatePromptStatus(item.id, 'approved', undefined, true);
        } else {
          await CommunityService.approvePost(item.id);
        }
        refreshData();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          language === 'ar' ? 'تمت الموافقة على المنشور وإشعار المستخدم' : 'Submission approved and user notified',
          'success'
        );
      },
    });
  };

  // 6. Reject Pending Submission Workflow
  const handleOpenRejectionDialog = (item: { id: string; type: 'prompt' | 'post'; title: string }) => {
    setRejectionDialog({
      isOpen: true,
      item,
      reason: '',
    });
  };

  const handleConfirmRejection = () => {
    if (!rejectionDialog.item) return;
    const { id, type, title } = rejectionDialog.item;
    const reason = rejectionDialog.reason.trim();

    setModalConfig({
      isOpen: true,
      title: language === 'ar' ? 'تأكيد رفض المحتوى' : 'Confirm Content Rejection',
      description: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {language === 'ar'
              ? `سيتم رفض نشر "${title}".`
              : `The submission "${title}" will be rejected.`}
          </p>
          {reason && (
            <div className="p-2.5 bg-slate-50 dark:bg-[#121824] rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300">{language === 'ar' ? 'سبب الرفض الموجه للمستخدم:' : 'Rejection Reason for User:'}</span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 italic">{reason}</p>
            </div>
          )}
          <p className="text-amber-700 dark:text-amber-400 font-medium">
            {language === 'ar'
              ? '📩 سيصل إشعار فوري لصاحب المشاركة موضحاً سبب الرفض.'
              : '📩 An automated in-app notification with the reason will be sent to the user.'}
          </p>
        </div>
      ),
      variant: 'danger',
      confirmText: language === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection',
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      onConfirm: async () => {
        if (type === 'prompt') {
          StorageService.updatePromptStatus(id, 'rejected', undefined, true, reason);
        } else {
          await CommunityService.rejectPost(id, reason);
        }
        setRejectionDialog({ isOpen: false, item: null, reason: '' });
        refreshData();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          language === 'ar' ? 'تم رفض المحتوى وإرسال الإشعار للمستخدم' : 'Content rejected and user notified',
          'info'
        );
      },
    });
  };

  // 7. Toggle Visibility (Soft-Hide / Unhide)
  const handleToggleVisibility = (item: { id: string; source: 'home' | 'community'; title: string; currentStatus: string }) => {
    const isCurrentlyHidden = item.currentStatus === 'hidden' || item.currentStatus === 'inactive';
    const nextHidden = !isCurrentlyHidden;

    setModalConfig({
      isOpen: true,
      title: nextHidden
        ? (language === 'ar' ? 'إخفاء المحتوى من الظهور العام' : 'Hide Content from Public View')
        : (language === 'ar' ? 'إلغاء إخفاء المحتوى' : 'Unhide Content'),
      description: (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {nextHidden
            ? (language === 'ar'
                ? `سيتم إخفاء "${item.title}" مؤقتاً عن جميع زوار الموقع دون حذفه نهائياً.`
                : `"${item.title}" will be temporarily hidden from visitors without permanent deletion.`)
            : (language === 'ar'
                ? `سيتم إعادة إظهار "${item.title}" للزوار والجمهور.`
                : `"${item.title}" will be visible again to visitors.`)}
        </p>
      ),
      variant: nextHidden ? 'warning' : 'primary',
      confirmText: nextHidden ? (language === 'ar' ? 'إخفاء الآن' : 'Hide Now') : (language === 'ar' ? 'إظهار الآن' : 'Unhide Now'),
      icon: nextHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />,
      onConfirm: async () => {
        if (item.source === 'home') {
          StorageService.updatePromptStatus(item.id, nextHidden ? 'inactive' : 'approved', undefined, true);
        } else {
          await CommunityService.togglePostVisibility(item.id, nextHidden);
        }
        refreshData();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          nextHidden
            ? (language === 'ar' ? 'تم إخفاء المحتوى بنجاح' : 'Content hidden')
            : (language === 'ar' ? 'تم إظهار المحتوى للجمهور' : 'Content is now visible'),
          'success'
        );
      },
    });
  };

  // 8. Hard Delete Content
  const handleHardDelete = (item: { id: string; source: 'home' | 'community'; title: string }) => {
    setModalConfig({
      isOpen: true,
      title: language === 'ar' ? 'حذف المحتوى نهائياً' : 'Permanent Delete',
      description: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {language === 'ar'
              ? `هل أنت متأكد تماماً من رغبتك في حذف: "${item.title}" نهائياً من قاعدة البيانات والتخزين؟`
              : `Are you completely sure you want to permanently delete: "${item.title}" and all its media files?`}
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 font-bold">
            {language === 'ar'
              ? '⛔ هذا الإجراء نهائي ولا يمكن التراجع عنه بأي شكل.'
              : '⛔ This action is irreversible. All associated text, comments, and media files will be lost.'}
          </div>
        </div>
      ),
      variant: 'danger',
      confirmText: language === 'ar' ? 'نعم، حذف نهائي' : 'Yes, Delete Permanently',
      icon: <Trash2 className="w-5 h-5 text-red-600" />,
      onConfirm: async () => {
        if (item.source === 'home') {
          StorageService.deletePrompt(item.id, undefined, true);
        } else {
          await CommunityService.deletePostHard(item.id);
        }
        refreshData();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onShowToast(
          language === 'ar' ? 'تم حذف المحتوى والمرفقات نهائياً' : 'Content deleted permanently',
          'info'
        );
      },
    });
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Top Banner: Master Moderation Switch */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              settings.priorModerationEnabled
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {language === 'ar' ? 'الإشراف المسبق قبل النشر' : 'Prior Moderation Control'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  settings.priorModerationEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {settings.priorModerationEnabled
                    ? (language === 'ar' ? 'مفعل (قيد المراجعة)' : 'Active (Pending Approval)')
                    : (language === 'ar' ? 'معطل (نشر فوري)' : 'Disabled (Instant Publish)')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {language === 'ar'
                  ? 'عند التفعيل، تدخل كافة المشاركات والبرومبتات المزودة بملفات وسائط (صور وفيديوهات) في طابور المراجعة المسبقة وتتطلب موافقة الأدمن قبل ظهورها للزوار.'
                  : 'When enabled, all posts and prompts with media attachments enter the pending moderation queue and require Admin approval before public visibility.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              type="button"
              id="btn-toggle-master-moderation"
              onClick={handleTogglePriorModeration}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.priorModerationEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.priorModerationEnabled}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.priorModerationEnabled
                    ? isRTL ? '-translate-x-6' : 'translate-x-6'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#2A384C] pb-3 overflow-x-auto custom-scrollbar w-full">
        {/* Sub-Tab 1: Moderation Queue */}
        <button
          type="button"
          id="subtab-queue"
          onClick={() => setActiveSubView('queue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'queue'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{language === 'ar' ? 'طلبات النشر بالانتظار' : 'Pending Moderation Queue'}</span>
          {totalPendingCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeSubView === 'queue' ? 'bg-white text-orange-600' : 'bg-orange-600 text-white'
            }`}>
              {totalPendingCount}
            </span>
          )}
        </button>

        {/* Sub-Tab 2: Published Content */}
        <button
          type="button"
          id="subtab-published"
          onClick={() => setActiveSubView('published')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'published'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{language === 'ar' ? 'المنشورات الحالية' : 'Live Published Content'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
            activeSubView === 'published' ? 'bg-white text-orange-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {filteredPublishedItems.length}
          </span>
        </button>

        {/* Sub-Tab 3: Hierarchical Feature Flags & Constraints Controls */}
        <button
          type="button"
          id="subtab-settings"
          onClick={() => setActiveSubView('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'settings'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182232]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{language === 'ar' ? 'إعدادات وقيود الميديا' : 'Media Flags & Constraints'}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: PENDING MODERATION QUEUE                               */}
      {/* ============================================================== */}
      {activeSubView === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'المشاركات بانتظار المراجعة والاعتماد' : 'Submissions Awaiting Approval'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'قم بمعاينة النصوص والصور والفيديوهات المرفقة قبل اتخاذ قرار الموافقة أو الرفض.'
                  : 'Preview attached text, images, and videos before approving or rejecting.'}
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#182232] dark:hover:bg-[#202c3e] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-[#2A384C]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تحديث القائمة' : 'Refresh'}</span>
            </button>
          </div>

          {totalPendingCount === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {language === 'ar' ? 'طابور المراجعة فارغ تماماً!' : 'Moderation Queue is Empty!'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {language === 'ar'
                  ? 'لا توجد أي منشورات أو برومبتات جديدة بانتظار الموافقة في الوقت الحالي.'
                  : 'All user submissions with media attachments have been reviewed.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* Pending Community Posts */}
              {pendingCommunityPosts.map((post) => (
                <div
                  key={`pending-post-${post.id}`}
                  className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-amber-200/70 dark:border-amber-500/30 shadow-xs space-y-4"
                >
                  {/* Metadata Header */}
                  <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg overflow-hidden shrink-0">
                        {post.userAvatar ? (
                          <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                        ) : (
                          <span>👤</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{post.userName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            {language === 'ar' ? 'منشور مجتمع' : 'Community Post'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {post.userEmail && <span>{post.userEmail}</span>}
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveSubmission({ id: post.id, type: 'post', title: post.content.slice(0, 40) })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'موافقة ونشر' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectionDialog({ id: post.id, type: 'post', title: post.content.slice(0, 40) })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'رفض' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Text Content */}
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>

                  {/* Attached Media: Images & Videos */}
                  {(post.images && post.images.length > 0) || (post.videos && post.videos.length > 0) || post.videoUrl ? (
                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'ar' ? 'معاينة الوسائط المرفقة:' : 'Attached Media Preview:'}
                      </div>

                      {/* Image Gallery Preview */}
                      {post.images && post.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {post.images.map((imgUrl, i) => (
                            <div
                              key={i}
                              onClick={() => setLightboxMedia({ type: 'image', url: imgUrl, title: post.content.slice(0, 30) })}
                              className="relative aspect-video rounded-xl overflow-hidden bg-slate-900/50 border border-slate-200 dark:border-slate-800 cursor-pointer group shadow-xs"
                            >
                              <img
                                src={imgUrl}
                                alt={`Attachment ${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* HTML5 Video Player Preview */}
                      {(post.videoUrl || (post.videos && post.videos.length > 0)) && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/90 max-w-xl">
                          <video
                            controls
                            playsInline
                            src={post.videoUrl || post.videos?.[0]}
                            className="w-full max-h-72 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}

              {/* Pending Prompts */}
              {pendingPrompts.map((prompt) => (
                <div
                  key={`pending-prompt-${prompt.id}`}
                  className="p-5 rounded-3xl bg-white dark:bg-[#182232] border border-orange-200/70 dark:border-orange-500/30 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
                        ⚡
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{prompt.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                            {language === 'ar' ? 'الصفحة الرئيسية (برومبت)' : 'Home Prompt'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{prompt.author || 'Anonymous'}</span>
                          {prompt.authorEmail && <span>({prompt.authorEmail})</span>}
                          <span>•</span>
                          <span>{new Date(prompt.createdAt || prompt.submittedAt || Date.now()).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveSubmission({ id: prompt.id, type: 'prompt', title: prompt.title })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'موافقة ونشر' : 'Approve'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectionDialog({ id: prompt.id, type: 'prompt', title: prompt.title })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'رفض' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {prompt.prompt}
                  </div>

                  {prompt.imageUrl && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'ar' ? 'الصورة المرفقة للبرومبت:' : 'Prompt Attachment:'}
                      </div>
                      <div
                        onClick={() => setLightboxMedia({ type: 'image', url: prompt.imageUrl!, title: prompt.title })}
                        className="relative max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group shadow-xs"
                      >
                        <img
                          src={prompt.imageUrl}
                          alt={prompt.title}
                          className="w-full max-h-56 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: LIVE PUBLISHED CONTENT MANAGEMENT                      */}
      {/* ============================================================== */}
      {activeSubView === 'published' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C]">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث في المنشورات والميديا...' : 'Search posts and media...'}
                className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500`}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Section Filter */}
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="all">{language === 'ar' ? 'كافة الأقسام' : 'All Sections'}</option>
                <option value="home">{language === 'ar' ? 'الصفحة الرئيسية فقط' : 'Home Prompts Only'}</option>
                <option value="community">{language === 'ar' ? 'المجتمع فقط' : 'Community Only'}</option>
              </select>

              {/* Media Type Filter */}
              <select
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="all">{language === 'ar' ? 'جميع الوسائط' : 'All Media Types'}</option>
                <option value="image">{language === 'ar' ? 'يحتوي صوراً' : 'Has Photos'}</option>
                <option value="video">{language === 'ar' ? 'يحتوي فيديو' : 'Has Video'}</option>
              </select>
            </div>
          </div>

          {/* Published Content Grid / List */}
          {filteredPublishedItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-2">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {language === 'ar' ? 'لا توجد نتائج تطابق خيارات التصفية الحالية' : 'No published content matches the filter'}
              </p>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'جرب تغيير كلمة البحث أو إعادة تعيين الفلاتر.' : 'Try adjusting your search or reset filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPublishedItems.map((item) => {
                const isHidden = item.status === 'hidden' || item.status === 'inactive';

                return (
                  <div
                    key={`pub-${item.source}-${item.id}`}
                    className={`p-5 rounded-3xl bg-white dark:bg-[#182232] border transition-colors space-y-4 shadow-xs ${
                      isHidden
                        ? 'border-dashed border-slate-300 dark:border-slate-700 opacity-75'
                        : 'border-slate-200 dark:border-[#2A384C]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.author} className="w-full h-full object-cover" />
                          ) : (
                            <span>{item.source === 'home' ? '⚡' : '👤'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.source === 'home'
                                ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30'
                                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                            }`}>
                              {item.source === 'home' ? (language === 'ar' ? 'الرئيسية' : 'Home') : (language === 'ar' ? 'المجتمع' : 'Community')}
                            </span>
                            {isHidden && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
                                <EyeOff className="w-3 h-3" />
                                <span>{language === 'ar' ? 'مخفي' : 'Hidden'}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{item.author}</span>
                            {item.authorEmail && <span>({item.authorEmail})</span>}
                            <span>•</span>
                            <span>{new Date(item.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Direct Link */}
                        <a
                          href={item.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'الرابط المباشر' : 'Direct Link'}</span>
                        </a>

                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility({ id: item.id, source: item.source, title: item.title, currentStatus: item.status })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                            isHidden
                              ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{isHidden ? (language === 'ar' ? 'إظهار' : 'Unhide') : (language === 'ar' ? 'إخفاء' : 'Hide')}</span>
                        </button>

                        {/* Hard Delete */}
                        <button
                          type="button"
                          onClick={() => handleHardDelete({ id: item.id, source: item.source, title: item.title })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'حذف نهائي' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Content Text */}
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed line-clamp-3">
                      {item.content}
                    </p>

                    {/* Media Attachments Preview */}
                    {(item.images.length > 0 || item.videos.length > 0) && (
                      <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
                        {item.images.map((imgUrl, i) => (
                          <div
                            key={i}
                            onClick={() => setLightboxMedia({ type: 'image', url: imgUrl, title: item.title })}
                            className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 cursor-pointer group shadow-xs"
                          >
                            <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ))}

                        {item.videos.map((vidUrl, i) => (
                          <div
                            key={`vid-${i}`}
                            onClick={() => setLightboxMedia({ type: 'video', url: vidUrl, title: item.title })}
                            className="relative w-28 h-20 rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shrink-0 cursor-pointer group flex items-center justify-center shadow-xs"
                          >
                            <video src={vidUrl} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: HIERARCHICAL FEATURE FLAGS & CONSTRAINTS CONTROLS      */}
      {/* ============================================================== */}
      {activeSubView === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 1: HOME / PROMPTS (الصفحة الرئيسية) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-5 shadow-xs">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'الصفحة الرئيسية (مكتبة الأوامر)' : 'Home Section (Prompts)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'التحكم في مرفقات الوسائط عند إنشاء أو تحرير البرومبتات.' : 'Controls for media attached to public prompts.'}
                  </p>
                </div>
              </div>

              {/* Master Section Toggle */}
              <button
                type="button"
                id="toggle-home-master"
                onClick={() => handleToggleSectionMaster('home')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.homePrompts.masterEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={settings.homePrompts.masterEnabled}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.homePrompts.masterEnabled
                      ? isRTL ? '-translate-x-5' : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Hierarchical Sub-Toggles */}
            <div className={`space-y-4 transition-opacity ${settings.homePrompts.masterEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ImageIcon className="w-4 h-4 text-orange-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {language === 'ar' ? 'تفعيل إضافة الصور' : 'Enable Photo Uploads'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar' ? 'السماح بإرفاق صور استرشادية مع البرومبت' : 'Allow attaching photos with prompts'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.homePrompts.enablePhotoUploads}
                    onChange={() => handleToggleSubFlag('home', 'enablePhotoUploads')}
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                  />
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Film className="w-4 h-4 text-orange-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {language === 'ar' ? 'تفعيل إضافة الفيديوهات' : 'Enable Video Uploads'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar' ? 'السماح برفع مقاطع فيديو توضيحية للأوامر' : 'Allow uploading explanatory video clips'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.homePrompts.enableVideoUploads}
                    onChange={() => handleToggleSubFlag('home', 'enableVideoUploads')}
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Constraints Configuration */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-500" />
                  <span>{language === 'ar' ? 'قيود الملفات والحجم (الرئيسية)' : 'File & Size Constraints (Home)'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'الحد الأقصى لحجم الصورة (MB)' : 'Max Photo Size (MB)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={homeConstraints.maxPhotoSizeMB}
                      onChange={(e) => setHomeConstraints({ ...homeConstraints, maxPhotoSizeMB: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'الحد الأقصى لحجم الفيديو (MB)' : 'Max Video Size (MB)'}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={homeConstraints.maxVideoSizeMB}
                      onChange={(e) => setHomeConstraints({ ...homeConstraints, maxVideoSizeMB: Math.max(5, parseInt(e.target.value) || 5) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'الحد الأقصى لعدد الصور المسموحة' : 'Max Photos Allowed'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={homeConstraints.maxPhotosCount}
                      onChange={(e) => setHomeConstraints({ ...homeConstraints, maxPhotosCount: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'أقصى مدة للفيديو (بالثواني)' : 'Max Video Duration (Sec)'}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={600}
                      value={homeConstraints.maxVideoDurationSec}
                      onChange={(e) => setHomeConstraints({ ...homeConstraints, maxVideoDurationSec: Math.max(10, parseInt(e.target.value) || 10) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveConstraints('home')}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {language === 'ar' ? 'حفظ قيود الصفحة الرئيسية' : 'Save Home Constraints'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: COMMUNITY (صفحة المجتمع) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#2A384C] space-y-5 shadow-xs">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  👥
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'صفحة المجتمع (المناقشات)' : 'Community Section'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'التحكم في مرفقات المشاركات والردود في المنتدى.' : 'Controls for media attached to forum posts.'}
                  </p>
                </div>
              </div>

              {/* Master Section Toggle */}
              <button
                type="button"
                id="toggle-community-master"
                onClick={() => handleToggleSectionMaster('community')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.community.masterEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={settings.community.masterEnabled}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.community.masterEnabled
                      ? isRTL ? '-translate-x-5' : 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Hierarchical Sub-Toggles */}
            <div className={`space-y-4 transition-opacity ${settings.community.masterEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {language === 'ar' ? 'تفعيل إضافة الصور' : 'Enable Photo Uploads'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar' ? 'السماح بإرفاق لقطات شاشة وصور مع منشورات المجتمع' : 'Allow attaching photos with community posts'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.community.enablePhotoUploads}
                    onChange={() => handleToggleSubFlag('community', 'enablePhotoUploads')}
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                  />
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Film className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {language === 'ar' ? 'تفعيل إضافة الفيديوهات' : 'Enable Video Uploads'}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar' ? 'السماح برفع مقاطع فيديو قصيرة في النقاشات' : 'Allow uploading short videos in forum threads'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.community.enableVideoUploads}
                    onChange={() => handleToggleSubFlag('community', 'enableVideoUploads')}
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Constraints Configuration */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  <span>{language === 'ar' ? 'قيود الملفات والحجم (المجتمع)' : 'File & Size Constraints (Community)'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'الحد الأقصى لحجم الصورة (MB)' : 'Max Photo Size (MB)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={communityConstraints.maxPhotoSizeMB}
                      onChange={(e) => setCommunityConstraints({ ...communityConstraints, maxPhotoSizeMB: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'الحد الأقصى لحجم الفيديو (MB)' : 'Max Video Size (MB)'}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={communityConstraints.maxVideoSizeMB}
                      onChange={(e) => setCommunityConstraints({ ...communityConstraints, maxVideoSizeMB: Math.max(5, parseInt(e.target.value) || 5) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'الحد الأقصى لعدد الصور المسموحة' : 'Max Photos Allowed'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={communityConstraints.maxPhotosCount}
                      onChange={(e) => setCommunityConstraints({ ...communityConstraints, maxPhotosCount: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'ar' ? 'أقصى مدة للفيديو (بالثواني)' : 'Max Video Duration (Sec)'}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={600}
                      value={communityConstraints.maxVideoDurationSec}
                      onChange={(e) => setCommunityConstraints({ ...communityConstraints, maxVideoDurationSec: Math.max(10, parseInt(e.target.value) || 10) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveConstraints('community')}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {language === 'ar' ? 'حفظ قيود المجتمع' : 'Save Community Constraints'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REJECTION REASON DIALOG                                        */}
      {/* ============================================================== */}
      <AnimatePresence>
        {rejectionDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#182232] rounded-3xl border border-slate-200 dark:border-[#2A384C] shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ar' ? 'سبب رفض المحتوى' : 'Reason for Rejection'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectionDialog({ isOpen: false, item: null, reason: '' })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {language === 'ar'
                  ? 'اكتب سبباً توضيحياً سيتم إرساله في إشعار تلقائي لصاحب المشاركة:'
                  : 'Specify an optional reason that will be sent to the author via in-app notification:'}
              </p>

              <textarea
                value={rejectionDialog.reason}
                onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
                rows={3}
                placeholder={
                  language === 'ar'
                    ? 'مثال: الصورة المرفقة لا تطابق الشروط أو غير واضحة...'
                    : 'E.g., The attached image does not match guidelines or is low resolution...'
                }
                className="w-full p-3 bg-slate-50 dark:bg-[#121824] border border-slate-300 dark:border-[#2A384C] rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionDialog({ isOpen: false, item: null, reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {language === 'ar' ? 'متابعة الرفض' : 'Proceed with Rejection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MEDIA LIGHTBOX PREVIEW MODAL                                   */}
      {/* ============================================================== */}
      <AnimatePresence>
        {lightboxMedia && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setLightboxMedia(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl p-2"
            >
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {lightboxMedia.type === 'image' ? (
                <img
                  src={lightboxMedia.url}
                  alt={lightboxMedia.title || 'Lightbox Preview'}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl"
                />
              ) : (
                <video
                  controls
                  autoPlay
                  playsInline
                  src={lightboxMedia.url}
                  className="max-h-[75vh] w-auto max-w-full rounded-2xl"
                />
              )}

              {lightboxMedia.title && (
                <div className="pt-2 text-center text-xs font-medium text-slate-300 truncate max-w-md">
                  {lightboxMedia.title}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* STRICT UNIFIED ADMIN CONFIRMATION MODAL                        */}
      {/* ============================================================== */}
      <AdminConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        description={modalConfig.description}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        icon={modalConfig.icon}
      />
    </div>
  );
};
