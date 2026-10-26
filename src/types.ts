export type PromptStatus = 'pending' | 'approved' | 'inactive' | 'rejected';

export interface ImageUploadConfig {
  masterEnabled: boolean; // Global platform toggle
  allowedCategoryIds: string[]; // Category-level toggles
  maxFileSizeMB: number; // Max allowed upload size (1 to 5 MB, default 2MB)
}

export interface SectionMediaConfig {
  masterEnabled: boolean; // Enables/Disables ALL media uploading for that section
  enablePhotoUploads: boolean; // "تفعيل إضافة الصور"
  enableVideoUploads: boolean; // "تفعيل إضافة الفيديوهات"
  maxPhotoSizeMB: number; // Max Photo File Size (MB)
  maxVideoSizeMB: number; // Max Video File Size (MB)
  maxPhotosCount: number; // Max Number of Photos Allowed per Post/Prompt Folder
  maxVideosCount?: number; // Max Number of Videos Allowed
  maxVideoDurationSec: number; // Max Video Duration Allowed (in Seconds)
  acceptedPhotoFormats?: string[];
  acceptedVideoFormats?: string[];
  allowPhotos?: boolean;
  allowVideos?: boolean;
  allowVideoUrl?: boolean;
}

export interface ContentMediaSettings {
  priorModerationEnabled: boolean; // "تفعيل الإشراف المسبق قبل النشر"
  homePrompts: SectionMediaConfig; // "الصفحة الرئيسية" (Home/Prompts)
  community: SectionMediaConfig; // "صفحة المجتمع" (Community)
}

export interface UserNotification {
  id: string;
  userId: string;
  userEmail?: string;
  type: 'moderation_approved' | 'moderation_rejected' | 'media_alert' | 'general' | 'reply' | 'mention' | 'system';
  title: string;
  message: string;
  reason?: string;
  entityType?: 'post' | 'prompt' | 'system';
  entityId?: string;
  createdAt: string;
  isRead: boolean;
  titleKey?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  reasonKey?: string;
}

export interface AppearanceSettings {
  homeGridColumns: 1 | 2 | 3 | 4; // 1, 2, 3, or 4 columns on desktop/large screens
  cardSpacing?: 'compact' | 'normal' | 'spacious';
  showCategoryBadge?: boolean;
}

export interface PlatformSettings {
  allowPublicSubmissions: boolean;
  requireAdminApproval: boolean;
  communityEnabled?: boolean;
  imageUpload?: ImageUploadConfig;
  contentMedia?: ContentMediaSettings;
  appearance?: AppearanceSettings;
  supabaseConfigured?: boolean;
}

export interface SiteSettings {
  communityEnabled: boolean;
  allowGuestViewing: boolean;
  requireAuthForComments: boolean;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  promptId?: string;
  promptTitle?: string;
  promptCategory?: string;
  promptModel?: string;
  content: string;
  parentId?: string | null;
  likesCount: number;
  repliesCount: number;
  isPinned?: boolean;
  isSponsored?: boolean;
  isPromoted?: boolean;
  sponsorName?: string;
  sponsorUrl?: string;
  isLikedByMe?: boolean;
  status: 'active' | 'inactive' | 'hidden' | 'deleted' | 'pending' | 'rejected';
  isEdited?: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: CommunityPost[];
  // Media attachments & moderation
  images?: string[];
  videos?: string[];
  videoUrl?: string;
  mediaType?: 'none' | 'image' | 'video' | 'mixed';
  rejectionReason?: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface PageAnalyticsEvent {
  id: string;
  eventType: 'page_view' | 'prompt_copy' | 'community_view' | 'comment_created' | 'like_toggle' | 'custom';
  entityId?: string;
  metadata?: Record<string, any>;
  userId?: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  totalPromptCopies: number;
  activeUsers: number;
  totalCommunityPosts: number;
  totalReplies: number;
  totalLikes: number;
  viewsByDay: { date: string; views: number; copies: number }[];
  topCopiedPrompts: { promptId: string; title: string; count: number }[];
  recentEvents: PageAnalyticsEvent[];
}

export interface CommunityUser {
  id: string;
  name: string;
  username?: string; // unique @username slug
  email?: string;
  avatar?: string;
  role?: 'user' | 'admin' | 'moderator';
  isVIP?: boolean; // "مميز" / Featured VIP Creator badge
  isPinned?: boolean; // "مثبت من الإدارة" / Admin Pinned Profile badge
  isGuest?: boolean;
  isBanned?: boolean; // Full restriction (Everything restricted EXCEPT favorites, copying, and technical support)
  isCommunityBanned?: boolean; // Community ban only (Restricts Community section only; main page and technical support operational)
  bannedAt?: string;
  communityBannedAt?: string;
  banReason?: string;
  createdAt?: string;
}

export type AdSlotId = 
  | 'popupEntry'
  | 'onCopyPrompt'
  | 'onSubmitPrompt'
  | 'headerBanner'
  | 'footerBanner'
  | 'sidebarLeft'
  | 'sidebarRight'
  | 'gridNative';

export interface AdSlotConfig {
  id: AdSlotId;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  isEnabled: boolean;
  codeSnippet: string;
  triggerType: 'modal' | 'banner' | 'skyscraper' | 'inline';
  delaySeconds?: number;
  showFrequency?: 'always' | 'once_per_session' | 'every_3_actions';
  deviceTargeting?: 'all' | 'desktop' | 'mobile';
  cooldownMinutes?: number;
  autoCloseSeconds?: number;
  clickCount?: number;
}

export interface FeedAdSlotConfig {
  id: string; // e.g. 'home_feed_ad_0' through 'home_feed_ad_9' or 'comm_feed_ad_0' through 'comm_feed_ad_9'
  enabled: boolean;
  ctaUrl: string;
  snippet: string;
  title?: string;
  description?: string;
  clickCount?: number;
}

export interface AdsEngineConfig {
  masterEnabled: boolean;
  slots: Record<AdSlotId, AdSlotConfig>;
  homeAdFrequency?: number;
  communityAdFrequency?: number;
  homeFeedEnabled?: boolean;
  communityFeedEnabled?: boolean;
  homeFeedSnippet?: string;
  communityFeedSnippet?: string;
  homeFeedCtaUrl?: string;
  communityFeedCtaUrl?: string;
  // 20 Independent Ad Slots
  homeSlots?: Record<string, FeedAdSlotConfig>; // 'home_feed_ad_0' ... 'home_feed_ad_9'
  communitySlots?: Record<string, FeedAdSlotConfig>; // 'comm_feed_ad_0' ... 'comm_feed_ad_9'
}

export interface PromptVariable {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  options?: string[];
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  categoryId: string;
  subcategory?: string;
  tags: string[];
  targetModel: string;
  author?: string;
  authorEmail?: string;
  authorId?: string;
  author_id?: string;
  authorAvatar?: string;
  userId?: string;
  status?: PromptStatus;
  submittedAt?: string;
  isFeatured?: boolean;
  isSponsored?: boolean;
  isPromoted?: boolean;
  sponsorName?: string;
  sponsorUrl?: string;
  copyCount: number;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  images?: string[];
  videos?: string[];
  videoUrl?: string;
  mediaType?: 'none' | 'image' | 'video' | 'mixed';
  rejectionReason?: string;
  moderatedAt?: string;
  variables?: PromptVariable[];
  parameters?: Record<string, string>;
  tips?: string[];
  isEdited?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  slug?: string;
  description: string;
  descriptionAr?: string;
  icon: string;
  color?: string;
  badgeBg?: string;
  badgeBorder?: string;
  order?: number;
  count?: number;
  subcategories?: string[];
}

export interface AdminUser {
  email: string;
  role: 'admin' | 'editor';
  lastLogin: string;
  passwordHash?: string;
}

export interface FilterState {
  search: string;
  categoryId: string;
  tag: string;
  model: string;
  onlyFavorites: boolean;
  sortBy: 'popular' | 'newest' | 'title';
}

export interface ToastNotification {
  id: string;
  message: string;
  messageKey?: string;
  params?: Record<string, any>;
  type: 'success' | 'info' | 'error' | 'report';
  position?: 'top' | 'bottom';
  customClass?: string;
  duration?: number;
}

export type ReportTargetType = 'post' | 'reply' | 'prompt' | 'comment';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ModerationReport {
  id: string;
  reporterId?: string;
  reporterName: string;
  reporterEmail?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedUserEmail?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetContent?: string;
  contentUrl: string;
  tag?: string;
  customReason?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ReportTargetPayload {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetContent?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedUserEmail?: string;
  contentUrl?: string;
}

export type AuditLogAction =
  | 'CREATE_PROMPT'
  | 'UPDATE_PROMPT'
  | 'DELETE_PROMPT'
  | 'CREATE_POST'
  | 'UPDATE_POST'
  | 'DELETE_POST'
  | 'CREATE_COMMENT_POST'
  | 'ADD_REPLY'
  | 'ADD_NESTED_REPLY'
  | 'PIN_REPLY'
  | 'UNPIN_REPLY'
  | 'UPDATE_PROFILE'
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'UPDATE_SETTINGS';

export type AuditLogTargetType = 'prompt' | 'post' | 'comment' | 'reply' | 'profile';

export interface AuditLogEntry {
  id: string;
  action: AuditLogAction;
  userId?: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  userSlug: string;
  userProfileUrl: string;
  targetId?: string;
  targetType: AuditLogTargetType;
  targetTitle: string;
  contentUrl: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface AuditLogFilterOptions {
  action?: 'all' | AuditLogAction;
  actionCategory?: 'all' | 'create' | 'update' | 'delete' | 'pin' | 'profile';
  email?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export type SupportSenderType = 'user' | 'admin';

export interface SupportAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface SupportQuotedMessage {
  id: string;
  sender_type: SupportSenderType;
  sender_name: string;
  message: string;
  attachment_type?: 'image' | 'file';
  attachment_name?: string;
}

export interface SupportMessage {
  id: string;
  user_id: string;
  sender_type: SupportSenderType;
  message: string;
  attachment?: SupportAttachment;
  reply_to?: SupportQuotedMessage;
  is_read: boolean;
  is_blocked: boolean;
  created_at: string;
}

export interface SupportConversationSummary {
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  isBlocked: boolean;
  unreadCount: number;
  lastMessage?: SupportMessage;
  updatedAt: string;
}

