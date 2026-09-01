import AuditEvent from '../models/AuditEvent.js';

const leefEscape = (value) => String(value ?? '').replace(/[=|\t\n\r]/g, '_');

export async function audit({ req, actor, action, resourceType, resourceId = '', outcome = 'success', details = {} }) {
  const event = await AuditEvent.create({ actor: actor || req?.user?._id || null, action, resourceType, resourceId: String(resourceId), outcome, sourceIp: req?.ip || '', details });
  const fields = { action, resourceType, resourceId, outcome, actor: event.actor || '', sourceIp: event.sourceIp, ...details };
  const leef = `LEEF:2.0|CyPhish|CyPhish|1.0|${leefEscape(action)}|${Object.entries(fields).map(([key, value]) => `${key}=${leefEscape(value)}`).join('\t')}`;
  if (process.env.SIEM_LEEF_STDOUT === 'true') console.log(leef);
  return { event, leef };
}
