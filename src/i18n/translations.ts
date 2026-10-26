import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import ja from './locales/ja.json';

export type Language = 'ar' | 'en' | 'fr' | 'es' | 'zh' | 'hi' | 'ja';

export interface LanguageMeta {
  code: Language;
  label: string;
  nativeLabel: string;
  dir: 'rtl' | 'ltr';
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English (الإنجليزية)', nativeLabel: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'fr', label: 'French (الفرنسية)', nativeLabel: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish (الإسبانية)', nativeLabel: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'zh', label: 'Chinese (الصينية)', nativeLabel: '简体中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic (العربية)', nativeLabel: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'hi', label: 'Hindi (الهندية)', nativeLabel: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'ja', label: 'Japanese (اليابانية)', nativeLabel: '日本語', dir: 'ltr', flag: '🇯🇵' },
];

export interface TranslationDictionary {
  brandName: string;
  brandTagline: string;
  searchPlaceholder: string;
  searchAria: string;
  shortcutBadge: string;
  allCategories: string;
  allModels: string;
  featuredOnly: string;
  favoritesOnly: string;
  sortBy: string;
  sortPopular: string;
  sortNewest: string;
  sortTitle: string;
  promptsCount: string;
  copyPrompt: string;
  copySuccess: string;
  favoriteAdded: string;
  favoriteRemoved: string;
  customizeVariables: string;
  variablesCount: string;
  tips: string;
  targetModel: string;
  noPromptsFound: string;
  noPromptsSubtext: string;
  clearFilter: string;
  resetFilters: string;
  themeDark: string;
  themeLight: string;
  languageEn: string;
  languageAr: string;
  languageFr: string;
  languageEs: string;
  languageZh: string;
  languageHi: string;
  languageJa: string;
  translateButton: string;
  seeOriginalButton: string;
  translating: string;
  translationFailed: string;
  activeFilterTag: string;
  footerCopyright: string;
  submittedBy: string;
  anonymousAuthor: string;
  filterByCategory: string;
  openFilter: string;
  closeFilter: string;
  collapseSidebar: string;
  expandSidebar: string;
  categoriesDrawerTitle: string;
  categoriesDrawerSubtitle: string;
  globalSettingsTitle: string;
  globalSettingsSubtitle: string;
  adminTabAds: string;
  adsManagerTitle: string;
  adsManagerSubtitle: string;
  adsMasterSwitchTitle: string;
  adsMasterSwitchDesc: string;
  adsMasterEnabledBadge: string;
  adsMasterDisabledBadge: string;
  adsSnippetLabel: string;
  adsSnippetPlaceholder: string;
  adsTestPreview: string;
  togglePublicSubmissionsTitle: string;
  togglePublicSubmissionsDesc: string;
  toggleModerationRequirementTitle: string;
  toggleModerationRequirementDesc: string;
  autoPublishEnabled: string;
  adminReviewRequired: string;
  submissionsDisabledNotice: string;
  submissionsDisabledTooltip: string;
  publicSubmissionsEnabledBadge: string;
  publicSubmissionsDisabledBadge: string;
  autoPublishBadge: string;
  adminApprovalBadge: string;
  
  // Variable Modal
  modalTitle: string;
  modalSubtext: string;
  modalVariableValues: string;
  modalLivePreview: string;
  modalCopyButton: string;
  modalClose: string;
  modalReset: string;

  // Public Submission
  publicAddPrompt: string;
  addPromptNavButton: string;
  publicSubmitSuccessAlert: string;
  publicSubmitPromptTitle: string;
  publicSubmitPromptSubtitle: string;
  promptTitleLabel: string;
  promptContentLabel: string;
  categoryLabel: string;
  authorNameLabel: string;
  authorEmailLabel: string;
  descriptionLabel: string;
  tagsLabel: string;
  targetModelLabel: string;
  submitPromptButton: string;
  requiredFieldsAlert: string;
  promptSubmittedSuccess: string;

  // Admin Texts
  adminLoginTitle: string;
  adminLoginSubtext: string;
  adminEmailLabel: string;
  adminPasswordLabel: string;
  adminSignInButton: string;
  adminDashboardTitle: string;
  adminDashboardSubtitle: string;
  adminLogout: string;
  adminBackToLibrary: string;
  adminTabPrompts: string;
  adminTabModeration: string;
  adminTabCategories: string;
  adminTabAccount: string;
  adminTabBackup: string;
  adminTabUsers: string;
  adminTabSqlSchema: string;
  adminAddPrompt: string;
  adminAddCategory: string;
  adminEditPrompt: string;
  adminEditCategory: string;
  adminDeleteConfirm: string;
  adminSave: string;
  adminCancel: string;
  adminUpdateEmail: string;
  adminUpdatePassword: string;
  adminCurrentPassword: string;
  adminNewPassword: string;
  adminConfirmPassword: string;
  adminExportJSON: string;
  adminImportJSON: string;
  adminImportHelp: string;
  adminEmailSuccess: string;
  adminPasswordSuccess: string;
  adminImportSuccess: string;
  moderationPending: string;
  moderationApproved: string;
  moderationInactive: string;
  actionApprove: string;
  actionDeactivate: string;
  actionDelete: string;

  // Bottom Navigation & Community & Auth Drawer
  navHome: string;
  navCommunity: string;
  menuButton: string;
  authDrawerTitle: string;
  myProfile: string;
  adminPanel: string;
  signOut: string;
  switchAccount: string;
  guestAccount: string;
  adminRole: string;
  userRole: string;
  moderatorRole: string;
  bannedStatus: string;
  bannedAlert: string;
  userManagementTitle: string;
  userManagementSubtitle: string;
  banUser: string;
  unbanUser: string;
  makeAdmin: string;
  makeUser: string;
  userBannedSuccess: string;
  inlineModeration: string;
  statusActive: string;
  statusPending: string;
  statusInactive: string;
  deletePromptConfirm: string;
  sqlSchemaTitle: string;
  sqlSchemaSubtitle: string;
  copySqlMigration: string;
  sqlCopied: string;
  adminTabAnalytics: string;
  communityBadge: string;
  communityTitle: string;
  communitySubtitle: string;
  communityDisabledTitle: string;
  communityDisabledDesc: string;
  communityNewPost: string;
  communityPostPlaceholder: string;
  communityPublishButton: string;
  communityAttachedPrompt: string;
  openPromptFolder: string;
  commentsTitle: string;
  commentsCount: string;
  commentPlaceholder: string;
  sendComment: string;
  replyPlaceholder: string;
  sendReply: string;
  replyButton: string;
  likeButton: string;
  likes: string;
  comment: string;
  editComment: string;
  deleteComment: string;
  confirmDelete: string;
  deleteConfirmQuestion: string;
  saveChanges: string;
  confirmEdit: string;
  cancel: string;
  edited: string;
  editSuccess: string;
  deleteSuccess: string;
  pinnedBadge: string;
  logoutConfirmQuestion: string;
  logoutConfirmButton: string;
  logoutCancelButton: string;
  authModalTitle: string;
  authModalSubtitle: string;
  authRequiredSubtext: string;
  signInTab: string;
  signUpTab: string;
  guestTab: string;
  guestContinueButton: string;
  analyticsOverviewTitle: string;
  analyticsOverviewSubtitle: string;
  totalPageViewsLabel: string;
  promptCopiesLabel: string;
  activeUsersLabel: string;
  communityPostsLabel: string;
  totalLikesLabel: string;
  communityMasterSwitchLabel: string;
  communityMasterSwitchDesc: string;
  goToPrompt: string;
  promptUnavailable: string;
  targetPromptBadge: string;

  // Categories Localized Names
  catVibeCoding: string;
  catVibeCodingDesc: string;
  catAiImages: string;
  catAiImagesDesc: string;
  catCommercialVideo: string;
  catCommercialVideoDesc: string;
  catCopywriting: string;
  catCopywritingDesc: string;
  catMarketingGrowth: string;
  catMarketingGrowthDesc: string;
  catMobileApps: string;
  catMobileAppsDesc: string;

  // Sound & Push Notification Settings
  soundSettingsTitle: string;
  soundSettingsSubtitle: string;
  soundPromptPublishedTitle: string;
  soundPromptPublishedDesc: string;
  soundNewPostTitle: string;
  soundNewPostDesc: string;
  soundPostReplyTitle: string;
  soundPostReplyDesc: string;
  soundUserMentionTitle: string;
  soundUserMentionDesc: string;
  soundTestTone: string;
  browserPushTitle: string;
  browserPushSubtitle: string;
  browserPushEnable: string;
  browserPushGranted: string;
  browserPushDenied: string;
  browserPushDefault: string;
  browserPushTest: string;
  browserPushTestSent: string;
  browserPushBlockedHelp: string;
  avatarPickerTitle: string;
  avatarPickerSubtitle: string;

  // Content Auto-Translation & Toggle
  translatedNotice: string;

  // Predefined report tags localized
  reportTagFraud: string;
  reportTagSpam: string;
  reportTagRacist: string;
  reportTagMisleading: string;
  reportTagObscene: string;
  reportTagAggressive: string;
  reportTagHarassment: string;
  reportTagThreatening: string;
  reportTagHacked: string;
  reportTagImpersonation: string;
  reportTagSuspicious: string;
  reportTagInfringing: string;
  reportTagStolen: string;
  reportTagDeceptive: string;
  reportTagExploitative: string;
  reportTagAbusive: string;
  reportTagInappropriate: string;
  reportTagInciting: string;
  reportTagFanatical: string;

  // Report Modal
  reportViolation: string;
  targetPrompt: string;
  targetPost: string;
  targetReply: string;
  targetComment: string;
  targetContent: string;
  predefinedReasons: string;
  lockedCustomActive: string;
  orCustomReasonDetails: string;
  lockedTagSelected: string;
  lockedCustomReasonPlaceholder: string;
  customReasonPlaceholder: string;
  submittingReport: string;
  confirmReport: string;
  reportSuccessToast: string;
  customReportDetailPlaceholder: string;

  // Auth Modal Extra
  instantGuestAccessTitle: string;
  instantGuestAccessDesc: string;
  guestAvatar: string;
  guestAvatarCustomize: string;
  usernameNickname: string;
  usernameNicknamePlaceholder: string;
  emailAddress: string;
  passwordOptional: string;
  forgotPassword: string;
  hidePassword: string;
  showPassword: string;
  profileAvatar: string;
  profileAvatarCustomize: string;
  fullName: string;
  fullNamePlaceholder: string;
  passwordLabel: string;
  resetPasswordTitle: string;
  resetPasswordDesc: string;
  resetPasswordSuccess: string;
  resetPasswordFail: string;
  newPasswordLabel: string;
  updatePasswordButton: string;
  backToSignIn: string;
  pleaseEnterEmail: string;
  signInFailed: string;
  pleaseFillRequired: string;
  signUpFailed: string;
  errorCreatingGuest: string;

  // Guest Restriction & Logout Modals
  guestRestrictedTitle: string;
  guestRestrictedSubtitle: string;
  quickRegister: string;
  logoutConfirmTitle: string;
  logoutConfirmDesc: string;

  // Global Toasts & Alerts
  toastCommunityDisabled: string;
  toastLoginRequiredAddPrompt: string;
  toastLoginRequiredSubmitPrompt: string;
  toastPromptPublished: string;
  toastSettingsUpdated: string;
  toastAdminWelcome: string;
  toastLogoutSuccess: string;
  toastUnauthorized: string;
  toastPromptDeleted: string;
  toastPromptStatusUpdated: string;
  toastPromptUpdated: string;

  // Drawer, Settings & Cards
  appearanceAndLanguage: string;
  homeGridColumns: string;
  clickToChangeAvatar: string;
  temporaryGuestSession: string;
  editProfile: string;
  accountLinkCopied: string;
  copyAccountLink: string;
  editProfileAndAvatar: string;
  navigationSection: string;
  liveBadge: string;
  adminDashboardNav: string;
  adminRoleBadge: string;
  testSound: string;
  testSoundAria: string;
  testPushNotificationTitle: string;
  testPushNotificationBody: string;
  downloadImage: string;
  highResWebpPreview: string;
  pressEscToClose: string;
  showFullPrompt: string;
  showLess: string;
  copiesCount: string;
  readyToUseTip: string;
  copiedBadge: string;
  fullCommandCode: string;
  charsCount: string;
  guestAccessGranted: string;
  signedInSuccessfully: string;
  accountCreatedSuccessfully: string;
  avatarUpdatedSuccessfully: string;
  featured: string;
  sponsored: string;
  deletePrompt: string;
  close: string;

  // Frictionless Unified Auth
  signInWithGoogle: string;
  signInWithGitHub: string;
  signInWithApple: string;
  enterYourEmail: string;
  emailAuthPlaceholder: string;
  sendOtpOrMagicLink: string;
  enterVerificationCode: string;
  verifyAndSignIn: string;
  otpSentNotice: string;
  resendOtpCode: string;
  orContinueWithEmail: string;
  usePasswordInstead: string;
  usePasswordlessInstead: string;
  unifiedAuthTitle: string;
  unifiedAuthSubtitle: string;
  authConnecting: string;
  otpFillQuick: string;
  changeEmail: string;
  invalidOrExpiredCode: string;

  // Dual-State Form Keys
  usernameField: string;
  usernamePlaceholder: string;
  passwordField: string;
  passwordPlaceholder: string;
  confirmPasswordField: string;
  confirmPasswordPlaceholder: string;
  passwordsDoNotMatch: string;
  rememberMe: string;
  orContinueWith: string;
  continueAsGuest: string;
  dontHaveAccount: string;
  createNewAccountLink: string;
  alreadyHaveAccount: string;
  signInLink: string;
  chooseAvatarOption: string;
  avatarChangeHint: string;
  passwordTooShort: string;
  emailRequired: string;
  usernameRequired: string;

  // Localized Authentication Error & State Keys
  authInvalidCredentials?: string;
  authAccountBanned?: string;
  authEmailAlreadyRegistered?: string;
  authRateLimitExceeded?: string;
  authOtpSentSuccess?: string;
  authOtpResentSuccess?: string;
  authOtpInvalidOrExpired?: string;
  authEnterOtpDigits?: string;
  authPasswordRequired?: string;
  authPasswordResetSent?: string;
  authPasswordResetSuccess?: string;
  authIdentityVerified?: string;
  authRecoveryLinkVerified?: string;
  authOAuthDisabled?: string;
  authOAuthPopupBlocked?: string;
  authOAuthTimeout?: string;
  authUnexpectedError?: string;
  authServerDisconnected?: string;
  authStrictVerificationNotice?: string;
  authSendResetCode?: string;
  authVerifyResetCode?: string;
  authVerifyCodeAndProceed?: string;
  authConfirmNewPassword?: string;
  authConfirmNewPasswordPlaceholder?: string;
  authNewPasswordPlaceholder?: string;
  authOrContinueWith?: string;
  authPasswordsDoNotMatch?: string;
  authFailedToUpdatePassword?: string;
  authFailedToSendOtp?: string;
  authFailedToResendCode?: string;
  authVerificationCodeSentTo?: string;

  // 3-Dots Action Dropdown Menu Keys
  'actions.edit': string;
  'actions.delete': string;
  'actions.report': string;
  'actions.copyLink': string;
  'actions.linkCopied'?: string;
  'actions.hideFromLibrary'?: string;
  'actions.publishToLibrary'?: string;
  actions?: {
    edit: string;
    delete: string;
    report: string;
    copyLink: string;
    linkCopied?: string;
    hideFromLibrary?: string;
    publishToLibrary?: string;
  };

  // Ad Framework UI Keys
  'ads.close'?: string;
  'ads.sponsored'?: string;
  'ads.supportFree'?: string;
  'ads.continueToPrombo'?: string;
  'ads.skipIn'?: string;
  'ads.closeAd'?: string;
  'ads.dismissSession'?: string;
  ads?: {
    close: string;
    sponsored: string;
    supportFree: string;
    continueToPrombo: string;
    skipIn: string;
    closeAd?: string;
    dismissSession?: string;
  };

  // Support System Keys
  'support.contactSupport'?: string;
  'support.title'?: string;
  'support.adminTitle'?: string;
  'support.subtitle'?: string;
  'support.typeMessage'?: string;
  'support.send'?: string;
  'support.blockedNotice'?: string;
  'support.blockUser'?: string;
  'support.unblockUser'?: string;
  'support.userBlockedBadge'?: string;
  'support.searchPlaceholder'?: string;
  'support.activeChats'?: string;
  'support.allUsers'?: string;
  'support.noChats'?: string;
  'support.selectChat'?: string;
  'support.online'?: string;
  'support.offline'?: string;
  'support.teamMember'?: string;
  'support.you'?: string;
  'support.admin'?: string;
  'support.unread'?: string;
  'support.userInitiated'?: string;
  'support.noMessagesYet'?: string;
  'support.startConversation'?: string;
  support?: {
    contactSupport: string;
    title: string;
    adminTitle: string;
    subtitle: string;
    typeMessage: string;
    send: string;
    blockedNotice: string;
    blockUser: string;
    unblockUser: string;
    userBlockedBadge: string;
    searchPlaceholder: string;
    activeChats: string;
    allUsers: string;
    noChats: string;
    selectChat: string;
    online: string;
    offline: string;
    teamMember: string;
    you: string;
    admin: string;
    unread?: string;
    userInitiated?: string;
    noMessagesYet?: string;
    startConversation?: string;
  };
  termsAndPrivacyPolicy?: string;
  termsAndPrivacyNotice?: string;
  termsAndPrivacyConsentPrefix?: string;
  termsOfService?: string;
  privacyPolicy?: string;
  legalDataRights?: string;
  legalEffectiveDate?: string;
  closeLegalPolicy?: string;
  [key: string]: any;
}

export function getBrandName(language: Language): string {
  if (language === 'ar') return 'برومبو';
  if (['zh', 'hi', 'ja'].includes(language)) return 'Prombo';
  return 'prombo';
}

export const translations: Record<Language, TranslationDictionary> = {
  ar: ar as unknown as TranslationDictionary,
  en: en as unknown as TranslationDictionary,
  fr: fr as unknown as TranslationDictionary,
  es: es as unknown as TranslationDictionary,
  zh: zh as unknown as TranslationDictionary,
  hi: hi as unknown as TranslationDictionary,
  ja: ja as unknown as TranslationDictionary,
};
