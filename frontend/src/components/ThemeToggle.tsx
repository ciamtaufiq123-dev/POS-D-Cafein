import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'terang' : 'gelap';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Aktifkan mode ${nextTheme}`}
      aria-pressed={theme === 'dark'}
      title={`Aktifkan mode ${nextTheme}`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container cursor-pointer ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};
