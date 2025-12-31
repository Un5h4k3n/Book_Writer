import { create } from "zustand";

type Theme = "dark" | "light" | "paper";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark", // Default to Dark as per plan
  setTheme: (theme) => {
    set({ theme });
    // Apply to body
    document.body.setAttribute("data-theme", theme);
  },
}));

// Initialize theme on load
const storedTheme = localStorage.getItem("app-theme") as Theme;
if (storedTheme) {
  useThemeStore.getState().setTheme(storedTheme);
}
