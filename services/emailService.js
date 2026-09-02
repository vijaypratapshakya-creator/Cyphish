// src/services/emailService.js
import nodemailer from 'nodemailer';
import CampaignTracking from '../models/CampaignTracking.js';
import { renderTemplate } from './templateService.js';
import { getSystemSettings } from './systemSettingService.js';

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMultipleEmails = async (trackingEntry, senderProfile, template, timeDelay, origin) => {
    try {
        const settings = await getSystemSettings().catch(() => null);
        const baseUrl = (settings?.general?.publicUrl && settings.general.publicUrl.trim()) 
            ? settings.general.publicUrl.trim().replace(/\/$/, '') 
            : (origin || 'https://localhost').replace(/\/$/, '');

        // Check if SMTP authentication is required
        const authConfig = senderProfile.email && senderProfile.password ? {
            user: senderProfile.email,
            pass: senderProfile.password
        } : null;

        // Create SMTP transporter
        const transporter = nodemailer.createTransport({
            host: senderProfile.host,
            port: senderProfile.port,
            secure: senderProfile.secure, // true for 465, false for other ports
            auth: authConfig
        });

        // Fetch contact data
        const contact = trackingEntry.contact;

        if (!template.htmlContent) {
            throw new Error("Template content is missing.");
        }

        // Dynamic Warning and Report Link Construction
        const link = `${baseUrl}/training/warning?id=${trackingEntry.shortId}&src=email`;
        const reportLink = `${baseUrl}/api/tracking/report/${trackingEntry.shortId}`;

        // Prepare placeholders for email template
        const placeholders = {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email || trackingEntry.email,
            phoneNumber: contact.phoneNumber || '',
            role: contact.role || '',
            country: contact.country || '',
            link,
            reportLink,
            // Add metadata fields if they exist
            department: contact.department || contact.metadata?.get?.('department') || '',
            company: contact.company || contact.metadata?.get?.('company') || ''
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

        // Regular expression to validate email format
        const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        // Check if senderProfile.email is a valid email; if not, use a default or handle the error
        const fromAddress = isValidEmail(senderProfile.email) ? senderProfile.email : "no-reply@mail.com";

        // Email options
        const mailOptions = {
            from: `${senderProfile.senderName} <${fromAddress}>`,
            to: trackingEntry.email,
            subject: template.subject,
            html: emailBody,
            headers: {
                'X-CyPhish-Simulation': 'true',
                'X-Phish-Report-URL': reportLink
            }
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        // Update CampaignTracking on success
        await CampaignTracking.findByIdAndUpdate(trackingEntry._id, {
            status: 'sent',
            lastAttempt: new Date(),
            deliveredAt: new Date(),
            attemptCount: trackingEntry.attemptCount + 1,
            error: null // Clear any previous error
        });

        console.log(`Email successfully sent to: ${trackingEntry.email}`);

        // Wait for timeDelay if set
        if (timeDelay) {
            await delay(timeDelay * 1000);
            console.log(`Next batch in ${timeDelay}s`);
        }
    } catch (error) {
        // Update CampaignTracking status to "failed" and log error message
        console.error(`Error sending email to: ${trackingEntry.email} - ${error.message}`);
        await CampaignTracking.findByIdAndUpdate(trackingEntry._id, {
            status: 'failed',
            lastAttempt: new Date(),
            attemptCount: trackingEntry.attemptCount + 1,
            error: error.message
        });
    }
};
