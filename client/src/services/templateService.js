import axiosInstance from './axiosInstance';

/**
 * Replace placeholders in template HTML with target variables
 */
export const renderTemplate = (html, data = {}) => {
  if (!html) return '';
  return html.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (match, key) => {
    const cleanKey = key.startsWith('.') ? key.slice(1) : key;
    return (
      data[key] ??
      data[cleanKey] ??
      data[cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1)] ??
      match
    );
  });
};

export const getTemplates = async () => {
  const response = await axiosInstance.get('/api/template');
  return response.data;
};

export const getTemplateById = async (id) => {
  const response = await axiosInstance.get(`/api/template/${id}`);
  return response.data;
};

export const createTemplate = async (templateData) => {
  const response = await axiosInstance.post('/api/template', templateData);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await axiosInstance.put(`/api/template/${id}`, templateData);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await axiosInstance.delete(`/api/template/${id}`);
  return response.data;
};

export const generateAITemplate = async (payload) => {
  const response = await axiosInstance.post('/api/template/ai-generate', payload);
  return response.data;
};

export const getAIIntegration = async () => {
  const response = await axiosInstance.get('/api/integrations/ai');
  return response.data;
};

const templateService = {
  renderTemplate,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generateAITemplate,
  getAIIntegration,
};

export default templateService;
