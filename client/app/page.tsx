"use client";

import { Box, CircularProgress, Grid, IconButton, Paper, Stack, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useCallback, useEffect, useState } from "react";
import EventList from "@/components/EventList";
import LoginCard from "@/components/LoginCard";
import NotificationList from "@/components/NotificationList";
import RuleForm from "@/components/RuleForm";
import { fetchEvents, fetchNotifications, fetchRules } from "@/lib/api";
import { AuthError } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { EventRecord, NotificationRecord, RuleRecord } from "@/lib/types";

export default function HomePage() {
  const { authenticated, login, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [rules, setRules] = useState<RuleRecord[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const [nextEvents, nextNotifications, nextRules] = await Promise.all([
        fetchEvents(),
        fetchNotifications(),
        fetchRules()
      ]);

      setEvents(nextEvents);
      setNotifications(nextNotifications);
      setRules(nextRules);
    } catch (error) {
      if (error instanceof AuthError) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    refresh();
  }, [authenticated, refresh]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const timer = window.setInterval(() => {
      refresh();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [authenticated, refresh]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    await refresh();
  };

  if (!authenticated) {
    return <LoginCard onLogin={handleLogin} />;
  }

  if (loading && events.length === 0 && notifications.length === 0) {
    return (
      <Box sx={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack spacing={2.5}>
        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Webhook Notifications Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {events.length} events · {notifications.length} notifications · {rules.length} rules
              </Typography>
            </Box>
            <IconButton onClick={() => refresh()}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <RuleForm onCreated={(rule) => setRules((current) => [rule, ...current])} />
          </Grid>
          <Grid item xs={12} md={4}>
            <EventList events={events} />
          </Grid>
          <Grid item xs={12} md={4}>
            <NotificationList notifications={notifications} />
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
