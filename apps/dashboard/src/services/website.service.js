import { api } from './api.js';

export const websiteService = {
  async getWebsites() {
    const res = await api.get('/websites');
    return res.data;
  },

  async getWebsite(id) {
    const res = await api.get(`/websites/${id}`);
    return res.data;
  },

  async createWebsite(data) {
    const res = await api.post('/websites', data);
    return res.data;
  },

  async updateWebsite(id, data) {
    const res = await api.patch(`/websites/${id}`, data);
    return res.data;
  },

  async deleteWebsite(id) {
    const res = await api.delete(`/websites/${id}`);
    return res;
  },

  async regenerateKey(id) {
    const res = await api.post(`/websites/${id}/regenerate-key`);
    return res.data;
  },

  async verifyInstallation(id) {
    const res = await api.get(`/websites/${id}/verify`);
    return res.data;
  }
};
