// lib/agent/tools/find-craftsman.ts

import { adminSupabase } from "@/lib/supabase/admin";
import {
  AgentState,
  AgentStep,
  SelectedCraftsman,
  DamageCategory,
} from "@/lib/agents/state";

// ─── Mapping: DamageCategory → Spezialisierungs-Keywords ─────────────────────
//
// Die craftsmen-Tabelle hat ein `specializations: text[]` Feld.
// Dieses Mapping übersetzt die Agent-Kategorie in die passenden Keywords.

const CATEGORY_TO_SPECIALIZATIONS: Record<DamageCategory, string[]> = {
  plumbing:    ["plumbing", "sanitär", "wasser", "rohre"],
  electrical:  ["electrical", "elektro", "strom"],
  heating:     ["heating", "heizung", "boiler", "hvac"],
  structural:  ["structural", "bau", "maurer", "dach", "fenster"],
  appliance:   ["appliance", "geräte", "haushaltsgeräte"],
  pest:        ["pest", "schädlinge", "schimmel", "desinfektion"],
  other:       [],  // fallback: alle aktiven Handwerker
};

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function findCraftsmanNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  if (!state.category) {
    throw new Error("[find-craftsman] category fehlt im State — classify muss zuerst laufen");
  }

  const keywords = CATEGORY_TO_SPECIALIZATIONS[state.category];

  // 1. Passende Handwerker suchen
  let craftsman = await queryCraftsman(keywords);

  // 2. Fallback: wenn keine Spezialisierung passt → beliebigen aktiven Handwerker
  if (!craftsman && keywords.length > 0) {
    console.warn(
      `[find-craftsman] Kein Handwerker für category=${state.category}, versuche Fallback`
    );
    craftsman = await queryCraftsman([]);
  }

  if (!craftsman) {
    throw new Error(
      `[find-craftsman] Kein verfügbarer Handwerker gefunden für category=${state.category}`
    );
  }

  const selectedCraftsman: SelectedCraftsman = {
    id: craftsman.id,
    name: craftsman.contact_name ?? craftsman.company_name ?? "Unbekannt",
    company: craftsman.company_name ?? null,
    phone: craftsman.phone ?? null,
    email: craftsman.email ?? null,
    specializations: (craftsman.specializations as string[]) ?? [],
  };

  // 3. Schritt loggen
  const step: AgentStep = {
    tool: "find_craftsman",
    input: {
      category: state.category,
      keywords,
    },
    output: {
      craftsmanId: selectedCraftsman.id,
      craftsmanName: selectedCraftsman.name,
      company: selectedCraftsman.company,
      specializations: selectedCraftsman.specializations,
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[find-craftsman] category=${state.category} → ${selectedCraftsman.name} (${selectedCraftsman.company ?? "kein Unternehmen"})`
  );

  return {
    selectedCraftsman,
    steps: [step],
  };
}

// ─── Hilfsfunktion ────────────────────────────────────────────────────────────

/**
 * Sucht einen aktiven Handwerker dessen specializations[] mindestens
 * ein Keyword aus der Liste enthält.
 * Bei leerer Keywords-Liste → erster aktiver Handwerker (Fallback).
 */
async function queryCraftsman(keywords: string[]) {
  if (keywords.length === 0) {
    // Fallback: einfach den ersten aktiven Handwerker nehmen
    const { data, error } = await adminSupabase
      .from("craftsmen")
      .select("id, contact_name, company_name, phone, email, specializations")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`craftsmen Query fehlgeschlagen: ${error.message}`);
    return data;
  }

  // Supabase overlaps-Operator: specializations && ARRAY['plumbing','sanitär',...]
  // Gibt Handwerker zurück deren specializations[] mindestens einen Treffer hat
  const { data, error } = await adminSupabase
    .from("craftsmen")
    .select("id, contact_name, company_name, phone, email, specializations")
    .eq("is_active", true)
    .overlaps("specializations", keywords)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`craftsmen Query fehlgeschlagen: ${error.message}`);
  return data;
}