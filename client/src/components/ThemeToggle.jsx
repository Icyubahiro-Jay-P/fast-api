import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// index.html sets the initial class before paint; this just reads it back.
const current = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export default function ThemeToggle() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // storage blocked: theme still works for this visit
    }
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
