import { useEffect, useState } from 'react';
import { AuthScreen } from './features/auth/AuthScreen';
import { LandingPage } from './features/landing/LandingPage';
import { ChatShell } from './features/app/ChatShell';
import { AuthProvider, useAuth } from './state/AuthContext';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { MeetingProvider } from './state/MeetingContext';
import { NotificationProvider } from './state/NotificationContext';

function Gate() {
  const { session } = useAuth();
  const [showLanding, setShowLanding] = useState(() => !session);

  // Returning users go straight to the app; logged-out visitors see the
  // landing page first and can enter via any CTA (hash #mulai / #masuk).
  useEffect(() => {
    if (session) {
      setShowLanding(false);
      return;
    }
    const enter = () => setShowLanding(false);
    window.addEventListener('hashchange', enter);
    if (['#mulai', '#masuk'].includes(window.location.hash)) {
      setShowLanding(false);
    }
    return () => window.removeEventListener('hashchange', enter);
  }, [session]);

  if (session) {
    return (
      <WorkspaceProvider>
        <NotificationProvider>
          <MeetingProvider>
            <ChatShell />
          </MeetingProvider>
        </NotificationProvider>
      </WorkspaceProvider>
    );
  }

  if (showLanding) {
    return <LandingPage />;
  }

  return <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
