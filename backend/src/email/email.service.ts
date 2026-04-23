import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────
export interface DigestTask {
  id: string;
  title: string;
  dueDate: Date | null;
  priority: string;
  entityType?: string | null;
  entityId?: string | null;
  status: string;
}

export interface TaskEmailData {
  id: string;
  title: string;
  dueDate: Date | null;
  dueTime: string | null;
  priority: string;
  entityType?: string | null;
  entityName?: string | null;
}

const DEFAULT_DUE_TIME = '9:00 AM';

function formatTaskDueDate(dueDate: Date | null, dueTime: string | null): string {
  if (!dueDate) return 'No due date';
  const datePart = dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = dueTime ? formatDueTime(dueTime) : DEFAULT_DUE_TIME;
  return `${datePart} at ${timePart}`;
}

function formatDueTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr ?? '9', 10);
  const m = parseInt(mStr ?? '0', 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function taskInfoCard(task: TaskEmailData): string {
  const rows: { label: string; value: string }[] = [
    { label: 'Task', value: task.title },
    { label: 'Due', value: formatTaskDueDate(task.dueDate, task.dueTime) },
    { label: 'Priority', value: task.priority },
  ];
  if (task.entityType && task.entityName) {
    rows.push({ label: task.entityType, value: task.entityName });
  }
  return infoCard(rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (email-safe: no CSS variables)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg: '#f0f2f5',           // cool light gray outer
  card: '#ffffff',
  slate: '#1c2b3a',         // deep slate header
  rust: '#c04e27',          // terracotta rust — primary accent & CTA
  rustTint: '#fef0ea',      // light rust tint for alerts
  danger: '#a82020',        // red for critical alerts
  dangerTint: '#fdf0f0',    // light red tint
  ink: '#1c2130',           // primary body text
  muted: '#5e6878',         // secondary / label text
  muted2: '#8892a0',        // footer / tertiary text
  border: '#d0d6e0',        // standard borders
  borderLight: '#e8ebf0',   // light inner dividers
  footerBg: '#f7f8fa',      // footer + label column background
  sans: `'IBM Plex Sans', Arial, sans-serif`,
  serif: `'IBM Plex Serif', Georgia, serif`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Base layout shell — every email shares this chrome
// ─────────────────────────────────────────────────────────────────────────────
function shell(opts: {
  preheader: string;
  headerLabel: string;
  headerIcon: string;     // accepted for API compatibility — not rendered
  accentColor?: string;   // accepted for API compatibility — not rendered
  body: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${opts.headerLabel}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .pad-20 { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${T.bg};font-family:${T.sans};">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${T.bg};">
    ${opts.preheader}&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${T.bg};">
    <tr>
      <td style="padding:40px 16px;">

        <!-- Email container -->
        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="margin:auto;">

          <!-- ── HEADER ─────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${T.slate};padding:0;">
              <!-- Rust accent stripe -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="height:3px;background-color:${T.rust};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <!-- Header content -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding:24px 36px 22px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td valign="middle">
                          <p style="margin:0;font-family:${T.serif};font-size:15px;color:#ffffff;letter-spacing:0.2px;line-height:1.2;font-weight:500;">Apex Consulting &amp; Surveying</p>
                          <p style="margin:4px 0 0;font-family:${T.sans};font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:2.5px;text-transform:uppercase;">Fort Wayne, Indiana</p>
                        </td>
                        <td align="right" valign="middle">
                          <p style="margin:0;font-family:${T.sans};font-size:10px;color:${T.rust};letter-spacing:2px;text-transform:uppercase;font-weight:600;">${opts.headerLabel}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ──────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${T.card};border-left:1px solid ${T.border};border-right:1px solid ${T.border};">
              <div class="pad-20" style="padding:40px 36px 36px;">
                ${opts.body}
              </div>
            </td>
          </tr>

          <!-- ── FOOTER ────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${T.footerBg};border:1px solid ${T.border};border-top:none;padding:18px 36px 20px;">
              <p style="margin:0;font-family:${T.sans};font-size:11px;color:${T.muted2};line-height:1.65;">
                Automated message from <strong style="color:${T.muted};">Apex Consulting &amp; Surveying CRM</strong>. Please do not reply to this email.
              </p>
              <p style="margin:7px 0 0;font-family:${T.sans};font-size:11px;color:${T.muted2};">
                &copy; ${new Date().getFullYear()} Apex Consulting &amp; Surveying, Inc. &middot; Fort Wayne, Indiana
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable block builders
// ─────────────────────────────────────────────────────────────────────────────
function greeting(name: string): string {
  return `<p style="margin:0 0 22px;font-family:${T.serif};font-size:26px;color:${T.ink};line-height:1.3;font-weight:400;letter-spacing:-0.2px;">Hello, ${name}.</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${T.sans};font-size:15px;color:${T.ink};line-height:1.72;">${text}</p>`;
}

function divider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0;"><tr><td style="border-top:1px solid ${T.borderLight};"></td></tr></table>`;
}

function ctaButton(label: string, url: string, color?: string): string {
  const bg = color ?? T.rust;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="background-color:${bg};">
          <a href="${url}" target="_blank"
            style="display:inline-block;padding:13px 32px;font-family:${T.sans};font-size:11px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function infoCard(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows.map((r, i) => {
    const isLast = i === rows.length - 1;
    const cellBorder = isLast ? 'none' : `1px solid ${T.borderLight}`;
    return `
    <tr>
      <td width="130" style="padding:11px 14px;background-color:${T.footerBg};border-bottom:${cellBorder};border-right:1px solid ${T.border};vertical-align:top;">
        <p style="margin:0;font-family:${T.sans};font-size:10px;color:${T.muted};text-transform:uppercase;letter-spacing:1.5px;font-weight:600;line-height:1.4;">${r.label}</p>
      </td>
      <td style="padding:11px 16px;border-bottom:${cellBorder};vertical-align:top;">
        <p style="margin:0;font-family:${T.sans};font-size:14px;color:${T.ink};font-weight:500;line-height:1.4;">${r.value}</p>
      </td>
    </tr>`;
  }).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:24px 0;border:1px solid ${T.border};">
      ${rowsHtml}
    </table>`;
}

function alertBox(message: string, type: 'warning' | 'danger' = 'warning'): string {
  const bg    = type === 'danger' ? T.dangerTint : T.rustTint;
  const bar   = type === 'danger' ? T.danger     : T.rust;
  const label = type === 'danger' ? 'Action Required' : 'Note';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:24px 0;background-color:${bg};">
      <tr>
        <td width="3" style="background-color:${bar};font-size:0;line-height:0;">&nbsp;</td>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 4px;font-family:${T.sans};font-size:10px;font-weight:600;color:${bar};text-transform:uppercase;letter-spacing:1.5px;">${label}</p>
          <p style="margin:0;font-family:${T.sans};font-size:13.5px;color:${T.ink};line-height:1.65;">${message}</p>
        </td>
      </tr>
    </table>`;
}

function linkFallback(url: string): string {
  return `<p style="margin:20px 0 0;font-family:${T.sans};font-size:12px;color:${T.muted};line-height:1.6;">
    If the button does not work, copy this link into your browser:<br/>
    <span style="color:${T.rust};word-break:break-all;">${url}</span>
  </p>`;
}

function signature(): string {
  return `
    ${divider()}
    <p style="margin:0;font-family:${T.serif};font-size:14px;color:${T.ink};font-weight:500;">Apex Consulting &amp; Surveying, Inc.</p>
    <p style="margin:4px 0 0;font-family:${T.sans};font-size:11px;color:${T.muted2};">Fort Wayne, Indiana</p>`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend email service initialized');
    } else {
      this.logger.warn('⚠️  RESEND_API_KEY not set — emails will be logged to console');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Reset
  // ─────────────────────────────────────────────────────────────────────────
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const _fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const body = `
      ${greeting(userName)}
      ${paragraph('We received a request to reset the password on your account. Use the button below to set a new password.')}
      ${ctaButton('Reset My Password', resetUrl)}
      ${alertBox('This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.')}
      ${linkFallback(resetUrl)}
      ${signature()}
    `;

    const html = shell({
      preheader: 'Reset your Apex CRM password — link expires in 1 hour.',
      headerLabel: 'Password Reset',
      headerIcon: '',
      body,
    });

    const text = `Hi ${userName},\n\nWe received a request to reset your password.\n\nReset link: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\nApex Consulting & Surveying, Inc.`;

    await this.send({ to: email, subject: 'Reset Your Password — Apex CRM', html, text, label: 'Password Reset' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Welcome
  // ─────────────────────────────────────────────────────────────────────────
  async sendWelcomeEmail(email: string, userName: string, tempPassword?: string): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const _fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const credentialsBlock = tempPassword
      ? infoCard([
          { label: 'Email Address', value: email },
          { label: 'Temporary Password', value: tempPassword },
        ]) + alertBox('For your security, please change your password immediately after your first login.')
      : '';

    const body = `
      ${greeting(userName)}
      ${paragraph('Your Apex CRM account is ready. You now have access to the full platform — leads, projects, clients, and reporting — all in one place.')}
      ${credentialsBlock}
      ${ctaButton('Access the Dashboard', loginUrl)}
      ${paragraph('If you have any questions or need help getting started, reach out to your administrator.')}
      ${signature()}
    `;

    const html = shell({
      preheader: `Welcome to Apex CRM, ${userName}. Your account is ready.`,
      headerLabel: 'Account Created',
      headerIcon: '',
      body,
    });

    const text = `Hi ${userName},\n\nWelcome to Apex CRM. Your account has been created.\n\n${tempPassword ? `Email: ${email}\nTemporary Password: ${tempPassword}\n\nPlease change your password after first login.\n\n` : ''}Login: ${loginUrl}\n\nApex Consulting & Surveying, Inc.`;

    await this.send({ to: email, subject: 'Welcome to Apex CRM', html, text, label: 'Welcome' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Changed
  // ─────────────────────────────────────────────────────────────────────────
  async sendPasswordChangedEmail(email: string, userName: string): Promise<void> {
    const _fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const body = `
      ${greeting(userName)}
      ${paragraph('This is a confirmation that the password on your account was successfully updated.')}
      ${infoCard([
        { label: 'Account', value: email },
        { label: 'Changed', value: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) },
      ])}
      ${alertBox('If you did not make this change, contact your administrator immediately — your account may be compromised.', 'danger')}
      ${signature()}
    `;

    const html = shell({
      preheader: 'Your Apex CRM password was changed. If this wasn\'t you, act now.',
      headerLabel: 'Security Notice',
      headerIcon: '',
      body,
    });

    const text = `Hi ${userName},\n\nYour Apex CRM password was successfully changed.\n\nIf you didn't do this, please contact your administrator immediately.\n\nApex Consulting & Surveying, Inc.`;

    await this.send({ to: email, subject: 'Password Changed — Apex CRM', html, text, label: 'Password Changed' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Daily Task Digest
  // ─────────────────────────────────────────────────────────────────────────
  async sendDailyDigestEmail(to: string, name: string, tasks: DigestTask[]): Promise<void> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeStatuses = ['OPEN', 'IN_PROGRESS'];

    const overdue = tasks.filter(
      (t) =>
        t.dueDate !== null &&
        t.dueDate < startOfToday &&
        activeStatuses.includes(t.status),
    );

    const dueToday = tasks.filter(
      (t) =>
        t.dueDate !== null &&
        t.dueDate >= startOfToday &&
        t.dueDate < new Date(startOfToday.getTime() + 86400000) &&
        activeStatuses.includes(t.status),
    );

    // Nothing to report — skip sending
    if (overdue.length === 0 && dueToday.length === 0) return;

    const formatDate = (d: Date | null): string =>
      d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';

    const buildTaskRows = (list: DigestTask[]) =>
      infoCard(
        list.map((t) => ({
          label: `${t.priority} · Due ${formatDate(t.dueDate)}${t.entityType ? ` · ${t.entityType}` : ''}`,
          value: t.title,
        })),
      );

    const overdueBlock =
      overdue.length > 0
        ? `${alertBox(
            `You have <strong>${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}</strong> that need${overdue.length === 1 ? 's' : ''} attention.`,
            'danger',
          )}${buildTaskRows(overdue)}`
        : '';

    const dueTodayBlock =
      dueToday.length > 0
        ? `${paragraph(`You have <strong>${dueToday.length} task${dueToday.length === 1 ? '' : 's'}</strong> due today.`)}${buildTaskRows(dueToday)}`
        : '';

    const tasksUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks`;

    const dateLabel = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const body = `
      ${greeting(`Good morning, ${name}`)}
      ${paragraph(`Here is your task summary for <strong>${dateLabel}</strong>.`)}
      ${overdueBlock}
      ${dueTodayBlock}
      ${ctaButton('View My Tasks', tasksUrl)}
      ${signature()}
    `;

    const html = shell({
      preheader: `${overdue.length > 0 ? `${overdue.length} overdue · ` : ''}${dueToday.length > 0 ? `${dueToday.length} due today` : 'Task digest'} — ${dateLabel}`,
      headerLabel: 'Daily Digest',
      headerIcon: '',
      body,
    });

    const textLines: string[] = [`Good morning, ${name}`, '', `Task Digest — ${dateLabel}`, ''];
    if (overdue.length > 0) {
      textLines.push(`OVERDUE (${overdue.length})`);
      overdue.forEach((t) => textLines.push(`  - ${t.title} (Due: ${formatDate(t.dueDate)}, ${t.priority})`));
      textLines.push('');
    }
    if (dueToday.length > 0) {
      textLines.push(`DUE TODAY (${dueToday.length})`);
      dueToday.forEach((t) => textLines.push(`  - ${t.title} (${t.priority})`));
      textLines.push('');
    }
    textLines.push(`View your tasks: ${tasksUrl}`);
    textLines.push('', 'Apex Consulting & Surveying, Inc.');

    await this.send({
      to,
      subject: `Your Daily Task Digest — ${dateLabel}`,
      html,
      text: textLines.join('\n'),
      label: 'Daily Digest',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Task Assigned
  // ─────────────────────────────────────────────────────────────────────────
  async sendTaskAssignedEmail(
    to: string,
    name: string,
    task: TaskEmailData,
    assignedByName: string,
  ): Promise<void> {
    const tasksUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks`;

    const body = `
      ${greeting(name)}
      ${paragraph(`<strong>${assignedByName}</strong> has assigned you a new task.`)}
      ${taskInfoCard(task)}
      ${task.dueDate
        ? alertBox(`This task is due on <strong>${formatTaskDueDate(task.dueDate, task.dueTime)}</strong>.`)
        : ''}
      ${ctaButton('View My Tasks', tasksUrl)}
      ${signature()}
    `;

    const html = shell({
      preheader: `New task: "${task.title}" — assigned by ${assignedByName}`,
      headerLabel: 'Task Assigned',
      headerIcon: '',
      body,
    });

    const text = [
      `Hello, ${name}.`,
      '',
      `${assignedByName} has assigned you a new task: "${task.title}"`,
      task.dueDate ? `Due: ${formatTaskDueDate(task.dueDate, task.dueTime)}` : '',
      `Priority: ${task.priority}`,
      '',
      `View your tasks: ${tasksUrl}`,
      '',
      'Apex Consulting & Surveying, Inc.',
    ].filter(Boolean).join('\n');

    await this.send({
      to,
      subject: `New Task Assigned: "${task.title}"`,
      html,
      text,
      label: 'Task Assigned',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Task Reminder (2 days / 1 day / same day)
  // ─────────────────────────────────────────────────────────────────────────
  async sendTaskReminderEmail(
    to: string,
    name: string,
    task: TaskEmailData,
    daysUntilDue: 0 | 1 | 2,
  ): Promise<void> {
    const tasksUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tasks`;

    const urgencyLabels: Record<0 | 1 | 2, string> = {
      0: 'due today',
      1: 'due tomorrow',
      2: 'due in 2 days',
    };
    const urgencyLabel = urgencyLabels[daysUntilDue];
    const alertType: 'danger' | 'warning' = daysUntilDue === 0 ? 'danger' : 'warning';

    const dueAt = formatTaskDueDate(task.dueDate, task.dueTime);

    const body = `
      ${greeting(name)}
      ${paragraph(`This is a reminder that you have a task <strong>${urgencyLabel}</strong>.`)}
      ${taskInfoCard(task)}
      ${alertBox(
        daysUntilDue === 0
          ? `This task is due <strong>today at ${task.dueTime ? formatDueTime(task.dueTime) : DEFAULT_DUE_TIME}</strong>. Please complete it as soon as possible.`
          : `This task is due on <strong>${dueAt}</strong>.`,
        alertType,
      )}
      ${ctaButton('View My Tasks', tasksUrl)}
      ${signature()}
    `;

    const subjectMap: Record<0 | 1 | 2, string> = {
      0: `Task Due Today: "${task.title}"`,
      1: `Reminder — Task Due Tomorrow: "${task.title}"`,
      2: `Reminder — Task Due in 2 Days: "${task.title}"`,
    };

    const html = shell({
      preheader: `Task ${urgencyLabel}: "${task.title}" — ${dueAt}`,
      headerLabel: 'Task Reminder',
      headerIcon: '',
      accentColor: daysUntilDue === 0 ? T.danger : T.rust,
      body,
    });

    const text = [
      `Hello, ${name}.`,
      '',
      `Reminder: "${task.title}" is ${urgencyLabel}.`,
      `Due: ${dueAt}`,
      `Priority: ${task.priority}`,
      '',
      `View your tasks: ${tasksUrl}`,
      '',
      'Apex Consulting & Surveying, Inc.',
    ].join('\n');

    await this.send({
      to,
      subject: subjectMap[daysUntilDue],
      html,
      text,
      label: 'Task Reminder',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Comment Mention
  // ─────────────────────────────────────────────────────────────────────────
  async sendCommentMentionEmail(
    to: string,
    recipientName: string,
    authorName: string,
    projectName: string,
    projectId: string,
    commentExcerpt: string,
  ): Promise<void> {
    const projectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${projectId}`;
    const cleanExcerpt = commentExcerpt.replace(/@\[([^\]]+)\]\([a-f0-9-]{36}\)/g, '@$1');

    const body = `
      ${greeting(recipientName)}
      ${paragraph(`<strong>${authorName}</strong> mentioned you in a comment on <strong>${projectName}</strong>:`)}
      ${alertBox(`"${cleanExcerpt.length > 200 ? cleanExcerpt.slice(0, 200) + '…' : cleanExcerpt}"`, 'warning')}
      ${ctaButton('View Project', projectUrl)}
      ${signature()}
    `;

    const html = shell({
      headerLabel: 'You were mentioned',
      headerIcon: '',
      preheader: `${authorName} mentioned you on ${projectName}`,
      body,
    });

    const text = `Hi ${recipientName},\n\n${authorName} mentioned you in a comment on "${projectName}":\n\n"${cleanExcerpt}"\n\nView project: ${projectUrl}\n\nApex Consulting & Surveying, Inc.`;

    await this.send({
      to,
      subject: `${authorName} mentioned you on "${projectName}"`,
      html,
      text,
      label: 'Comment Mention',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Task Completed (PM notification)
  // ─────────────────────────────────────────────────────────────────────────
  async sendTaskCompletedEmail(
    to: string,
    pmName: string,
    task: TaskEmailData,
    completedByName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    const projectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${projectId}`;

    const body = `
      ${greeting(pmName)}
      ${paragraph(`<strong>${completedByName}</strong> has marked a task as complete on project <strong>${projectName}</strong>.`)}
      ${taskInfoCard(task)}
      ${ctaButton('View Project', projectUrl)}
      ${signature()}
    `;

    const html = shell({
      preheader: `Task completed: "${task.title}" on ${projectName}`,
      headerLabel: 'Task Completed',
      headerIcon: '',
      body,
    });

    const text = [
      `Hello, ${pmName}.`,
      '',
      `${completedByName} completed a task on "${projectName}": "${task.title}"`,
      task.dueDate ? `Due was: ${formatTaskDueDate(task.dueDate, task.dueTime)}` : '',
      `Priority: ${task.priority}`,
      '',
      `View project: ${projectUrl}`,
      '',
      'Apex Consulting & Surveying, Inc.',
    ].filter(Boolean).join('\n');

    await this.send({
      to,
      subject: `Task Completed on "${projectName}": "${task.title}"`,
      html,
      text,
      label: 'Task Completed',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Automation Email
  // ─────────────────────────────────────────────────────────────────────────
  async sendWorkflowEmail(to: string, subject: string, body: string): Promise<void> {
    await this.send({
      to,
      subject,
      html: `<div style="font-family:'IBM Plex Sans',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1c2130"><p style="font-size:15px;line-height:1.7;">${body.replace(/\n/g, '<br>')}</p><hr style="margin-top:32px;border:none;border-top:1px solid #e8ebf0"><p style="color:#8892a0;font-size:11px">Sent by Apex Consulting &amp; Surveying CRM Workflow Automation</p></div>`,
      text: body,
      label: 'workflow-email',
      critical: false,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal send helper
  // ─────────────────────────────────────────────────────────────────────────
  private async send(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    label: string;
    critical?: boolean;
  }): Promise<void> {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!this.resend) {
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`📧 [DEV] ${opts.label}`);
      this.logger.log(`To: ${opts.to} | Subject: ${opts.subject}`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      this.logger.log(`✅ ${opts.label} email sent to: ${opts.to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send ${opts.label} email to ${opts.to}:`, error);
      if (opts.critical) throw new Error(`Failed to send ${opts.label} email`);
    }
  }
}
