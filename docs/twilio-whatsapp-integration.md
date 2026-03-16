# Twilio WhatsApp Integration

## Was wir bauen

Zwei Dinge:

1. **Agent schickt WhatsApp** — wenn der Agent einen Handwerker gebucht hat, bekommt der Mieter eine WhatsApp-Nachricht
2. **Mieter meldet Schaden per WhatsApp** — Mieter schreibt an unsere Twilio-Nummer → automatisch ein neuer Schadensbericht wird erstellt

---

## Was du jetzt brauchst (Twilio Console)

Geh auf [console.twilio.com](https://console.twilio.com) und such diese 3 Werte:

| Was | Wo finden | Beispiel |
|---|---|---|
| Account SID | Startseite, oben links | `ACxxxxxxxxxxxx` |
| Auth Token | Startseite, daneben (Auge-Icon) | `xxxxxxxxxxxxxxx` |
| WhatsApp-Nummer | Messaging → Senders → WhatsApp | `+14155238886` |

> **Sandbox oder echte Nummer?**
> Für Tests nimm die **Sandbox** (kostenlos). Du musst einmalig vom Handy `JOIN [dein-sandbox-code]` an `+14155238886` (WhatsApp) schicken um sie freizuschalten.

---

## Was wir implementieren (6 Dateien)

### 1. Env-Variablen hinzufügen
Drei neue Zeilen in `.env.local`:
```
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 2. Twilio Client (`lib/twilio/client.ts`)
Initialisiert den Twilio-Client mit den Env-Variablen. Wird einmal erstellt und überall importiert.

### 3. WhatsApp senden (`lib/twilio/send-whatsapp.ts`)
Eine Funktion `sendWhatsApp(to, message)` die eine Nachricht über Twilio verschickt.

### 4. Agent-Notification updaten (`lib/agents/tools/send-notification.ts`)
Aktuell: schreibt nur in die DB, sendet nichts.
Neu: wenn `channel === 'whatsapp'` → Twilio aufrufen und echte WhatsApp senden.

### 5. Inbound Webhook (`app/api/webhooks/twilio/route.ts`)
Twilio ruft diesen Endpunkt auf wenn ein Mieter uns eine WhatsApp schickt.
- Nummer in DB nachschlagen → Mieter-Profil finden
- Neuen Schadensbericht erstellen
- Automatisch antworten: "Meldung registriert ✓"

### 6. Profil: Telefonnummer-Feld (`app/(portal)/portal/profile/page.tsx`)
Mieter kann seine WhatsApp-Nummer im Profil hinterlegen.

---

## Ablauf danach (End-to-End)

```
Mieter schreibt WhatsApp → Twilio → Webhook → Schadensbericht erstellt
                                                        ↓
                                               Manager startet Agent
                                                        ↓
                                            Agent bucht Handwerker
                                                        ↓
                                        Mieter bekommt WhatsApp ✓
```

---

## Was ich von dir brauche

**Damit wir anfangen können:**

1. **Account SID** aus der Twilio Console
2. **Auth Token** aus der Twilio Console
3. **WhatsApp-Nummer** (Sandbox: `+14155238886`)
4. **Deine Handynummer** (damit wir `tenant@test.ch` deine Nummer zuweisen und du die Nachrichten empfängst)
5. **Webhook-URL** — damit Twilio weiss wohin es die eingehenden Nachrichten schicken soll:
   - Lokal: `npx ngrok http 3000` starten → die `https://xxxx.ngrok.io` URL schicken
   - Oder direkt die Produktions-URL wenn deployed
