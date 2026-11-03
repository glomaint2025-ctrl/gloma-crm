-- Gloma CRM — Add: richer Content Calendar items (platforms, content type, caption, concept, ...)
-- Date: 2026-11-03
--
-- Adds columns to tasks so a calendar item can carry the full content brief:
--   content_type    : Static Post, Reel / Short Video, Cinematic Ad, BTS Series, ... (free text)
--   platforms       : one or more of Facebook, Instagram, TikTok, LinkedIn
--   content_id      : the client's own code, e.g. POST-001 / REEL-004
--   concept         : concept overview
--   caption         : post caption
--   image_wording   : text on the image, or the video script
--   reference_link  : reference / referral link (YouTube, TikTok, ...)
--   admin_reply     : feedback from the admin / manager
--
-- Until this is run the Content Calendar still shows existing tasks, but saving a
-- content item (or the AI Sheet Import) asks you to run this file first.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run multiple times.

alter table public.tasks add column if not exists content_type text;
alter table public.tasks add column if not exists platforms text[] default '{}';
alter table public.tasks add column if not exists content_id text;
alter table public.tasks add column if not exists concept text;
alter table public.tasks add column if not exists caption text;
alter table public.tasks add column if not exists image_wording text;
alter table public.tasks add column if not exists reference_link text;
alter table public.tasks add column if not exists admin_reply text;

notify pgrst, 'reload schema';
