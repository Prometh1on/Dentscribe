import { SessionProvider } from '../components/auth/SessionContext';
import { AuthGate } from '../components/auth/AuthGate';

export default function Home() {
  return (
    <SessionProvider>
      <AuthGate />
    </SessionProvider>
  );
}
