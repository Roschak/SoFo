import { AuthScreen } from './features/auth/AuthScreen';
import { ChatShell } from './features/app/ChatShell';
import { AuthProvider, useAuth } from './state/AuthContext';
import { WorkspaceProvider } from './state/WorkspaceContext';

function Gate() {
  const { session } = useAuth();
  if (!session) {
    return <AuthScreen />;
  }
  return (
    <WorkspaceProvider>
      <ChatShell />
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
