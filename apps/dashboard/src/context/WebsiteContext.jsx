import React, { createContext, useContext, useState, useEffect } from 'react';
import { websiteService } from '../services/website.service.js';
import { socketService } from '../services/socket.service.js';
import { useAuth } from './AuthContext.jsx';
import { SOCKET_EVENTS } from '@livetrack/shared';

const WebsiteContext = createContext(null);

export function WebsiteProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [websites, setWebsites] = useState([]);
  const [currentWebsite, setCurrentWebsite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch user's registered websites
  const fetchWebsites = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const list = await websiteService.getWebsites();
      setWebsites(list);

      // Select previously chosen or first website
      const savedId = localStorage.getItem('livetrack_current_site');
      const found = list.find(w => w.publicId === savedId) || list[0] || null;
      setCurrentWebsite(found);
      if (found) {
        setLiveCount(found.activeVisitors || 0);
      }
    } catch (err) {
      console.error('Failed to load websites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, [isAuthenticated]);

  // Join Socket.IO website room whenever currentWebsite changes
  useEffect(() => {
    if (!currentWebsite) return;
    localStorage.setItem('livetrack_current_site', currentWebsite.publicId);
    socketService.joinWebsite(currentWebsite.publicId);

    const socket = socketService.getSocket();
    if (socket) {
      setSocketConnected(socket.connected);
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, [currentWebsite]);

  // Listen to real-time visitor count updates
  useEffect(() => {
    if (!currentWebsite) return;

    const unsubs = [
      socketService.on(SOCKET_EVENTS.VISITOR_NEW, () => {
        setLiveCount(prev => prev + 1);
      }),
      socketService.on(SOCKET_EVENTS.VISITOR_OFFLINE, () => {
        setLiveCount(prev => Math.max(0, prev - 1));
      }),
      socketService.on(SOCKET_EVENTS.ANALYTICS_UPDATE, (data) => {
        if (data.activeVisitors !== undefined) {
          setLiveCount(data.activeVisitors);
        }
      })
    ];

    return () => {
      unsubs.forEach(u => u && u());
    };
  }, [currentWebsite]);

  const selectWebsite = (site) => {
    if (currentWebsite) {
      socketService.leaveWebsite(currentWebsite.publicId);
    }
    setCurrentWebsite(site);
    setLiveCount(site.activeVisitors || 0);
  };

  return (
    <WebsiteContext.Provider value={{
      websites,
      currentWebsite,
      selectWebsite,
      fetchWebsites,
      loading,
      liveCount,
      socketConnected
    }}>
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (!context) throw new Error('useWebsite must be used within a WebsiteProvider');
  return context;
}
