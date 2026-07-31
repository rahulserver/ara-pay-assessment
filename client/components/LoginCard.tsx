"use client";

import { Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

interface LoginCardProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginCard({ onLogin }: LoginCardProps) {
  const [email, setEmail] = useState("owner@ara-research.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 480, mx: "auto", mt: 8 }}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Sign in to Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the seeded account credentials from the README.
          </Typography>

          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />

          {error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : null}

          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
