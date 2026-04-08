-- Run in Supabase SQL Editor to delete test data
DELETE FROM reactions WHERE post_id IN (SELECT id FROM posts WHERE content IN ('faq', 'q', 'test'));
DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE content IN ('faq', 'q', 'test'));
DELETE FROM posts WHERE content IN ('faq', 'q', 'test');
