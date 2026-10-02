import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebsiteProvider } from './context/WebsiteContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebsiteProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </WebsiteProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
