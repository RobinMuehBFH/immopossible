// lib/agent/tools/classify.ts

import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  AgentState,
  DamageCategory,
  PriorityLevel,
  AgentStep,
} from "@/lib/agents/state";

// ─── LLM Output Schema (strukturierte Antwort via tool_use) ──────────────────

const ClassifyOutputSchema = z.object({
  category: z.enum([
    "plumbing",
    "electrical",
    "heating",
    "structural",
    "appliance",
    "pest_control",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  summary: z.string().describe("1-2 Sätze: was ist kaputt, wo, wie schlimm"),
  reasoning: z.string().describe("Kurze Begründung für Kategorie und Priorität"),
});

type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

// ─── LLM Instanz ─────────────────────────────────────────────────────────────

const llm = new ChatAnthropic({
  model: "claude-opus-4-5",
  temperature: 0,             // deterministisch — Klassifizierung braucht keine Kreativität
}).withStructuredOutput(ClassifyOutputSchema, {
  name: "classify_damage_report",
});

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(title: string, description: string, location: string | null): string {
  return `Du bist ein erfahrener Liegenschaftsverwalter in der Schweiz.
Analysiere diesen Schadensbericht und klassifiziere ihn.

TITEL: ${title}
BESCHREIBUNG: ${description}${location ? `\nORT IM GEBÄUDE: ${location}` : ""}

KATEGORIE-DEFINITIONEN:
- plumbing: Wasserschäden, Rohre, Leitungen, Sanitär, Verstopfungen, Lecks
- electrical: Strom, Schalter, Steckdosen, Sicherungen, Beleuchtung
- heating: Heizung, Boiler, Heizkörper, Warmwasser
- structural: Risse, Mauerwerk, Dach, Fenster, Türen, Böden, Wände
- appliance: Einbaugeräte (Herd, Kühlschrank, Geschirrspüler, Waschmaschine)
- pest_control: Schimmel, Ungeziefer, Mäuse, Insekten
- other: alles andere

PRIORITÄT-DEFINITIONEN:
- urgent: Sofortige Gefahr für Personen oder massive Folgeschäden (Wassereinbruch, Stromausfall, kein Heizung im Winter)
- high: Muss innerhalb 48h behoben werden (starkes Leck, Heizungsausfall, Sicherheitsrisiko)
- medium: Innerhalb einer Woche beheben (kleinere Lecks, defekte Geräte, eingeschränkte Nutzung)
- low: Kann warten, kein Sicherheitsrisiko (kosmetische Schäden, kleine Defekte)`;
}

// ─── Node-Funktion (wird in graph.ts als Node registriert) ───────────────────

export async function classifyNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  // 1. Schadensbericht aus DB laden
  const { data: report, error } = await adminSupabase
    .from("damage_reports")
    .select("id, title, description, location_in_property, channel")
    .eq("id", state.reportId)
    .single();

  if (error || !report) {
    throw new Error(`damage_report nicht gefunden: ${state.reportId} — ${error?.message}`);
  }

  // 2. LLM klassifizieren lassen
  const prompt = buildPrompt(
    report.title,
    report.description ?? "",
    report.location_in_property ?? null
  );

  let result: ClassifyOutput;
  try {
    result = await llm.invoke(prompt);
  } catch (err) {
    throw new Error(`LLM-Klassifizierung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Schritt für Logging aufzeichnen
  const step: AgentStep = {
    tool: "classify_damage_report",
    input: {
      reportId: state.reportId,
      title: report.title,
      description: report.description,
    },
    output: {
      category: result.category,
      priority: result.priority,
      summary: result.summary,
      reasoning: result.reasoning,
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[classify] reportId=${state.reportId} → category=${result.category}, priority=${result.priority}`
  );

  // 4. Kategorie und Priorität in damage_reports zurückschreiben
  await adminSupabase
    .from("damage_reports")
    .update({ priority: result.priority, damage_category: result.category })
    .eq("id", state.reportId);

  // 5. State zurückgeben — nur die Felder die dieses Tool setzt
  return {
    category: result.category as DamageCategory,
    priority: result.priority as PriorityLevel,
    damageSummary: result.summary,
    steps: [step],
  };
}