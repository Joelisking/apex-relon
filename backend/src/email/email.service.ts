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

// ─────────────────────────────────────────────────────────────────────────────
// Shared design tokens (email-safe: no CSS variables)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg: '#f5f3ef',          // warm parchment background
  card: '#ffffff',
  charcoal: '#141210',    // near-black header
  ink: '#2a2520',         // body text
  muted: '#6b6560',       // secondary text
  gold: '#b8873a',        // warm gold accent
  goldLight: '#f5ead8',   // gold tint
  border: '#e5dfd6',      // warm border
  danger: '#c0392b',
  dangerLight: '#fdf1f0',
  sans: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
  serif: `Georgia, 'Times New Roman', serif`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Base layout shell — every email shares this chrome
// ─────────────────────────────────────────────────────────────────────────────
function shell(opts: {
  preheader: string;
  headerLabel: string;
  headerIcon: string;
  accentColor?: string;
  body: string;
}): string {
  const accent = opts.accentColor ?? T.gold;

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
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; }
      .pad-20 { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${T.bg};font-family:${T.sans};">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${T.bg};">
    ${opts.preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${T.bg};">
    <tr>
      <td style="padding:40px 16px;">

        <!-- Email container -->
        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="margin:auto;">

          <!-- ── HEADER ─────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${T.charcoal};border-radius:12px 12px 0 0;padding:0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <!-- Top accent bar -->
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,${accent} 0%,${accent}99 60%,transparent 100%);border-radius:12px 12px 0 0;"></td>
                </tr>
                <tr>
                  <td style="padding:32px 40px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <!-- Monogram -->
                        <td width="44" valign="middle">
                          <div style="width:44px;height:44px;border-radius:10px;background-color:${accent};display:inline-block;text-align:center;line-height:44px;font-family:${T.serif};font-size:18px;font-weight:bold;color:#fff;letter-spacing:-0.5px;">
                            KH
                          </div>
                        </td>
                        <td width="12"></td>
                        <!-- Brand -->
                        <td valign="middle">
                          <p style="margin:0;font-family:${T.serif};font-size:17px;color:#ffffff;letter-spacing:0.3px;line-height:1.2;">Relon</p>
                          <p style="margin:2px 0 0;font-family:${T.sans};font-size:11px;color:${accent};letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">CRM Platform</p>
                        </td>
                        <!-- Icon label -->
                        <td align="right" valign="middle">
                          <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:20px;font-family:${T.sans};font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.8px;text-transform:uppercase;">
                            ${opts.headerIcon}&nbsp; ${opts.headerLabel}
                          </span>
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
              <div class="pad-20" style="padding:44px 48px;">
                ${opts.body}
              </div>
            </td>
          </tr>

          <!-- ── FOOTER ────────────────────────────────────────── -->
          <tr>
            <td style="background-color:#faf9f7;border:1px solid ${T.border};border-top:none;border-radius:0 0 12px 12px;padding:24px 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-family:${T.sans};font-size:12px;color:${T.muted};line-height:1.6;">
                      This is an automated message from <strong style="color:${T.ink};">Relon CRM</strong>. Please do not reply directly to this email.
                    </p>
                    <p style="margin:8px 0 0;font-family:${T.sans};font-size:12px;color:${T.muted};">
                      &copy; ${new Date().getFullYear()} Relon. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email container -->

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
  return `<p style="margin:0 0 20px;font-family:${T.serif};font-size:26px;color:${T.charcoal};line-height:1.3;letter-spacing:-0.3px;">Hello, ${name}.</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-family:${T.sans};font-size:15px;color:${T.ink};line-height:1.75;">${text}</p>`;
}

function divider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:28px 0;"><tr><td style="border-top:1px solid ${T.border};"></td></tr></table>`;
}

function ctaButton(label: string, url: string, color?: string): string {
  const bg = color ?? T.charcoal;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="border-radius:8px;background-color:${bg};">
          <a href="${url}" target="_blank"
            style="display:inline-block;padding:14px 32px;font-family:${T.sans};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
            ${label} &rarr;
          </a>
        </td>
      </tr>
    </table>`;
}

function infoCard(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid ${T.border};">
        <p style="margin:0;font-family:${T.sans};font-size:11px;color:${T.muted};text-transform:uppercase;letter-spacing:1px;font-weight:600;">${r.label}</p>
        <p style="margin:4px 0 0;font-family:${T.sans};font-size:15px;color:${T.ink};font-weight:500;">${r.value}</p>
      </td>
    </tr>`).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:24px 0;border:1px solid ${T.border};border-radius:10px;overflow:hidden;">
      ${rowsHtml}
    </table>`;
}

function alertBox(message: string, type: 'warning' | 'danger' = 'warning'): string {
  const bg   = type === 'danger' ? T.dangerLight : T.goldLight;
  const bar  = type === 'danger' ? T.danger      : T.gold;
  const icon = type === 'danger' ? '⚠' : 'ℹ';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="margin:24px 0;border-radius:8px;overflow:hidden;background-color:${bg};">
      <tr>
        <td width="4" style="background-color:${bar};border-radius:8px 0 0 8px;"></td>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-family:${T.sans};font-size:14px;color:${T.ink};line-height:1.6;">
            <strong>${icon} ${message}</strong>
          </p>
        </td>
      </tr>
    </table>`;
}

function linkFallback(url: string): string {
  return `<p style="margin:20px 0 0;font-family:${T.sans};font-size:13px;color:${T.muted};line-height:1.6;">
    Or copy this link into your browser:<br/>
    <span style="color:${T.gold};word-break:break-all;">${url}</span>
  </p>`;
}

function signature(): string {
  return `
    ${divider()}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td width="36" valign="middle">
          <div style="width:36px;height:36px;border-radius:8px;background-color:${T.charcoal};text-align:center;line-height:36px;font-family:${T.serif};font-size:13px;color:#fff;">RL</div>
        </td>
        <td width="12"></td>
        <td valign="middle">
          <p style="margin:0;font-family:${T.sans};font-size:14px;color:${T.ink};font-weight:600;line-height:1.3;">The Relon Team</p>
          <p style="margin:2px 0 0;font-family:${T.sans};font-size:12px;color:${T.muted};">relon.com</p>
        </td>
      </tr>
    </table>`;
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
      ${paragraph('We received a request to reset the password on your Relon CRM account. Use the button below to set a new password.')}
      ${ctaButton('Reset My Password', resetUrl)}
      ${alertBox('This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.')}
      ${linkFallback(resetUrl)}
      ${signature()}
    `;

    const html = shell({
      preheader: 'Reset your Relon CRM password — link expires in 1 hour.',
      headerLabel: 'Password Reset',
      headerIcon: '🔐',
      body,
    });

    const text = `Hi ${userName},\n\nWe received a request to reset your password.\n\nReset link: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\nThe Relon Team`;

    await this.send({ to: email, subject: 'Reset Your Password — Relon CRM', html, text, label: 'Password Reset' });
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
      ${paragraph('Your Relon CRM account is ready. You now have access to the full platform — leads, projects, clients, and reporting — all in one place.')}
      ${credentialsBlock}
      ${ctaButton('Access the Dashboard', loginUrl, T.gold)}
      ${paragraph('If you have any questions or need help getting started, reach out to your administrator.')}
      ${signature()}
    `;

    const html = shell({
      preheader: `Welcome to Relon CRM, ${userName}. Your account is ready.`,
      headerLabel: 'Welcome',
      headerIcon: '✦',
      accentColor: T.gold,
      body,
    });

    const text = `Hi ${userName},\n\nWelcome to Relon CRM. Your account has been created.\n\n${tempPassword ? `Email: ${email}\nTemporary Password: ${tempPassword}\n\nPlease change your password after first login.\n\n` : ''}Login: ${loginUrl}\n\nThe Relon Team`;

    await this.send({ to: email, subject: 'Welcome to Relon CRM', html, text, label: 'Welcome' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Changed
  // ─────────────────────────────────────────────────────────────────────────
  async sendPasswordChangedEmail(email: string, userName: string): Promise<void> {
    const _fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const body = `
      ${greeting(userName)}
      ${paragraph('This is a confirmation that the password for your Relon CRM account was successfully updated.')}
      ${infoCard([
        { label: 'Account', value: email },
        { label: 'Changed', value: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) },
      ])}
      ${alertBox('If you did not make this change, contact your administrator immediately — your account may be compromised.', 'danger')}
      ${signature()}
    `;

    const html = shell({
      preheader: 'Your Relon CRM password was changed. If this wasn\'t you, act now.',
      headerLabel: 'Security Notice',
      headerIcon: '🛡',
      accentColor: '#6b7280',
      body,
    });

    const text = `Hi ${userName},\n\nYour Relon CRM password was successfully changed.\n\nIf you didn't do this, please contact your administrator immediately.\n\nThe Relon Team`;

    await this.send({ to: email, subject: 'Password Changed — Relon CRM', html, text, label: 'Password Changed' });
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
      headerIcon: '📋',
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
    textLines.push('', 'The Relon Team');

    await this.send({
      to,
      subject: `Your Daily Task Digest — ${dateLabel}`,
      html,
      text: textLines.join('\n'),
      label: 'Daily Digest',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Automation Email
  // ─────────────────────────────────────────────────────────────────────────
  async sendWorkflowEmail(to: string, subject: string, body: string): Promise<void> {
    await this.send({
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><p>${body.replace(/\n/g, '<br>')}</p><hr style="margin-top:32px"><p style="color:#999;font-size:12px">Sent by Relon CRM Workflow Automation</p></div>`,
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
