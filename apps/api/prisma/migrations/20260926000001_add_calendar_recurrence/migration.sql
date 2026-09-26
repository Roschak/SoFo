-- Recurrence untuk event kalender (PRD §86 lanjutan).
-- Kolom baru back-compatible: default 'NONE' berarti perilaku lama (sekali jalan).
ALTER TABLE "CalendarEvent" ADD COLUMN "recurrence" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "CalendarEvent" ADD COLUMN "recurrenceUntil" TIMESTAMP(3);

-- Index pendukung filter rentang pada batas akhir berulang.
CREATE INDEX "CalendarEvent_workspaceId_recurrenceUntil_idx"
  ON "CalendarEvent"("workspaceId", "recurrenceUntil");
