/*
  # Fix admin policies for yoga queries and contact messages

  1. Security Updates
    - Add admin policies for yoga_queries table
    - Add admin policies for contact_messages table
    - Allow admins to view all records in these tables

  2. Changes
    - Add policy for admins to view all yoga queries
    - Add policy for admins to view all contact messages
    - Add policy for admins to update yoga queries (for responses)
    - Add policy for admins to update contact messages (for status changes)
*/

-- Add admin policies for yoga_queries
CREATE POLICY "Admins and Super Admins can view all records"
  ON yoga_queries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update yoga queries"
  ON yoga_queries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Add admin policies for contact_messages
CREATE POLICY "Admins can view all contact messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update contact messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );

-- Add admin policy for bookings
CREATE POLICY "Admin can View all records"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.email() AND role IN ('admin', 'super_admin')
    )
  );