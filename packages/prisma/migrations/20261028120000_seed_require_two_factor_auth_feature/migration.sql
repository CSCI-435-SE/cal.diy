INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('require-two-factor-auth', false, 'OPERATIONAL', 'Require two-factor authentication for all users who sign in with a password', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
