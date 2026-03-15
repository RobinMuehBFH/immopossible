-- Migration: Craftsmen Categories, Reviews & Preferences
-- Created: 2026-03-08

-- ============================================================================
-- 1. Create craft_groups table (Berufsgruppen)
-- ============================================================================

CREATE TABLE IF NOT EXISTS craft_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE craft_groups ENABLE ROW LEVEL SECURITY;

-- Policies: readable by all authenticated, writable by admin/property_manager
CREATE POLICY "craft_groups_select" ON craft_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "craft_groups_insert" ON craft_groups
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "craft_groups_update" ON craft_groups
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "craft_groups_delete" ON craft_groups
  FOR DELETE TO authenticated
  USING (
    is_system = false AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

-- ============================================================================
-- 2. Create specializations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craft_group_id UUID NOT NULL REFERENCES craft_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(craft_group_id, name)
);

-- Enable RLS
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "specializations_select" ON specializations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "specializations_insert" ON specializations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "specializations_update" ON specializations
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "specializations_delete" ON specializations
  FOR DELETE TO authenticated
  USING (
    is_system = false AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

-- ============================================================================
-- 3. Alter craftsmen table
-- ============================================================================

-- Add new columns
ALTER TABLE craftsmen 
  ADD COLUMN IF NOT EXISTS specialization_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS avg_punctuality NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS avg_quality NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS avg_communication NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_bookings INT DEFAULT 0;

-- Create index for specialization lookup
CREATE INDEX IF NOT EXISTS idx_craftsmen_specialization_ids ON craftsmen USING GIN (specialization_ids);

-- ============================================================================
-- 4. Create craftsman_reviews table
-- ============================================================================

CREATE TABLE IF NOT EXISTS craftsman_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  comment TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE craftsman_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "craftsman_reviews_select" ON craftsman_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "craftsman_reviews_insert" ON craftsman_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "craftsman_reviews_update" ON craftsman_reviews
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "craftsman_reviews_delete" ON craftsman_reviews
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_craftsman_reviews_craftsman_id ON craftsman_reviews(craftsman_id);

-- ============================================================================
-- 5. Create property_preferred_craftsmen table
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_preferred_craftsmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
  specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL,
  priority INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, craftsman_id, specialization_id)
);

-- Enable RLS
ALTER TABLE property_preferred_craftsmen ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "property_preferred_craftsmen_select" ON property_preferred_craftsmen
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "property_preferred_craftsmen_insert" ON property_preferred_craftsmen
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "property_preferred_craftsmen_update" ON property_preferred_craftsmen
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

CREATE POLICY "property_preferred_craftsmen_delete" ON property_preferred_craftsmen
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'property_manager')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_preferred_craftsmen_property ON property_preferred_craftsmen(property_id);
CREATE INDEX IF NOT EXISTS idx_property_preferred_craftsmen_craftsman ON property_preferred_craftsmen(craftsman_id);

-- ============================================================================
-- 6. Function to update craftsman rating averages
-- ============================================================================

CREATE OR REPLACE FUNCTION update_craftsman_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE craftsmen
  SET 
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM craftsman_reviews WHERE craftsman_id = COALESCE(NEW.craftsman_id, OLD.craftsman_id)),
    avg_punctuality = (SELECT ROUND(AVG(punctuality_rating)::numeric, 1) FROM craftsman_reviews WHERE craftsman_id = COALESCE(NEW.craftsman_id, OLD.craftsman_id)),
    avg_quality = (SELECT ROUND(AVG(quality_rating)::numeric, 1) FROM craftsman_reviews WHERE craftsman_id = COALESCE(NEW.craftsman_id, OLD.craftsman_id)),
    avg_communication = (SELECT ROUND(AVG(communication_rating)::numeric, 1) FROM craftsman_reviews WHERE craftsman_id = COALESCE(NEW.craftsman_id, OLD.craftsman_id)),
    total_reviews = (SELECT COUNT(*) FROM craftsman_reviews WHERE craftsman_id = COALESCE(NEW.craftsman_id, OLD.craftsman_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.craftsman_id, OLD.craftsman_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-updating ratings
DROP TRIGGER IF EXISTS trigger_update_craftsman_ratings ON craftsman_reviews;
CREATE TRIGGER trigger_update_craftsman_ratings
  AFTER INSERT OR UPDATE OR DELETE ON craftsman_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_craftsman_ratings();

-- ============================================================================
-- 7. Seed data: Default craft groups and specializations
-- ============================================================================

-- Sanitär & Heizung
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Sanitär & Heizung', 'Sanitärinstallationen, Heizungsanlagen und Warmwasser', 'droplet', 1, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Sanitär', 'Heizung', 'Boiler & Warmwasser', 'Lüftung & Klima']), 
       generate_series(1, 4), true
FROM craft_groups WHERE name = 'Sanitär & Heizung'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Elektro
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Elektro', 'Elektroinstallationen, Beleuchtung und Smart Home', 'zap', 2, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Elektroinstallation', 'Beleuchtung', 'Smart Home', 'Notfallservice']), 
       generate_series(1, 4), true
FROM craft_groups WHERE name = 'Elektro'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Bau & Renovation
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Bau & Renovation', 'Maurer, Maler, Gipser und Schreiner', 'hammer', 3, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Maurer', 'Maler', 'Gipser', 'Schreiner', 'Fensterbau']), 
       generate_series(1, 5), true
FROM craft_groups WHERE name = 'Bau & Renovation'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Schlosserei & Sicherheit
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Schlosserei & Sicherheit', 'Schlüsseldienst, Türen und Sicherheitssysteme', 'lock', 4, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Schlüsseldienst', 'Türen & Tore', 'Alarmanlagen']), 
       generate_series(1, 3), true
FROM craft_groups WHERE name = 'Schlosserei & Sicherheit'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Dach & Fassade
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Dach & Fassade', 'Dachdecker, Spengler und Fassadenarbeiten', 'home', 5, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Dachdecker', 'Spengler', 'Fassadenbau']), 
       generate_series(1, 3), true
FROM craft_groups WHERE name = 'Dach & Fassade'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Garten & Umgebung
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Garten & Umgebung', 'Gärtner, Hauswart und Winterdienst', 'trees', 6, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Gärtner', 'Hauswart', 'Winterdienst']), 
       generate_series(1, 3), true
FROM craft_groups WHERE name = 'Garten & Umgebung'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Schädlingsbekämpfung
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Schädlingsbekämpfung', 'Ungeziefer, Wespen und Taubenabwehr', 'bug', 7, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Ungeziefer', 'Wespen & Bienen', 'Taubenabwehr']), 
       generate_series(1, 3), true
FROM craft_groups WHERE name = 'Schädlingsbekämpfung'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Hausgeräte
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Hausgeräte', 'Reparatur von Waschmaschinen, Geschirrspüler und Kühlgeräten', 'washing-machine', 8, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Waschmaschine', 'Geschirrspüler', 'Kühlgeräte', 'Herd & Backofen']), 
       generate_series(1, 4), true
FROM craft_groups WHERE name = 'Hausgeräte'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- Allgemein
INSERT INTO craft_groups (name, description, icon, sort_order, is_system) VALUES
  ('Allgemein', 'Facility Service, Reinigung und Entsorgung', 'briefcase', 9, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO specializations (craft_group_id, name, sort_order, is_system)
SELECT id, unnest(ARRAY['Facility Service', 'Reinigung', 'Entsorgung', 'Umzugshilfe']), 
       generate_series(1, 4), true
FROM craft_groups WHERE name = 'Allgemein'
ON CONFLICT (craft_group_id, name) DO NOTHING;

-- ============================================================================
-- 8. Enable Realtime for new tables
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE craft_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE specializations;
ALTER PUBLICATION supabase_realtime ADD TABLE craftsman_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE property_preferred_craftsmen;
