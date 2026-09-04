import SenderProfile from '../models/SenderProfile.js';
import { verifySmtpConnection } from '../services/emailService.js';
import { audit } from '../services/auditService.js';

const safeProfile = (profile) => {
  const value = profile.toObject ? profile.toObject() : profile;
  const { password, ...safe } = value;
  return { ...safe, hasPassword: Boolean(password) };
};

// Live test SMTP Connection and TLS Handshake
export const testConnection = async (req, res) => {
  try {
    const {
      host,
      port,
      email,
      fromEmail,
      replyTo,
      authType,
      authUsername,
      password,
      encryptionMode,
      minTlsVersion,
      customCaCertificate,
      ignoreTlsCertificateErrors,
      profileId,
    } = req.body;

    let targetPassword = password;
    let targetHost = host;
    let targetPort = port;
    let targetEmail = email;
    let targetFromEmail = fromEmail;
    let targetReplyTo = replyTo;
    let targetAuthType = authType || (password ? 'credentials' : 'anonymous');
    let targetAuthUsername = authUsername || email;
    let targetCa = customCaCertificate;

    // If testing an existing profile with unchanged password
    if (profileId && (!targetPassword || targetPassword === '[UNCHANGED]')) {
      const existing = await SenderProfile.findById(profileId);
      if (existing) {
        targetPassword = existing.password;
        if (!targetHost) targetHost = existing.host;
        if (!targetPort) targetPort = existing.port;
        if (!targetEmail) targetEmail = existing.email;
        if (!targetFromEmail) targetFromEmail = existing.fromEmail;
        if (!targetReplyTo) targetReplyTo = existing.replyTo;
        if (!targetAuthType) targetAuthType = existing.authType;
        if (!targetAuthUsername) targetAuthUsername = existing.authUsername;
        if (!targetCa) targetCa = existing.customCaCertificate;
      }
    }

    if (!targetHost || !targetPort) {
      return res.status(400).json({ success: false, message: 'SMTP Host and Port are required.' });
    }

    const testPayload = {
      host: targetHost.trim(),
      port: Number(targetPort),
      email: (targetEmail || targetFromEmail || '').trim(),
      fromEmail: (targetFromEmail || targetEmail || '').trim(),
      replyTo: (targetReplyTo || '').trim(),
      authType: targetAuthType,
      authUsername: (targetAuthUsername || '').trim(),
      password: targetPassword,
      encryptionMode: encryptionMode || 'starttls_strict',
      minTlsVersion: minTlsVersion || 'TLSv1.3',
      customCaCertificate: targetCa || '',
      ignoreTlsCertificateErrors: Boolean(ignoreTlsCertificateErrors),
    };

    const result = await verifySmtpConnection(testPayload);

    await audit({
      req,
      action: 'SMTP_CONNECTION_TEST',
      resourceType: 'SenderProfile',
      outcome: result.success ? 'success' : 'failure',
      details: { host: targetHost, port: targetPort, authType: targetAuthType, success: result.success },
    });

    if (result.success) {
      return res.json({ success: true, message: result.message });
    } else {
      return res.status(400).json({ success: false, message: result.message, code: result.code });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new Sender Profile
export const createSenderProfile = async (req, res) => {
  try {
    const {
      senderName,
      email,
      fromEmail,
      replyTo,
      host,
      port,
      authType = 'anonymous',
      authUsername,
      secure,
      encryptionMode,
      minTlsVersion,
      customCaCertificate,
      ignoreTlsCertificateErrors,
      password,
      isDefault,
    } = req.body;

    if (!senderName || !host || !port) {
      return res.status(400).json({ success: false, message: 'Sender Name, Host, and Port are required.' });
    }

    // If marked default, unset other defaults
    if (isDefault) {
      await SenderProfile.updateMany({}, { isDefault: false });
    }

    const effectiveFromEmail = (fromEmail || email || '').trim();
    const effectiveAuthUsername = (authUsername || (authType === 'credentials' ? email : '') || '').trim();

    const senderProfile = new SenderProfile({
      senderName: senderName.trim(),
      fromEmail: effectiveFromEmail,
      replyTo: (replyTo || '').trim(),
      email: effectiveFromEmail, // Synced for legacy compatibility
      host: host.trim(),
      port: Number(port),
      authType: authType || (password ? 'credentials' : 'anonymous'),
      authUsername: effectiveAuthUsername,
      password: authType === 'credentials' ? (password || '') : '',
      secure: Boolean(secure),
      encryptionMode: encryptionMode || (secure ? 'smtps_direct' : 'starttls_strict'),
      minTlsVersion: minTlsVersion || 'TLSv1.3',
      customCaCertificate: customCaCertificate?.trim() || '',
      ignoreTlsCertificateErrors: Boolean(ignoreTlsCertificateErrors),
      isDefault: Boolean(isDefault),
    });

    await senderProfile.save();

    await audit({
      req,
      action: 'SENDER_PROFILE_CREATED',
      resourceType: 'SenderProfile',
      resourceId: senderProfile._id,
      details: {
        senderName: senderProfile.senderName,
        fromEmail: senderProfile.fromEmail,
        host: senderProfile.host,
        port: senderProfile.port,
        authType: senderProfile.authType,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Sender profile created successfully',
      data: safeProfile(senderProfile),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Sender Profiles
export const getAllSenderProfiles = async (req, res) => {
  try {
    const senderProfiles = await SenderProfile.find().sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: senderProfiles.map(safeProfile),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a specific Sender Profile by ID
export const getSenderProfileById = async (req, res) => {
  try {
    const senderProfile = await SenderProfile.findById(req.params.id);
    if (!senderProfile) {
      return res.status(404).json({ success: false, message: 'Sender profile not found' });
    }
    res.status(200).json({ success: true, data: safeProfile(senderProfile) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a Sender Profile
export const updateSenderProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      senderName,
      email,
      fromEmail,
      replyTo,
      host,
      port,
      authType,
      authUsername,
      secure,
      encryptionMode,
      minTlsVersion,
      customCaCertificate,
      ignoreTlsCertificateErrors,
      password,
      isDefault,
    } = req.body;

    const profile = await SenderProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Sender profile not found' });
    }

    if (senderName) profile.senderName = senderName.trim();
    if (fromEmail !== undefined) {
      profile.fromEmail = fromEmail.trim();
      profile.email = fromEmail.trim();
    } else if (email !== undefined) {
      profile.email = email.trim();
      if (!profile.fromEmail) profile.fromEmail = email.trim();
    }
    if (replyTo !== undefined) profile.replyTo = replyTo.trim();
    if (host) profile.host = host.trim();
    if (port) profile.port = Number(port);
    if (authType) profile.authType = authType;
    if (authUsername !== undefined) profile.authUsername = authUsername.trim();
    if (secure !== undefined) profile.secure = Boolean(secure);
    if (encryptionMode) profile.encryptionMode = encryptionMode;
    if (minTlsVersion) profile.minTlsVersion = minTlsVersion;
    if (customCaCertificate !== undefined) profile.customCaCertificate = customCaCertificate.trim();
    if (ignoreTlsCertificateErrors !== undefined) profile.ignoreTlsCertificateErrors = Boolean(ignoreTlsCertificateErrors);
    
    if (profile.authType === 'anonymous') {
      profile.password = '';
    } else if (password && password !== '[UNCHANGED]') {
      profile.password = password;
    }

    if (isDefault) {
      await SenderProfile.updateMany({ _id: { $ne: id } }, { isDefault: false });
      profile.isDefault = true;
    }

    await profile.save();

    await audit({
      req,
      action: 'SENDER_PROFILE_UPDATED',
      resourceType: 'SenderProfile',
      resourceId: profile._id,
      details: {
        senderName: profile.senderName,
        fromEmail: profile.fromEmail,
        host: profile.host,
        authType: profile.authType,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Sender profile updated successfully',
      data: safeProfile(profile),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a Sender Profile
export const deleteSenderProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SenderProfile.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Sender profile not found' });
    }

    await audit({
      req,
      action: 'SENDER_PROFILE_DELETED',
      resourceType: 'SenderProfile',
      resourceId: id,
      details: { senderName: deleted.senderName },
    });

    res.status(200).json({ success: true, message: 'Sender profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
