"use client";

import {
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { EventRecord } from "@/lib/types";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

interface EventListProps {
  events: EventRecord[];
}

export default function EventList({ events }: EventListProps) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, minHeight: 320 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" fontWeight={700}>
          Incoming Events
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Latest webhook payloads
        </Typography>
      </Stack>

      <List sx={{ mt: 1 }}>
        {events.length === 0 ? (
          <ListItem>
            <ListItemText primary="No events yet" secondary="Run simulator to generate events" />
          </ListItem>
        ) : (
          events.map((event) => (
            <ListItem key={event._id} divider>
              <ListItemText
                primary={`${event.type} · ${formatMoney(event.amount, event.currency)}`}
                secondary={`${event.accountId} · ${new Date(event.createdAt).toLocaleString()}`}
              />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
}
