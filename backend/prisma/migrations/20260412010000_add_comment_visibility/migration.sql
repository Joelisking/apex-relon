-- Add visibility to project comments: TEAM (default) or PRIVATE
ALTER TABLE "project_comments" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'TEAM';
