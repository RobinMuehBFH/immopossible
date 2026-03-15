-- ============================================
-- IMMOPOSSIBLE DATABASE SCHEMA
-- Initial migration: enums, tables, indexes, triggers, RLS
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'property_manager', 'tenant');

CREATE TYPE report_status AS ENUM (
  'received',
  'triaging',
  'waiting_for_approval',
  'approved',
  'rejected',
  'booking_craftsman',
  'booked',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE damage_category AS ENUM (
  'plumbing',
  'electrical',
  'heating',
  'structural',
  'appliance',
  'pest_control',
  'locksmith',
  'roofing',
  'general_maintenance',
  'other'
);

CREATE TYPE intake_channel AS ENUM ('web_form', 'email', 'whatsapp');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

CREATE TYPE agent_run_status AS ENUM ('running', 'waiting_for_human', 'completed', 'failed');

CREATE TYPE booking_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');

CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp', 'in_app');

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'tenant',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Properties table (real estate objects)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'CH',
  property_manager_id UUID REFERENCES profiles(id),
  erp_property_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction: tenants <-> properties
CREATE TABLE tenants_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT,
  lease_start DATE,
  lease_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, property_id)
);

-- Craftsmen / vendors
CREATE TABLE craftsmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  specializations damage_category[] NOT NULL DEFAULT '{}',
  hourly_rate_chf DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Damage reports (core table)
CREATE TABLE damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_in_property TEXT,
  channel intake_channel NOT NULL DEFAULT 'web_form',
  status report_status NOT NULL DEFAULT 'received',
  priority priority_level,
  damage_category damage_category,
  estimated_cost_chf DECIMAL(10,2),
  image_urls TEXT[] DEFAULT '{}',
  raw_input_payload JSONB,
  sender_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings (craftsman appointments)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES damage_reports(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES craftsmen(id),
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  status booking_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  actual_cost_chf DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approval requests (HITL trigger table)
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES damage_reports(id) ON DELETE CASCADE,
  agent_run_id UUID,
  requested_action TEXT NOT NULL,
  estimated_cost_chf DECIMAL(10,2),
  context JSONB DEFAULT '{}',
  status approval_status NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent runs (observability)
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES damage_reports(id) ON DELETE CASCADE,
  status agent_run_status NOT NULL DEFAULT 'running',
  steps_taken JSONB DEFAULT '[]',
  output_summary TEXT,
  error_message TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  checkpoint_data JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add foreign key from approval_requests to agent_runs
ALTER TABLE approval_requests 
ADD CONSTRAINT fk_approval_agent_run 
FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id);

-- Notifications (outbound message log)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID REFERENCES damage_reports(id),
  recipient_id UUID REFERENCES profiles(id),
  recipient_identifier TEXT,
  channel notification_channel NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ERP mock data
CREATE TABLE erp_mock_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, external_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_properties_manager ON properties(property_manager_id);
CREATE INDEX idx_tenants_properties_tenant ON tenants_properties(tenant_id);
CREATE INDEX idx_tenants_properties_property ON tenants_properties(property_id);
CREATE INDEX idx_damage_reports_tenant ON damage_reports(tenant_id);
CREATE INDEX idx_damage_reports_property ON damage_reports(property_id);
CREATE INDEX idx_damage_reports_status ON damage_reports(status);
CREATE INDEX idx_damage_reports_priority ON damage_reports(priority);
CREATE INDEX idx_damage_reports_created ON damage_reports(created_at DESC);
CREATE INDEX idx_craftsmen_specializations ON craftsmen USING GIN(specializations);
CREATE INDEX idx_craftsmen_active ON craftsmen(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_bookings_report ON bookings(damage_report_id);
CREATE INDEX idx_bookings_craftsman ON bookings(craftsman_id);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_approval_requests_report ON approval_requests(damage_report_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_pending ON approval_requests(status) WHERE status = 'pending';
CREATE INDEX idx_agent_runs_report ON agent_runs(damage_report_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_notifications_report ON notifications(damage_report_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_craftsmen_updated_at
  BEFORE UPDATE ON craftsmen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_damage_reports_updated_at
  BEFORE UPDATE ON damage_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_erp_mock_data_updated_at
  BEFORE UPDATE ON erp_mock_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CUSTOM ACCESS TOKEN HOOK
-- ============================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_role_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role_value::TEXT));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"tenant"');
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- ============================================
-- PROFILE CREATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'user_role',
    'tenant'
  );
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_mock_data ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (public.get_user_role() = 'admin');

-- Properties
CREATE POLICY "Authenticated users can read properties" ON properties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert properties" ON properties FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Admins can update properties" ON properties FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));

-- Tenants Properties
CREATE POLICY "Tenants can see own assignments" ON tenants_properties FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Admins can see all tenant assignments" ON tenants_properties FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Admins can insert tenant assignments" ON tenants_properties FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Admins can update tenant assignments" ON tenants_properties FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Admins can delete tenant assignments" ON tenants_properties FOR DELETE USING (public.get_user_role() IN ('admin', 'property_manager'));

-- Craftsmen
CREATE POLICY "Staff can select craftsmen" ON craftsmen FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can insert craftsmen" ON craftsmen FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can update craftsmen" ON craftsmen FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can delete craftsmen" ON craftsmen FOR DELETE USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Tenants can view active craftsmen" ON craftsmen FOR SELECT USING (is_active = TRUE AND public.get_user_role() = 'tenant');

-- Damage Reports
CREATE POLICY "Tenants can read own reports" ON damage_reports FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Staff can read all reports" ON damage_reports FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Tenants can create reports" ON damage_reports FOR INSERT WITH CHECK (auth.uid() = tenant_id OR tenant_id IS NULL);
CREATE POLICY "Staff can create reports" ON damage_reports FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can update reports" ON damage_reports FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));

-- Bookings
CREATE POLICY "Tenants can see own bookings" ON bookings FOR SELECT USING (EXISTS (SELECT 1 FROM damage_reports WHERE damage_reports.id = bookings.damage_report_id AND damage_reports.tenant_id = auth.uid()));
CREATE POLICY "Staff can select bookings" ON bookings FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can insert bookings" ON bookings FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can update bookings" ON bookings FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can delete bookings" ON bookings FOR DELETE USING (public.get_user_role() IN ('admin', 'property_manager'));

-- Approval Requests
CREATE POLICY "Staff can select approval requests" ON approval_requests FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can insert approval requests" ON approval_requests FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can update approval requests" ON approval_requests FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));

-- Agent Runs
CREATE POLICY "Staff can select agent runs" ON agent_runs FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can insert agent runs" ON agent_runs FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can update agent runs" ON agent_runs FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));

-- Notifications
CREATE POLICY "Users can see own notifications" ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Staff can select notifications" ON notifications FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can insert notifications" ON notifications FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));

-- ERP Mock Data
CREATE POLICY "Staff can select erp mock data" ON erp_mock_data FOR SELECT USING (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can insert erp mock data" ON erp_mock_data FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'property_manager'));
CREATE POLICY "Staff can update erp mock data" ON erp_mock_data FOR UPDATE USING (public.get_user_role() IN ('admin', 'property_manager'));
