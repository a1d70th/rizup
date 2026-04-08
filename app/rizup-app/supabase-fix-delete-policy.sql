-- Fix: posts table missing DELETE policy (root cause of delete bug)
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Also add missing DELETE policy for comments (own comments)
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);
