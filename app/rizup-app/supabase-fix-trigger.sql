-- Fix: auto-assign 7-day trial on new user signup (with error handling)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    NOW(),
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
