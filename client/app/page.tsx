"use client";

import {
  Box,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material";
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
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [rules, setRules] = useState<RuleRecord[]>([]);

  const refresh = useCallback(async () => {
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
      setInitialLoadDone(true);
    }
  }, [logout]);

  useEffect(() => {
    if (!authenticated) {
      setInitialLoadDone(false);
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

  if (!initialLoadDone) {
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
                {events.length} events · {notifications.length} notifications ·{" "}
                <Tooltip
                  arrow
                  title={
                    rules.length === 0 ? (
                      <Typography variant="caption" sx={{ p: 1, display: "block" }}>
                        No rules configured yet
                      </Typography>
                    ) : (
                      <Table size="small" sx={{ minWidth: 340 }}>
                        <TableHead>
                          <TableRow>
                            {["Name", "Event type", "Min $", "Account", "On"].map((h) => (
                              <TableCell
                                key={h}
                                sx={{
                                  color: "text.secondary",
                                  fontSize: 11,
                                  py: 0.5,
                                  px: 1,
                                  whiteSpace: "nowrap",
                                  fontWeight: 600
                                }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rules.map((r) => (
                            <TableRow key={r._id}>
                              <TableCell sx={{ fontSize: 12, py: 0.5, px: 1 }}>{r.name}</TableCell>
                              <TableCell sx={{ fontSize: 12, py: 0.5, px: 1 }}>
                                {r.conditions.eventType ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, py: 0.5, px: 1 }}>
                                {r.conditions.minAmount ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, py: 0.5, px: 1 }}>
                                {r.conditions.accountId ?? "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12, py: 0.5, px: 1 }}>
                                {r.enabled ? "✓" : "✗"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )
                  }
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: "background.paper",
                        color: "text.primary",
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: 3,
                        p: 1.5,
                        maxWidth: 480
                      }
                    },
                    arrow: { sx: { color: "background.paper" } }
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      cursor: "default",
                      borderBottom: "1px dashed",
                      borderColor: "text.secondary"
                    }}
                  >
                    {rules.length} rule{rules.length !== 1 ? "s" : ""}
                  </Box>
                </Tooltip>
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
