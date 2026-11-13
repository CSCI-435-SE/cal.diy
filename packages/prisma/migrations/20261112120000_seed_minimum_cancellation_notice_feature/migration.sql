INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('minimum-cancellation-notice', false, 'OPERATIONAL', 'Show the minimum cancellation notice setting on the event type Advanced tab', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
