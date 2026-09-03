import dgram from 'dgram';
import net from 'net';
import AuditEvent from '../models/AuditEvent.js';
import CampaignTracking from '../models/CampaignTracking.js';
import EmailClick from '../models/EmailClick.js';
import { getSystemSettings } from './systemSettingService.js';

const leefEscape = (value) => String(value ?? '').replace(/[=|\t\n\r]/g, '_');

/**
 * Sends a syslog message over UDP
 */
function sendUdpSyslog(host, port, message) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const buffer = Buffer.from(message);
    client.send(buffer, 0, buffer.length, port, host, (err) => {
      client.close();
      if (err) return reject(err);
      resolve({ success: true, host, port, protocol: 'UDP' });
    });
  });
}

/**
 * Sends a syslog message over TCP
 */
function sendTcpSyslog(host, port, message) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);
    client.connect(port, host, () => {
      client.write(`${message}\n`, () => {
        client.end();
        resolve({ success: true, host, port, protocol: 'TCP' });
      });
    });
    client.on('error', (err) => {
      client.destroy();
      reject(err);
    });
    client.on('timeout', () => {
      client.destroy();
      reject(new Error(`TCP connection to SIEM ${host}:${port} timed out.`));
    });
  });
}

/**
 * Transmits LEEF 2.0 syslog event to remote SIEM
 */
export async function forwardToSiem(leefPayload, customSiemConfig = null) {
  try {
    let siem = customSiemConfig;
    if (!siem) {
      const settings = await getSystemSettings().catch(() => null);
      siem = settings?.siem || { enabled: false };
    }

    if (!siem.enabled && !customSiemConfig) {
      return;
    }

    const host = siem.host || siem.serverIp;
    const port = Number(siem.port || 514);
    const protocol = (siem.protocol || 'UDP').toUpperCase();

    if (!host) {
      return;
    }

    // Format RFC 3164 Syslog envelope with LEEF payload
    // Facility 16 (local0) + Severity 6 (info) = PRI 134
    const syslogPacket = `<134>1 ${new Date().toISOString()} cyphish-app - - - ${leefPayload}`;

    if (protocol === 'TCP') {
      await sendTcpSyslog(host, port, syslogPacket);
    } else {
      await sendUdpSyslog(host, port, syslogPacket);
    }
  } catch (err) {
    console.warn('[SIEM Forwarder Warning]:', err.message);
  }
}

/**
 * Main audit logger
 */
export async function audit({ req, actor, action, resourceType, resourceId = '', outcome = 'success', details = {} }) {
  try {
    const sourceIp = req?.ip || req?.headers?.['x-forwarded-for'] || '';
    const actorId = actor || req?.user?._id || null;
    const actorName = req?.user?.username || req?.user?.email || 'system';

    const event = await AuditEvent.create({
      actor: actorId,
      action,
      resourceType,
      resourceId: String(resourceId),
      outcome,
      sourceIp,
      details,
    });

    const fields = {
      action,
      resourceType,
      resourceId: String(resourceId),
      outcome,
      actor: actorName,
      src: sourceIp,
      ...details,
    };

    const leef = `LEEF:2.0|CyPhish|CyPhish|1.0|${leefEscape(action)}|${Object.entries(fields)
      .map(([key, value]) => `${key}=${leefEscape(value)}`)
      .join('\t')}`;

    if (process.env.SIEM_LEEF_STDOUT === 'true') {
      console.log(leef);
    }

    // Forward to remote SIEM IP if configured
    forwardToSiem(leef).catch(() => {});

    return { event, leef };
  } catch (error) {
    console.error('Audit event creation failed:', error.message);
    return { event: null, leef: null };
  }
}

/**
 * 180-Day Data & Audit Log Retention Purge
 */
export async function cleanupExpiredRetentionData(retentionDays = 180) {
  try {
    const days = Math.max(30, Number(retentionDays) || 180);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [auditPurged, trackingPurged, clicksPurged] = await Promise.all([
      AuditEvent.deleteMany({ createdAt: { $lt: cutoffDate } }),
      CampaignTracking.deleteMany({ createdAt: { $lt: cutoffDate } }),
      EmailClick.deleteMany({ createdAt: { $lt: cutoffDate } }),
    ]);

    console.log(`[Retention Policy]: Purged records older than ${days} days (${cutoffDate.toISOString()}): ` +
      `${auditPurged.deletedCount} audit logs, ${trackingPurged.deletedCount} simulation records, ${clicksPurged.deletedCount} click events.`);

    return {
      success: true,
      cutoffDate,
      purged: {
        auditEvents: auditPurged.deletedCount,
        campaignTracking: trackingPurged.deletedCount,
        clicks: clicksPurged.deletedCount,
      },
    };
  } catch (error) {
    console.error('[Retention Cleanup Error]:', error.message);
    return { success: false, error: error.message };
  }
}
