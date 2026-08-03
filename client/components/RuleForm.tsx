"use client";

import {
  Alert,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";
import { saveRule } from "@/lib/api";
import { RuleDraft, RuleRecord } from "@/lib/types";

interface RuleFormProps {
  onCreated: (rule: RuleRecord) => void;
}

const initialDraft: RuleDraft = {
  name: "",
  eventType: "payment_received",
  minAmount: "",
  accountId: "",
  enabled: true
};

export default function RuleForm({ onCreated }: RuleFormProps) {
  const [draft, setDraft] = useState<RuleDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [minAmountError, setMinAmountError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (field: keyof RuleDraft, value: string | boolean) => {
    setMinAmountError(null);
    setApiError(null);
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (draft.minAmount !== undefined && draft.minAmount !== "") {
      const parsed = Number(draft.minAmount);
      if (isNaN(parsed) || parsed < 0) {
        setMinAmountError("Minimum amount must be a positive number.");
        return;
      }
    }

    setSaving(true);

    try {
      const created = await saveRule({
        name: draft.name,
        eventType: draft.eventType,
        // || not ?? — we want empty string "" to become undefined (omitted from payload).
        // ?? would pass "" through, which the server coerces to 0 (Number("") === 0),
        // making minAmount=0 match every event.
        minAmount: draft.minAmount || undefined,
        accountId: draft.accountId || undefined,
        enabled: draft.enabled
      });

      onCreated(created);
      setDraft(initialDraft);
      setSuccessMessage(`Rule "${created.name}" created successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error("[RuleForm] failed to save rule", err);
      setApiError(err instanceof Error ? err.message : "Failed to save rule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Create Rule
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Rules are evaluated against incoming events.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={1.5}>
            <TextField
              label="Name"
              required
              value={draft.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel id="event-type-label">Event type</InputLabel>
              <Select
                labelId="event-type-label"
                label="Event type"
                value={draft.eventType}
                onChange={(e) => handleChange("eventType", e.target.value)}
              >
                <MenuItem value="payment_received">payment_received</MenuItem>
                <MenuItem value="overdue">overdue</MenuItem>
                <MenuItem value="dispute_raised">dispute_raised</MenuItem>
                <MenuItem value="invoice_created">invoice_created</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Minimum amount"
              placeholder="1000"
              type="number"
              inputProps={{ min: 0 }}
              value={draft.minAmount}
              onChange={(e) => handleChange("minAmount", e.target.value)}
              error={!!minAmountError}
              helperText={minAmountError ?? undefined}
            />

            <TextField
              label="Account id (optional)"
              placeholder="acc_1002"
              value={draft.accountId}
              onChange={(e) => handleChange("accountId", e.target.value)}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={draft.enabled}
                  onChange={(e) => handleChange("enabled", e.target.checked)}
                />
              }
              label="Enabled"
            />

            {apiError && <Alert severity="error">{apiError}</Alert>}
            {successMessage && <Alert severity="success">{successMessage}</Alert>}

            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : "Save rule"}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}
