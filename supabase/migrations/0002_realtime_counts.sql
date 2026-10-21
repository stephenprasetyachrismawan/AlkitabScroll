-- Live like/comment counts: broadcast changes on likes and comments.
-- Run once in Supabase SQL Editor.
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;
-- Deletes then carry the whole old row (incl. verse_id), so the app knows which count changed.
alter table public.comments replica identity full;
alter table public.likes replica identity full;
