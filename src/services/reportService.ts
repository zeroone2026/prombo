import { ModerationReport, ReportStatus, ReportTargetPayload } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { safeStorage } from '../utils/securityUtils';
import { AuthService } from './authService';

export const PREDEFINED_REPORT_TAGS = [
  'محتال',
  'مزعج',
  'عنصري',
  'مضلل',
  'بذيء',
  'عدواني',
  'متحرش',
  'مهدد',
  'مخترق',
  'منتحل',
  'مشبوه',
  'منتهك',
  'مسروق',
  'خادع',
  'استغلالي',
  'مسيء',
  'غير لائق',
  'تحريضي',
  'متعصب',
] as const;

export type PredefinedReportTag = (typeof PREDEFINED_REPORT_TAGS)[number];

const REPORTS_STORAGE_KEY = 'prombo_moderation_reports_v1';

// Seed demo reports for initial admin review
const SEED_REPORTS: ModerationReport[] = [
  {
    id: 'report-seed-1',
    reporterId: 'user-ahmed-1',
    reporterName: 'أحمد النجار',
    reporterEmail: 'ahmed@prombo.ai',
    reportedUserId: 'user-spammer-99',
    reportedUserName: 'حساب غير موثوق',
    reportedUserEmail: 'spammer99@fakemail.com',
    targetType: 'post',
    targetId: 'post-seed-spam-1',
    targetTitle: 'روابط مريبة لبيع العملات الرقمية',
    targetContent: 'احصل على بيتكوين مجاني بالضغط على هذا الرابط المشبوه فوراً واستمتع بالأرباح...',
    contentUrl: 'https://prombo.app/#post-seed-spam-1',
    tag: 'محتال',
    customReason: undefined,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'report-seed-2',
    reporterId: 'user-sara-2',
    reporterName: 'سارة المهندس',
    reporterEmail: 'sara@example.com',
    reportedUserId: 'user-troll-7',
    reportedUserName: 'مستخدم مجهول',
    reportedUserEmail: 'anonymous_user@test.org',
    targetType: 'comment',
    targetId: 'comment-seed-bad-2',
    targetTitle: 'تعليق مسيء في نقاش البرومبت',
    targetContent: 'برومبت فاشل وغير مفيد إطلاقاً ولا تفقهون شيئاً في البرمجة يا جهلاء!',
    contentUrl: 'https://prombo.app/#comment-seed-bad-2',
    tag: 'مسيء',
    customReason: undefined,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'report-seed-3',
    reporterId: 'guest-1049',
    reporterName: 'زائر للموقع',
    reporterEmail: 'visitor@guest.net',
    reportedUserId: 'user-copycat-4',
    reportedUserName: 'كود سارق',
    reportedUserEmail: 'copycat@dev.io',
    targetType: 'prompt',
    targetId: 'prompt-14',
    targetTitle: 'برومبت مولد الأكواد المستنسخ',
    targetContent: 'هذا الأمر تم نسخه حرفياً من مستودع خارجي دون ذكر حقوق المؤلف الأصلي...',
    contentUrl: 'https://prombo.app/prompt/prompt-14',
    tag: 'مسروق',
    customReason: undefined,
    status: 'resolved',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

function mapRowToReport(row: any): ModerationReport {
  return {
    id: row.id,
    reporterId: row.reporter_id || undefined,
    reporterName: row.reporter_name || 'زائر',
    reporterEmail: row.reporter_email || undefined,
    reportedUserId: row.reported_user_id || undefined,
    reportedUserName: row.reported_user_name || undefined,
    reportedUserEmail: row.reported_user_email || undefined,
    targetType: row.target_type || 'post',
    targetId: row.target_id,
    targetTitle: row.target_title || undefined,
    targetContent: row.target_content || undefined,
    contentUrl: row.content_url || '',
    tag: row.tag || undefined,
    customReason: row.custom_reason || undefined,
    status: (row.status as ReportStatus) || 'pending',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
  };
}

function mapReportToRow(report: ModerationReport): any {
  return {
    id: report.id,
    reporter_id: report.reporterId || null,
    reporter_name: report.reporterName,
    reporter_email: report.reporterEmail || null,
    reported_user_id: report.reportedUserId || null,
    reported_user_name: report.reportedUserName || null,
    reported_user_email: report.reportedUserEmail || null,
    target_type: report.targetType,
    target_id: report.targetId,
    target_title: report.targetTitle || null,
    target_content: report.targetContent || null,
    content_url: report.contentUrl,
    tag: report.tag || null,
    custom_reason: report.customReason || null,
    status: report.status,
    created_at: report.createdAt,
    updated_at: report.updatedAt || report.createdAt,
  };
}

export const ReportService = {
  /**
   * Retrieve all reports from LocalStorage
   */
  getLocalReports(): ModerationReport[] {
    const raw = safeStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) {
      safeStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(SEED_REPORTS));
      return SEED_REPORTS;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return SEED_REPORTS;
    } catch {
      return SEED_REPORTS;
    }
  },

  /**
   * Save reports to LocalStorage
   */
  saveLocalReports(reports: ModerationReport[]): void {
    safeStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  },

  /**
   * Submit a new moderation report:
   * 1. Inserts into Supabase `reports` table
   * 2. Saves into LocalStorage queue
   * 3. Dispatches event for real-time admin sync
   */
  async submitReport(params: {
    target: ReportTargetPayload;
    tag?: string;
    customReason?: string;
    reporterName?: string;
    reporterEmail?: string;
    reporterId?: string;
  }): Promise<{ success: boolean; report: ModerationReport; error?: string }> {
    const currentUser = AuthService.getCurrentUser();
    const reporterName =
      params.reporterName ||
      currentUser?.name ||
      (currentUser?.isGuest ? 'زائر (Guest)' : 'مستخدم المجتمع');
    const reporterEmail = params.reporterEmail || currentUser?.email || undefined;
    const reporterId = params.reporterId || currentUser?.id || undefined;

    const reportId = `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newReport: ModerationReport = {
      id: reportId,
      reporterId,
      reporterName,
      reporterEmail,
      reportedUserId: params.target.reportedUserId,
      reportedUserName: params.target.reportedUserName || 'مستخدم غير محدد',
      reportedUserEmail: params.target.reportedUserEmail,
      targetType: params.target.targetType,
      targetId: params.target.targetId,
      targetTitle: params.target.targetTitle,
      targetContent: params.target.targetContent,
      contentUrl: params.target.contentUrl || `${window.location.origin}/#${params.target.targetType}-${params.target.targetId}`,
      tag: params.tag || undefined,
      customReason: params.customReason || undefined,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persist to LocalStorage
    try {
      const local = this.getLocalReports();
      const updated = [newReport, ...local];
      this.saveLocalReports(updated);
    } catch (e) {
      console.warn('Failed saving report to local storage:', e);
    }

    // 2. Insert into Supabase `reports` table
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const rowPayload = mapReportToRow(newReport);
        const { error: sbError } = await supabase.from('reports').insert([rowPayload]);
        if (sbError) {
          console.warn('Supabase reports table insert notice:', sbError.message);
          // If table doesn't exist yet, we still succeed locally
        }
      } catch (sbEx: any) {
        console.warn('Supabase reports exception:', sbEx?.message || sbEx);
      }
    }

    // 3. Dispatch window event for live Admin Panel reactive refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prombo_report_added', {
          detail: newReport,
        })
      );
    }

    return { success: true, report: newReport };
  },

  /**
   * Fetch all moderation reports:
   * Merges Supabase `reports` table with LocalStorage reports
   */
  async getAllReports(): Promise<ModerationReport[]> {
    const local = this.getLocalReports();
    const supabase = getSupabaseClient();

    if (!supabase) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return local;
      }

      const remoteReports = data.map(mapRowToReport);

      // Merge remote and local by id, remote taking precedence
      const map = new Map<string, ModerationReport>();
      local.forEach((r) => map.set(r.id, r));
      remoteReports.forEach((r) => map.set(r.id, r));

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.saveLocalReports(merged);
      return merged;
    } catch {
      return local;
    }
  },

  /**
   * Update report status (pending / resolved / dismissed)
   */
  async updateReportStatus(id: string, status: ReportStatus): Promise<boolean> {
    const now = new Date().toISOString();

    // 1. Update in LocalStorage
    const local = this.getLocalReports();
    const updated = local.map((r) => (r.id === id ? { ...r, status, updatedAt: now } : r));
    this.saveLocalReports(updated);

    // 2. Update in Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('reports')
          .update({ status, updated_at: now })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update report status notice:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('prombo_report_updated', {
          detail: { id, status },
        })
      );
    }

    return true;
  },

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<boolean> {
    const local = this.getLocalReports();
    const updated = local.filter((r) => r.id !== id);
    this.saveLocalReports(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('reports').delete().eq('id', id);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prombo_report_deleted', { detail: id }));
    }

    return true;
  },
};
