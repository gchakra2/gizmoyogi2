/*
  # Implement Role-Based Authentication (RBA) System

  1. New Tables
    - `roles` - Define available roles in the system
    - `user_roles` - Many-to-many relationship between users and roles

  2. Helper Functions
    - `get_user_roles()` - Get current user's roles
    - `has_role()` - Check if user has specific role
    - `is_admin()` - Check if user is admin or super_admin

  3. Updated Security Policies
    - Update existing policies to use new role system
    - Add comprehensive role-based access control

  4. Initial Data
    - Insert predefined roles
    - Migrate existing admin users to new system
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);

-- Insert predefined roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Complete platform control and configuration'),
  ('admin', 'Site content management and moderation'),
  ('yoga_acharya', 'Create and publish yoga classes/courses'),
  ('mantra_curator', 'Create and edit blog posts/articles'),
  ('sangha_guide', 'Monitor community discussions and moderate content'),
  ('energy_exchange_lead', 'Manage product catalog and commerce'),
  ('zen_analyst', 'Access analytics and generate reports'),
  ('yogi_in_training', 'Access enrolled courses and participate in community')
ON CONFLICT (name) DO NOTHING;

-- Helper function to get current user's roles
CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS TABLE(role_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();
END;
$$;

-- Helper function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
END;
$$;

-- Helper function to check if user is admin (backward compatibility)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check new role system first
  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'super_admin')
  ) THEN
    RETURN true;
  END IF;
  
  -- Fallback to old admin_users table for backward compatibility
  RETURN EXISTS (
    SELECT 1
    FROM admin_users
    WHERE email = auth.email() AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Helper function to check if user can manage roles
CREATE OR REPLACE FUNCTION can_manage_roles()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN has_role('super_admin');
END;
$$;

-- RLS Policies for roles table
CREATE POLICY "Anyone can read roles"
  ON roles
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Super admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (can_manage_roles())
  WITH CHECK (can_manage_roles());

-- RLS Policies for user_roles table
CREATE POLICY "Users can read their own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all user roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Super admins can manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (can_manage_roles())
  WITH CHECK (can_manage_roles());

-- Migrate existing admin users to new role system
DO $$
DECLARE
  admin_record RECORD;
  super_admin_role_id uuid;
  admin_role_id uuid;
  user_record RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- Migrate existing admin users
  FOR admin_record IN SELECT email, role FROM admin_users LOOP
    -- Find the corresponding auth user
    SELECT id INTO user_record FROM auth.users WHERE email = admin_record.email;
    
    IF user_record IS NOT NULL THEN
      -- Assign appropriate role
      IF admin_record.role = 'super_admin' THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (user_record, super_admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      ELSE
        INSERT INTO user_roles (user_id, role_id)
        VALUES (user_record, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Update existing policies to use new role system

-- Update bookings policies
DROP POLICY IF EXISTS "Admin can View all records" ON bookings;
CREATE POLICY "Admins can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Update yoga_queries policies
DROP POLICY IF EXISTS "Admins and Super Admins can view all records" ON yoga_queries;
DROP POLICY IF EXISTS "Admins can update yoga queries" ON yoga_queries;

CREATE POLICY "Admins can view all yoga queries"
  ON yoga_queries
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update yoga queries"
  ON yoga_queries
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Update contact_messages policies
DROP POLICY IF EXISTS "Admins can view all contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON contact_messages;

CREATE POLICY "Admins can view all contact messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update contact messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Update articles policies for role-based access
CREATE POLICY "Content creators can manage articles"
  ON articles
  FOR ALL
  TO authenticated
  USING (has_role('mantra_curator') OR is_admin())
  WITH CHECK (has_role('mantra_curator') OR is_admin());

-- Create trigger to automatically assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the 'yogi_in_training' role ID
  SELECT id INTO default_role_id FROM roles WHERE name = 'yogi_in_training';
  
  -- Assign default role to new user
  IF default_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (this requires superuser privileges, so it might not work in hosted Supabase)
-- Instead, we'll handle this in the application code

-- Create updated_at trigger for roles table
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON roles TO authenticated, anon;
GRANT SELECT ON user_roles TO authenticated;