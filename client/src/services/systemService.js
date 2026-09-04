import axiosInstance from './axiosInstance';

export async function getSystemSettings() {
  const response = await axiosInstance.get('/api/system/settings');
  return response.data;
}

export async function getLandingConfig() {
  const response = await axiosInstance.get('/api/system/landing-config');
  return response.data;
}

export async function updateSystemSettings(data) {
  const response = await axiosInstance.put('/api/system/settings', data);
  return response.data;
}

export async function sendTestReport(payload) {
  const response = await axiosInstance.post('/api/system/reports/test', payload);
  return response.data;
}

export async function testSiemForwarding(payload) {
  const response = await axiosInstance.post('/api/system/siem/test', payload);
  return response.data;
}

export async function triggerRetentionCleanup() {
  const response = await axiosInstance.post('/api/system/retention/cleanup');
  return response.data;
}

export async function getSystemStats() {
  const response = await axiosInstance.get('/api/system/stats');
  return response.data;
}

export async function testLdapConnection(ldapConfig) {
  const response = await axiosInstance.post('/api/directory/test-connection', ldapConfig);
  return response.data;
}

export async function searchDirectoryUsers(params) {
  const response = await axiosInstance.get('/api/directory/users', { params });
  return response.data;
}

export async function getSenderProfiles() {
  const response = await axiosInstance.get('/api/sender-profile');
  return response.data;
}

// User & Delegated RBAC Management
export async function getUsers() {
  const response = await axiosInstance.get('/api/users');
  return response.data;
}

export async function createUser(userData) {
  const response = await axiosInstance.post('/api/users', userData);
  return response.data;
}

export async function updateUser(id, userData) {
  const response = await axiosInstance.put(`/api/users/${id}`, userData);
  return response.data;
}

export async function toggleLockUser(id) {
  const response = await axiosInstance.patch(`/api/users/${id}/toggle-lock`);
  return response.data;
}

export async function deleteUser(id) {
  const response = await axiosInstance.delete(`/api/users/${id}`);
  return response.data;
}

export async function triggerDirectorySyncNow() {
  const response = await axiosInstance.post('/api/directory/sync-now');
  return response.data;
}
