"use client";

import {
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { NotificationRecord } from "@/lib/types";

interface NotificationListProps {
  notifications: NotificationRecord[];
}

const statusColor: Record<NotificationRecord["status"], "default" | "success" | "error" | "warning"> = {
  pending: "warning",
  sent: "success",
  failed: "error"
};

export default function NotificationList({ notifications }: NotificationListProps) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, minHeight: 320 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" fontWeight={700}>
          Notifications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generated from matching rules
        </Typography>
      </Stack>

      <List sx={{ mt: 1 }}>
        {notifications.length === 0 ? (
          <ListItem>
            <ListItemText primary="No notifications yet" secondary="Check rules and event pipeline" />
          </ListItem>
        ) : (
          notifications.map((notification) => (
            <ListItem key={notification._id} divider>
              <ListItemText
                primary={notification.message}
                secondary={`${notification.ruleId?.name || "unknown rule"} · ${new Date(
                  notification.createdAt
                ).toLocaleString()}`}
              />
              <Chip size="small" color={statusColor[notification.status]} label={notification.status} />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
}
