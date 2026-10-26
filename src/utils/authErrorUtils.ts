import { TranslationFunction } from '../context/AppContext';

export interface LocalizedAuthErrorPayload {
  key?: string;
  raw?: string;
  params?: Record<string, any>;
}

/**
 * Normalizes raw auth error strings or error codes into structured i18n keys and parameters
 */
export function parseAuthError(rawError: string | undefined): LocalizedAuthErrorPayload {
  if (!rawError) {
    return { key: 'authUnexpectedError' };
  }

  const normalized = rawError.trim();

  // If already an i18n key
  if (normalized.startsWith('auth') && !normalized.includes(' ')) {
    return { key: normalized };
  }

  // Invalid credentials patterns
  if (
    normalized.includes('البريد الإلكتروني أو كلمة المرور غير صحيحة') ||
    normalized.toLowerCase().includes('invalid login credentials') ||
    normalized.toLowerCase().includes('invalid_grant') ||
    normalized.toLowerCase().includes('invalid credentials')
  ) {
    return { key: 'authInvalidCredentials' };
  }

  // Account suspended / banned
  if (
    normalized.includes('هذا الحساب محظور') ||
    normalized.toLowerCase().includes('user is banned') ||
    normalized.toLowerCase().includes('account is suspended') ||
    normalized.toLowerCase().includes('account is banned')
  ) {
    return { key: 'authAccountBanned' };
  }

  // Email already registered
  if (
    normalized.includes('مسجل بالفعل') ||
    normalized.toLowerCase().includes('user already registered') ||
    normalized.toLowerCase().includes('already registered')
  ) {
    return { key: 'authEmailAlreadyRegistered' };
  }

  // Rate limit
  if (
    normalized.includes('تجاوز الحد المسموح') ||
    normalized.toLowerCase().includes('rate limit') ||
    normalized.toLowerCase().includes('too many requests')
  ) {
    return { key: 'authRateLimitExceeded' };
  }

  // OTP expired / invalid
  if (
    normalized.includes('رمز التحقق غير صالح') ||
    normalized.toLowerCase().includes('token has expired') ||
    normalized.toLowerCase().includes('token is invalid') ||
    normalized.toLowerCase().includes('invalid or expired')
  ) {
    return { key: 'authOtpInvalidOrExpired' };
  }

  // Digits count
  if (
    normalized.includes('المكون من 6 أرقام بدقة') ||
    normalized.toLowerCase().includes('6-digit verification code')
  ) {
    return { key: 'authEnterOtpDigits' };
  }

  // Password required
  if (
    normalized.includes('يرجى إدخال كلمة المرور') ||
    normalized.toLowerCase().includes('password is required')
  ) {
    return { key: 'authPasswordRequired' };
  }

  // Passwords do not match
  if (
    normalized.includes('غير متطابقة') ||
    normalized.toLowerCase().includes('passwords do not match')
  ) {
    return { key: 'authPasswordsDoNotMatch' };
  }

  // Password too short
  if (
    normalized.includes('6 أحرف') ||
    normalized.toLowerCase().includes('at least 6 characters')
  ) {
    return { key: 'passwordTooShort' };
  }

  // Email required / invalid
  if (
    normalized.includes('بريد إلكتروني صالح') ||
    normalized.includes('البريد الإلكتروني مفقود') ||
    normalized.toLowerCase().includes('valid email')
  ) {
    return { key: 'emailRequired' };
  }

  // OAuth Disabled
  if (
    normalized.includes('معطل في الخادم') ||
    normalized.includes('غير متاح حالياً') ||
    normalized.includes('لم يتم تفعيله') ||
    normalized.toLowerCase().includes('unsupported provider') ||
    normalized.toLowerCase().includes('provider is not enabled') ||
    normalized.toLowerCase().includes('disabled on the server') ||
    normalized.toLowerCase().includes('failed to retrieve') ||
    normalized.includes('فشل في استرداد جلسة')
  ) {
    let provider = 'OAuth';
    if (normalized.toLowerCase().includes('google')) provider = 'Google';
    else if (normalized.toLowerCase().includes('github')) provider = 'GitHub';
    else if (normalized.toLowerCase().includes('apple')) provider = 'Apple';
    return { key: 'authOAuthDisabled', params: { provider } };
  }

  // OAuth Popup Blocked
  if (
    normalized.includes('حظر النافذة المنبثقة') ||
    normalized.toLowerCase().includes('popup window was blocked') ||
    normalized.toLowerCase().includes('popup blocked')
  ) {
    let provider = 'OAuth';
    if (normalized.toLowerCase().includes('google')) provider = 'Google';
    else if (normalized.toLowerCase().includes('github')) provider = 'GitHub';
    return { key: 'authOAuthPopupBlocked', params: { provider } };
  }

  // OAuth Timeout
  if (
    normalized.includes('استغرق وقتاً طويلاً') ||
    normalized.toLowerCase().includes('timed out') ||
    normalized.toLowerCase().includes('timeout')
  ) {
    let provider = 'OAuth';
    if (normalized.toLowerCase().includes('google')) provider = 'Google';
    else if (normalized.toLowerCase().includes('github')) provider = 'GitHub';
    return { key: 'authOAuthTimeout', params: { provider } };
  }

  // Supabase disconnected
  if (
    normalized.includes('غير متصلة') ||
    normalized.toLowerCase().includes('disconnected')
  ) {
    return { key: 'authServerDisconnected' };
  }

  // Failed to update password
  if (
    normalized.includes('تعذر تحديث كلمة المرور') ||
    normalized.toLowerCase().includes('failed to update password')
  ) {
    return { key: 'authFailedToUpdatePassword' };
  }

  // Failed to send OTP
  if (
    normalized.includes('تعذر إرسال رمز التحقق') ||
    normalized.toLowerCase().includes('failed to send otp')
  ) {
    return { key: 'authFailedToSendOtp' };
  }

  // Failed to resend code
  if (
    normalized.includes('تعذر إعادة إرسال') ||
    normalized.toLowerCase().includes('failed to resend')
  ) {
    return { key: 'authFailedToResendCode' };
  }

  return { raw: normalized };
}

/**
 * Formats a localized error string dynamically using the current t() function
 */
export function formatAuthError(
  payload: LocalizedAuthErrorPayload | string | undefined,
  t: TranslationFunction
): string {
  if (!payload) return t('authUnexpectedError');
  const parsed = typeof payload === 'string' ? parseAuthError(payload) : payload;
  if (parsed.key) {
    return t(parsed.key, parsed.params);
  }
  return parsed.raw || t('authUnexpectedError');
}
