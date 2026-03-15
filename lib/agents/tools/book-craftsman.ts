// lib/agent/tools/book-craftsman.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { AgentState, AgentStep } from "@/lib/agents/state";

// ─── Hilfsfunktion: frühestmöglichen Termin berechnen ────────────────────────

function calculateScheduledDate(priority: string | null): string {
  const now = new Date();

  switch (priority) {
    case "urgent":
      // Sofort — nächste volle Stunde
      now.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    case "high":
      // Innerhalb 48h — übermorgen 8:00
      now.setDate(now.getDate() + 2);
      now.setHours(8, 0, 0, 0);
      break;
    case "medium":
      // Innerhalb einer Woche — in 5 Werktagen 8:00
      now.setDate(now.getDate() + 5);
      now.setHours(8, 0, 0, 0);
      break;
    case "low":
    default:
      // Kann warten — in 14 Tagen 8:00
      now.setDate(now.getDate() + 14);
      now.setHours(8, 0, 0, 0);
      break;
  }

  return now.toISOString();
}

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function bookCraftsmanNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  // Guard: wenn Genehmigung nötig war, muss sie approved sein
  if (state.approvalRequired && state.approvalStatus !== "approved") {
    throw new Error(
      `[book-craftsman] Buchung nicht erlaubt — approvalStatus=${state.approvalStatus}`
    );
  }

  if (!state.selectedCraftsman || !state.erpContext) {
    throw new Error(
      "[book-craftsman] selectedCraftsman / erpContext fehlen im State"
    );
  }

  const scheduledAt = calculateScheduledDate(state.priority);
  // Extract just the date part (YYYY-MM-DD) for the DATE column
  const scheduledDate = scheduledAt.split("T")[0];

  // Buchungsnotiz zusammenstellen
  const notes = [
    state.damageSummary,
    state.erpContext.propertyUnit
      ? `Einheit: ${state.erpContext.propertyUnit}`
      : null,
    state.approvalNotes
      ? `Notiz vom Verwalter: ${state.approvalNotes}`
      : null,
  ]
    .filter(Boolean)
    .join(" — ");

  // 1. bookings INSERT
  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .insert({
      damage_report_id: state.reportId,
      craftsman_id: state.selectedCraftsman.id,
      scheduled_date: scheduledDate,
      status: "scheduled",
      notes,
    })
    .select("id")
    .single();

  if (error || !booking) {
    throw new Error(`bookings INSERT fehlgeschlagen: ${error?.message}`);
  }

  // 2. damage_report Status aktualisieren
  await adminSupabase
    .from("damage_reports")
    .update({ status: "booked" })
    .eq("id", state.reportId);

  // 3. Schritt loggen
  const step: AgentStep = {
    tool: "book_craftsman",
    input: {
      craftsmanId: state.selectedCraftsman.id,
      propertyId: state.erpContext.propertyId,
      priority: state.priority,
    },
    output: {
      bookingId: booking.id,
      scheduledAt,
      estimatedCostChf: state.estimatedCostChf,
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[book-craftsman] Buchung erstellt: ${booking.id} — ${state.selectedCraftsman.name} am ${scheduledAt}`
  );

  return {
    bookingId: booking.id,
    steps: [step],
  };
}