import nodemailer from 'nodemailer';
import SenderProfile from '../models/SenderProfile.js';
import { buildSmtpTransporter } from './emailService.js';

export const verifySMTP = async (senderProfileData) => {
    const transporter = buildSmtpTransporter(senderProfileData);
    await transporter.verify();
};

export const verifySMTPById = async (senderProfileId) => {
    const senderProfile = await SenderProfile.findById(senderProfileId);

    if (!senderProfile) {
        throw new Error("Sender profile not found");
    }

    return await verifySMTP(senderProfile);
};