import { es } from '../i18n/es';
import { LockIcon } from './components/icons';

export function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-5xl font-black tracking-tight">{es.app.name}</h1>
      <p className="text-xl opacity-90">{es.app.tagline}</p>
      <p className="max-w-sm text-sm opacity-70">{es.app.comingSoon}</p>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <LockIcon />
        {es.app.privacy}
      </p>
      <footer className="mt-8 text-xs opacity-60">{es.app.disclaimer}</footer>
    </main>
  );
}
