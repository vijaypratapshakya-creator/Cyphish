import axiosInstance from './axiosInstance';

export async function getSystemSettings() {
  const response = await axiosInstance.get('/api/system/settings');
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
