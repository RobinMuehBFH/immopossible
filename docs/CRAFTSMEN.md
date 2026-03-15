# Handwerker-Management — Konzept & Anforderungen

## Übersicht

Dieses Dokument beschreibt das erweiterte Handwerker-Management für Immopossible.
Ziel ist es, Handwerker besser zu kategorisieren, bewerten und vom KI-Agenten
intelligent auswählen zu lassen.

---

## Aktueller Stand

**Vorhandene Struktur:**
- `craftsmen` Tabelle mit `specializations[]` Array (feste Enum-Werte)
- 10 fixe Kategorien: plumbing, electrical, heating, structural, appliance, pest_control, locksmith, roofing, general_maintenance, other
- Einfacher `hourly_rate_chf` Stundensatz
- `is_active` Flag für Verfügbarkeit

**Probleme:**
- Kategorien sind fix und nicht erweiterbar
- Keine Hierarchie (Berufsgruppen → Spezialisierungen)
- Keine Bewertungen für KI-Priorisierung
- Preismodell zu simpel

---

## Neue Anforderungen

### 1. Dynamische Kategorien mit Hierarchie

**Struktur:**
```
Berufsgruppe (craft_group)
└── Spezialisierung (specialization)
    └── Handwerker (craftsman)
```

**Beispiel:**
```
Sanitär & Heizung
├── Sanitär
├── Heizung
├── Boiler & Warmwasser
└── Lüftung/Klima

Elektro
├── Elektroinstallation
├── Beleuchtung
├── Smart Home
└── Notfallservice

Bau & Renovation
├── Maurer
├── Maler
├── Gipser
├── Fensterbau
└── Schreiner
```

**Umsetzung:**
- Neue Tabelle `craft_groups` für Berufsgruppen
- Neue Tabelle `specializations` für Spezialisierungen (verlinkt zu craft_group)
- `craftsmen.specialization_ids[]` statt fixer Enum
- Property Manager kann eigene Gruppen/Spezialisierungen erstellen

---

### 2. Vordefinierte Berufsgruppen (Grundstock)

Diese Gruppen werden als Seed-Daten bereitgestellt:

| Gruppe | Spezialisierungen |
|--------|-------------------|
| **Sanitär & Heizung** | Sanitär, Heizung, Boiler, Lüftung/Klima |
| **Elektro** | Installation, Beleuchtung, Smart Home, Notfall |
| **Bau & Renovation** | Maurer, Maler, Gipser, Schreiner, Fensterbau |
| **Schlosserei & Sicherheit** | Schlüsseldienst, Türen/Tore, Alarmanlagen |
| **Dach & Fassade** | Dachdecker, Spengler, Fassadenbau |
| **Garten & Umgebung** | Gärtner, Hauswart, Winterdienst |
| **Schädlingsbekämpfung** | Ungeziefer, Wespen/Bienen, Taubenabwehr |
| **Hausgeräte** | Waschmaschine, Geschirrspüler, Kühlgeräte |
| **Allgemein** | Facility Service, Reinigung, Entsorgung |

---

### 3. Einfaches Preismodell

**Felder pro Handwerker:**
- `hourly_rate_chf` — Normaler Stundensatz
- `emergency_rate_chf` — Notfall/Wochenende (optional)
- `callout_fee_chf` — Anfahrtspauschale (optional)

**Beispiel:**
```
Müller Sanitär AG
├── Stundensatz: CHF 95
├── Notfall: CHF 145
└── Anfahrt: CHF 45
```

**Warum einfach halten:**
- Komplexere Preismodelle (Nachtzuschlag, etc.) werden im PoC nicht benötigt
- Kann später erweitert werden wenn nötig

---

### 4. Bewertungssystem

**Ziel:** KI-Agent soll bei der Handwerkerauswahl Bewertungen berücksichtigen.

**Struktur:**
```
craftsman_reviews
├── id
├── craftsman_id
├── booking_id (Referenz zum Auftrag)
├── rating (1-5 Sterne)
├── punctuality_rating (1-5)
├── quality_rating (1-5)
├── communication_rating (1-5)
├── comment (Freitext)
├── created_by (property_manager_id)
├── created_at
```

**Warum detailliert:**
- KI kann spezifische Stärken erkennen (z.B. "pünktlich aber teuer")
- Property Manager sieht Historie vor Buchungsentscheidung
- Durchschnittswerte pro Handwerker berechnen (cached in `craftsmen` Tabelle)

**Cached Fields in craftsmen:**
- `avg_rating` — Gesamtdurchschnitt
- `avg_punctuality`
- `avg_quality`
- `avg_communication`
- `total_reviews` — Anzahl Bewertungen
- `total_bookings` — Anzahl abgeschlossene Aufträge

---

### 5. Verfügbarkeit

**Entscheidung:** `is_active` Flag reicht aus.

**Begründung:**
- Handwerker haben keine digitalen Kalender-Schnittstellen
- KI-Agent wird später telefonisch/per E-Mail Termine vereinbaren
- Komplexere Verfügbarkeits-Logik ist für PoC nicht nötig

---

## Datenbank-Änderungen

### Neue Tabellen

```sql
-- Berufsgruppen
CREATE TABLE craft_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false, -- true = kann nicht gelöscht werden
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spezialisierungen
CREATE TABLE specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craft_group_id UUID NOT NULL REFERENCES craft_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Handwerker-Bewertungen
CREATE TABLE craftsman_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  comment TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Änderungen an craftsmen

```sql
-- Neue Felder
ALTER TABLE craftsmen
  ADD COLUMN specialization_ids UUID[] DEFAULT '{}',
  ADD COLUMN emergency_rate_chf NUMERIC(10,2),
  ADD COLUMN callout_fee_chf NUMERIC(10,2),
  ADD COLUMN avg_rating NUMERIC(2,1),
  ADD COLUMN avg_punctuality NUMERIC(2,1),
  ADD COLUMN avg_quality NUMERIC(2,1),
  ADD COLUMN avg_communication NUMERIC(2,1),
  ADD COLUMN total_reviews INT DEFAULT 0,
  ADD COLUMN total_bookings INT DEFAULT 0;

-- Altes Feld entfernen (nach Migration)
-- ALTER TABLE craftsmen DROP COLUMN specializations;
```

---

## UI-Änderungen

### Dashboard: Craftsmen-Seite

1. **Filter nach Berufsgruppe** — Dropdown mit allen Gruppen
2. **Bewertung anzeigen** — Sterne + Anzahl Reviews in Tabelle
3. **Neuer Handwerker erstellen:**
   - Spezialisierungen aus Dropdown wählen (multi-select)
   - Preise: Normal + Notfall + Anfahrt

### Dashboard: Neue Seite "Kategorien verwalten"

- Berufsgruppen erstellen/bearbeiten/löschen
- Spezialisierungen pro Gruppe verwalten
- System-Kategorien (is_system=true) können nicht gelöscht werden

### Dashboard: Handwerker-Detailseite

- Statistiken (Aufträge, Bewertungen)
- Bewertungsverlauf
- Neue Bewertung erfassen (nach abgeschlossenem Auftrag)

---

## KI-Agent Integration

Der Agent nutzt die Bewertungen bei der Handwerkerauswahl:

```typescript
// Beispiel: Tool find_craftsman
async function findCraftsman(params: {
  specialization_id: string
  prefer_quality?: boolean
  max_hourly_rate?: number
}) {
  // Query mit Bewertungs-Sortierung
  const { data } = await supabase
    .from('craftsmen')
    .select('*')
    .contains('specialization_ids', [params.specialization_id])
    .eq('is_active', true)
    .order('avg_rating', { ascending: false })
    .limit(3)
  
  return data
}
```

---

## Migration Plan

1. **Phase 1:** Neue Tabellen erstellen + Seed-Daten
2. **Phase 2:** craftsmen-Tabelle erweitern, alte `specializations[]` zu neuen IDs migrieren
3. **Phase 3:** UI anpassen (Craftsmen CRUD, Kategorien-Verwaltung)
4. **Phase 4:** Review-System einbauen
5. **Phase 5:** Agent-Tools aktualisieren

---

## Offene Fragen

- [x] Soll es ein "bevorzugter Handwerker pro Property" Konzept geben? → **Ja**
- [x] Braucht es eine Blacklist-Funktion (Handwerker für bestimmte Properties sperren)? → **Nein**
- [x] Sollen Handwerker selbst Zugang zum System haben (z.B. Auftragsbestätigung)? → **Nein, nur Property Manager**

---

## Zusätzliche Anforderung: Bevorzugte Handwerker

Property Manager können pro Liegenschaft bevorzugte Handwerker festlegen.
Der KI-Agent berücksichtigt diese bei der Auswahl.

**Neue Tabelle:**

```sql
CREATE TABLE property_preferred_craftsmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
  specialization_id UUID REFERENCES specializations(id),
  priority INT DEFAULT 1, -- 1 = höchste Priorität
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, craftsman_id, specialization_id)
);
```

**Beispiel:**
```
Residenz Mühlemann
├── Sanitär: Müller Sanitär AG (Priorität 1)
├── Sanitär: Huber & Co (Priorität 2, falls Müller nicht verfügbar)
└── Elektro: Elektro Bern GmbH
```

**KI-Agent Logik:**
1. Zuerst bevorzugte Handwerker für die Property prüfen
2. Falls keiner verfügbar → nach Bewertung auswählen
3. Falls keine Bewertungen → zufällig aus aktiven wählen

---

## Nächste Schritte

1. Feedback zu diesem Konzept einholen
2. Migration SQL schreiben
3. TypeScript-Types generieren
4. UI implementieren
