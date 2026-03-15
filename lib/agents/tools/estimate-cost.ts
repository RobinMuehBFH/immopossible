// lib/agent/tools/estimate-cost.ts

import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import {
  AgentState,
  AgentStep,
  APPROVAL_THRESHOLD_CHF,
} from "@/lib/agents/state";

// ─── LLM Output Schema ────────────────────────────────────────────────────────

const EstimateCostOutputSchema = z.object({
  estimatedCostChf: z
    .number()
    .positive()
    .describe("Geschätzte Kosten in CHF als Zahl, z.B. 350"),
  reasoning: z
    .string()
    .describe("2-3 Sätze: Warum diese Schätzung, was ist inbegriffen"),
  costBreakdown: z
    .array(
      z.object({
        position: z.string(),
        amountChf: z.number(),
      })
    )
    .describe("Aufschlüsselung der Kostenpositionen"),
});

type EstimateCostOutput = z.infer<typeof EstimateCostOutputSchema>;

// ─── LLM Instanz ─────────────────────────────────────────────────────────────

const llm = new ChatAnthropic({
  model: "claude-opus-4-5",
  temperature: 0,
}).withStructuredOutput(EstimateCostOutputSchema, {
  name: "estimate_cost",
});

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(state: AgentState): string {
  const craftsmanInfo = state.selectedCraftsman
    ? `Handwerker: ${state.selectedCraftsman.name} (${state.selectedCraftsman.specializations.join(", ")})${
        state.selectedCraftsman.hourlyRateChf
          ? ` — Stundensatz: CHF ${state.selectedCraftsman.hourlyRateChf}/h (DIESER WERT MUSS VERWENDET WERDEN)`
          : ""
      }`
    : "Handwerker: unbekannt";

  const erpInfo = state.erpContext
    ? `Liegenschaft: ${state.erpContext.propertyAddress}, Einheit: ${state.erpContext.propertyUnit ?? "unbekannt"}`
    : "";

  return `Du bist ein erfahrener Liegenschaftsverwalter in der Schweiz mit fundiertem Wissen über Handwerkerpreise.
Schätze die Reparaturkosten für diesen Schaden realistisch ein.

SCHADENSINFO:
- Zusammenfassung: ${state.damageSummary ?? "keine Zusammenfassung"}
- Kategorie: ${state.category ?? "unbekannt"}
- Priorität: ${state.priority ?? "unbekannt"}
${erpInfo}
${craftsmanInfo}

SCHWEIZER MARKTPREISE (Richtwerte 2024):
- Stundensatz: VERWENDE DEN STUNDENSATZ DES HANDWERKERS falls angegeben, sonst CHF 90-140/h
- Notfalleinsatz Zuschlag: +50-100%
- Materialkosten: je nach Schaden
- Mindestpauschale Ausrücken: CHF 80-120

WICHTIG:
- Wenn ein konkreter Stundensatz des Handwerkers angegeben ist, MUSS dieser verwendet werden
- Schätze konservativ aber realistisch für den Schweizer Markt
- Bei urgent/high Priorität: Notfallzuschlag einrechnen
- Grenze für Genehmigungspflicht: CHF ${APPROVAL_THRESHOLD_CHF}
- Wenn Kosten nahe an der Grenze: lieber etwas höher schätzen`;
}

// ─── Node-Funktion ────────────────────────────────────────────────────────────

export async function estimateCostNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const stepStart = Date.now();

  if (!state.category || !state.damageSummary) {
    throw new Error(
      "[estimate-cost] category/damageSummary fehlen — classify muss zuerst laufen"
    );
  }

  // LLM Kostenschätzung
  let result: EstimateCostOutput;
  try {
    result = await llm.invoke(buildPrompt(state));
  } catch (err) {
    throw new Error(
      `[estimate-cost] LLM-Call fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const approvalRequired = result.estimatedCostChf > APPROVAL_THRESHOLD_CHF;

  // Schritt loggen
  const step: AgentStep = {
    tool: "estimate_cost",
    input: {
      category: state.category,
      priority: state.priority,
      damageSummary: state.damageSummary,
    },
    output: {
      estimatedCostChf: result.estimatedCostChf,
      approvalRequired,
      reasoning: result.reasoning,
      costBreakdown: result.costBreakdown,
    },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - stepStart,
  };

  console.log(
    `[estimate-cost] CHF ${result.estimatedCostChf} → approvalRequired=${approvalRequired} (Schwelle: CHF ${APPROVAL_THRESHOLD_CHF})`
  );

  return {
    estimatedCostChf: result.estimatedCostChf,
    costEstimationReason: result.reasoning,
    approvalRequired,
    steps: [step],
  };
}