import { api } from './api.js';

export const analyticsService = {
  async getOverview(websiteId, range = '7d') {
    const res = await api.get(`/analytics/overview?websiteId=${websiteId}&range=${range}`);
    return res.data;
  },

  async getTraffic(websiteId, range = '7d') {
    const res = await api.get(`/analytics/traffic?websiteId=${websiteId}&range=${range}`);
    return res.data;
  },

  async getGeography(websiteId) {
    const res = await api.get(`/analytics/geography?websiteId=${websiteId}`);
    return res.data;
  },

  async getTechnology(websiteId) {
    const res = await api.get(`/analytics/technology?websiteId=${websiteId}`);
    return res.data;
  },

  async getAcquisition(websiteId) {
    const res = await api.get(`/analytics/acquisition?websiteId=${websiteId}`);
    return res.data;
  },

  async getPages(websiteId) {
    const res = await api.get(`/analytics/pages?websiteId=${websiteId}`);
    return res.data;
  },

  async getEvents(websiteId) {
    const res = await api.get(`/analytics/events?websiteId=${websiteId}`);
    return res.data;
  },

  async exportCsv(websiteId, type = 'traffic') {
    return api.get(`/analytics/export?websiteId=${websiteId}&type=${type}`);
  },

  // Visitors
  async getLiveVisitors(websiteId) {
    const res = await api.get(`/visitors/live?websiteId=${websiteId}`);
    return res.data;
  },

  async getVisitorHistory(websiteId, params = {}) {
    const qs = new URLSearchParams({ websiteId, ...params }).toString();
    const res = await api.get(`/visitors/history?${qs}`);
    return res.data;
  },

  async getVisitorDetail(websiteId, visitorId) {
    const res = await api.get(`/visitors/${visitorId}?websiteId=${websiteId}`);
    return res.data;
  }
};
