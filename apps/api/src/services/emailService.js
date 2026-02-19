/**
 * Email service - sends transactional emails (verification, notifications).
 * Uses SMTP; in dev typically Mailpit (docker) for capture without sending.
 */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '1025', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        ...(user && pass ? { auth: { user, pass } } : {}),
    });
    return transporter;
}

/**
 * Send an email. Returns { sent: true } or { sent: false, error }.
 */
async function sendEmail({ to, subject, text, html }) {
    const from = process.env.SMTP_FROM || 'NewOne <noreply@newone.local>';
    try {
        await getTransporter().sendMail({
            from,
            to,
            subject,
            text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
            html: html || undefined,
        });
        return { sent: true };
    } catch (err) {
        console.error('Email send error:', err.message);
        return { sent: false, error: err.message };
    }
}

/**
 * Send verification email after signup.
 */
async function sendVerificationEmail(to, fullName, verificationUrl) {
    const subject = 'Verify your NewOne account';
    const html = `
      <p>Hi ${fullName},</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>— NewOne</p>
    `;
    return sendEmail({ to, subject, html });
}

/**
 * Send welcome email (no verification link).
 */
async function sendWelcomeEmail(to, fullName, userType) {
    const subject = 'Welcome to NewOne';
    const html = `
      <p>Hi ${fullName},</p>
      <p>Your account has been created. You can sign in and complete your ${userType} profile.</p>
      <p>— NewOne</p>
    `;
    return sendEmail({ to, subject, html });
}

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendWelcomeEmail,
};
