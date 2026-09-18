import { AuthScreen } from './features/auth/AuthScreen';
import { ChatShell } from './features/app/ChatShell';
import { AuthProvider, useAuth } from './state/AuthContext';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { MeetingProvider } from './state/MeetingContext';

function Gate() {
  const { session } = useAuth();
  if (!session) {
    return <AuthScreen />;
  }
  return (
    <WorkspaceProvider>
      <MeetingProvider>
        <ChatShell />
      </MeetingProvider>
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
