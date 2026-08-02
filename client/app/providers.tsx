"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider } from "@/hooks/useAuth";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f4a78"
    },
    secondary: {
      main: "#1c8d5b"
    },
    background: {
      default: "#f5f7fb"
    }
  },
  shape: {
    borderRadius: 10
  },
  typography: {
    fontFamily: "'Manrope', 'Segoe UI', sans-serif"
  }
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
