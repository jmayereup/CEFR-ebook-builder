/**
 * useDarkMode — manages dark/light theme preference.
 *
 * Reads the initial state from localStorage on mount, writes back on toggle,
 * and keeps the `dark` class on `document.documentElement` in sync.
 */

import { useEffect, useState } from 'react';

export interface UseDarkModeReturn {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useDarkMode = (): UseDarkModeReturn => {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  return { darkMode, toggleDarkMode };
};
