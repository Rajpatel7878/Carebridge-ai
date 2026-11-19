import { AuthProvider } from '@/contexts/AuthContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppRouter } from '@/routes/AppRouter';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DemoProvider>
          <AppRouter />
        </DemoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
