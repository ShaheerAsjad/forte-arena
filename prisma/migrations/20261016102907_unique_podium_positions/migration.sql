-- Create partial unique index on (eventId, position) where position <= 3
CREATE UNIQUE INDEX "results_event_podium_unique_idx" ON "results"("eventId", "position") WHERE "position" <= 3;