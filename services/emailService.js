// src/services/emailService.js
import nodemailer from 'nodemailer';
import CampaignTracking from '../models/CampaignTracking.js';
import { renderTemplate } from './templateService.js';
import { getSystemSettings } from './systemSettingService.js';

// Helper function to introduce delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a configured Nodemailer transport with TLS and Custom CA support
 */
export const buildSmtpTransporter = (senderProfile) => {
    const authConfig = senderProfile.email && senderProfile.password ? {
        user: senderProfile.email,
        pass: senderProfile.password,
    } : undefined;

    const encryptionMode = senderProfile.encryptionMode || (senderProfile.secure ? 'smtps_direct' : 'starttls_strict');

    const tlsOptions = {
        minVersion: senderProfile.minTlsVersion || 'TLSv1.2',
        rejectUnauthorized: !senderProfile.ignoreTlsCertificateErrors,
    };

    if (senderProfile.customCaCertificate && senderProfile.customCaCertificate.trim()) {
        tlsOptions.ca = [senderProfile.customCaCertificate.trim()];
    }

    return nodemailer.createTransport({
        host: senderProfile.host,
        port: Number(senderProfile.port),
        secure: encryptionMode === 'smtps_direct',
        requireTLS: encryptionMode === 'starttls_strict',
        ignoreTLS: encryptionMode === 'none',
        tls: tlsOptions,
        auth: authConfig,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
};

/**
 * Live test SMTP connection and TLS handshake
 */
export const verifySmtpConnection = async (senderProfile) => {
    const transporter = buildSmtpTransporter(senderProfile);
    try {
        const verifyResult = await transporter.verify();
        return {
            success: true,
            message: `SMTP Connection & TLS handshake to ${senderProfile.host}:${senderProfile.port} succeeded.`,
            details: verifyResult,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'SMTP connection verification failed.',
            code: error.code,
            command: error.command,
        };
    }
};

export const sendMultipleEmails = async (trackingEntry, senderProfile, template, timeDelay, origin) => {
    try {
        const settings = await getSystemSettings().catch(() => null);
        const baseUrl = (settings?.general?.publicUrl && settings.general.publicUrl.trim()) 
            ? settings.general.publicUrl.trim().replace(/\/$/, '') 
            : (origin || 'https://localhost').replace(/\/$/, '');

        // Create SMTP transporter with dynamic TLS and Exchange CA support
        const transporter = buildSmtpTransporter(senderProfile);

        // Fetch contact data
        const contact = trackingEntry.contact || {};

        if (!template.htmlContent) {
            throw new Error("Template content is missing.");
        }

        // Dynamic Warning and Report Link Construction
        const link = `${baseUrl}/training/warning?id=${trackingEntry.shortId}&src=email`;
        const reportLink = `${baseUrl}/api/tracking/report/${trackingEntry.shortId}`;

        // Prepare placeholders for email template (supports both CyPhish and GoPhish syntax)
        const placeholders = {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email || trackingEntry.email,
            phoneNumber: contact.phoneNumber || '',
            role: contact.role || '',
            country: contact.country || '',
            link,
            reportLink,
            trackingUrl: link,
            department: contact.department || 'General',
            ou: contact.ou || '',
            team: contact.teamName || '',
            company: contact.company || '',
        };

        // Render email body directly from the passed template object and contact data
        let emailBody = renderTemplate(template.htmlContent, placeholders);

        // Append invisible 1x1 open tracking pixel
        const openTrackingPixel = `<img src="${baseUrl}/api/tracking/open/${trackingEntry.shortId}" width="1" height="1" alt="" style="display:none !important; width:1px; height:1px; opacity:0;" />`;
        if (emailBody.includes('</body>')) {
            emailBody = emailBody.replace('</body>', `${openTrackingPixel}</body>`);
        } else {
            emailBody = `${emailBody}${openTrackingPixel}`;
        }

        const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const fromAddress = isValidEmail(senderProfile.email) ? senderProfile.email : "no-reply@mail.com";

        const mailOptions = {
            from: `${senderProfile.senderName} <${fromAddress}>`,
            to: trackingEntry.email,
            subject: template.subject,
            html: emailBody,
            headers: {
                'X-CyPhish-Simulation': 'true',
                'X-Phish-Report-URL': reportLink,
            },
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        // Update CampaignTracking on success
        await CampaignTracking.findByIdAndUpdate(trackingEntry._id, {
            status: 'sent',
            lastAttempt: new Date(),
            deliveredAt: new Date(),
            attemptCount: trackingEntry.attemptCount + 1,
            error: null,
        });

        console.log(`Email successfully sent to: ${trackingEntry.email}`);

        // Wait for timeDelay if set
        if (timeDelay && timeDelay > 0) {
            await delay(timeDelay * 1000);
        }
    } catch (error) {
        console.error(`Error sending email to ${trackingEntry.email}:`, error.message);

        // Record error on tracking entry
        await CampaignTracking.findByIdAndUpdate(trackingEntry._id, {
            lastAttempt: new Date(),
            attemptCount: trackingEntry.attemptCount + 1,
            error: error.message,
        });
        throw error;
    }
};
