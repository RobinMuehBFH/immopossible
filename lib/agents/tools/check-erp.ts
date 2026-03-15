// lib/agent/tools/check-erp.ts

import { adminSupabase } from "@/lib/supabase/admin";
import { AgentState, ErpContext, AgentStep, NotificationChannel } from "@/lib/agent/state";

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function checkErpNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  // 1. damage_report laden — brauchen property_id und tenant_id
  const { data: report, error: reportError } = await adminSupabase
    .from("damage_reports")
    .select("id, property_id, tenant_id, channel")
    .eq("id", state.reportId)
    .single();

  if (reportError || !report) {
    throw new Error(`damage_report nicht gefunden: ${state.reportId}`);
  }

  // 2. Property laden
  const { data: property, error: propertyError } = await adminSupabase
    .from("properties")
    .select("id, address, name")
    .eq("id", report.property_id)
    .single();

  if (propertyError || !property) {
    throw new Error(`Property nicht gefunden: ${report.property_id}`);
  }

  // 3. Tenant-Profil laden
  const { data: tenantProfile, error: tenantError } = await adminSupabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", report.tenant_id)
    .single();

  if (tenantError || !tenantProfile) {
    throw new Error(`Tenant-Profil nicht gefunden: ${report.tenant_id}`);
  }

  // 4. Mieter-Property Junction laden (Unit-Nummer)
  const { data: tenantProperty } = await adminSupabase
    .from("tenants_properties")
    .select("unit, contract_start, contract_end")
    .eq("tenant_id", report.tenant_id)
    .eq("property_id", report.property_id)
    .maybeSingle();

  // 5. ERP Mock Daten laden (zusätzlicher Kontext)
  const { data: erpData } = await adminSupabase
    .from("erp_mock_data")
    .select("data")
    .eq("property_id", report.property_id)
    .maybeSingle();

  // 6. Bevorzugten Notification-Kanal aus dem Intake-Channel ableiten
  const tenantChannel = deriveNotificationChannel(report.channel);

  // 7. ErpContext zusammenbauen
  const erpContext: ErpContext = {
    propertyId: property.id,
    propertyAddress: property.address,
    propertyUnit: tenantProperty?.unit ?? null,
    tenantId: tenantProfile.id,
    tenantName: tenantProfile.full_name,
    tenantEmail: tenantProfile.email ?? null,
    tenantPhone: tenantProfile.phone ?? null,
    tenantChannel,
    contractStart: tenantProperty?.contract_start ?? null,
    contractEnd: tenantProperty?.contract_end ?? null,
    additionalData: erpData?.data ?? {},
  };

  // 8. Schritt loggen
  const step: AgentStep = {
    tool: "check_erp_mock",
    input: { reportId: state.reportId },
    output: {
      propertyAddress: erpContext.propertyAddress,
      propertyUnit: erpContext.propertyUnit,
      tenantName: erpContext.tenantName,
      tenantChannel: erpContext.tenantChannel,
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[check-erp] property=${erpContext.propertyAddress}, tenant=${erpContext.tenantName}, channel=${erpContext.tenantChannel}`
  );

  return {
    erpContext,
    steps: [step],
  };
}

// ─── Hilfsfunktion ────────────────────────────────────────────────────────────

/**
 * Leitet den bevorzugten Rückkanal aus dem Intake-Channel ab.
 * Wer per WhatsApp meldet, bekommt Antworten per WhatsApp — nicht per Email.
 */
function deriveNotificationChannel(channel: string): NotificationChannel {
  switch (channel) {
    case "whatsapp": return "whatsapp";
    case "email":    return "email";
    default:         return "in_app";   // web_form → in_app Notification
  }
}