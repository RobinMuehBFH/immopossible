-- ============================================
-- SEED DATA
-- Run this after schema migration
-- ============================================

-- Craftsmen (vendors)
INSERT INTO craftsmen (id, company_name, contact_name, email, phone, specializations, hourly_rate_chf, is_active, notes) VALUES
  ('c0000001-0001-0000-0000-000000000001', 'Müller Sanitär AG', 'Hans Müller', 'hans@mueller-sanitaer.ch', '+41 79 123 45 67', ARRAY['plumbing']::damage_category[], 95.00, TRUE, 'Reliable, 24h emergency service available'),
  ('c0000001-0002-0000-0000-000000000002', 'ElektroFix GmbH', 'Lisa Weber', 'lisa@elektrofix.ch', '+41 79 234 56 78', ARRAY['electrical']::damage_category[], 110.00, TRUE, 'Certified electrician, fast response'),
  ('c0000001-0003-0000-0000-000000000003', 'Klima & Heizung Bern', 'Peter Schneider', 'peter@klimaheizung.ch', '+41 79 345 67 89', ARRAY['heating']::damage_category[], 120.00, TRUE, 'Specialist for all heating systems'),
  ('c0000001-0004-0000-0000-000000000004', 'Allround Handwerker', 'Marco Rossi', 'marco@allround.ch', '+41 79 456 78 90', ARRAY['general_maintenance', 'structural']::damage_category[], 85.00, TRUE, 'Jack of all trades, great for small jobs'),
  ('c0000001-0005-0000-0000-000000000005', 'Schädlingsbekämpfung Schweiz', 'Anna Keller', 'anna@schaedlings.ch', '+41 79 567 89 01', ARRAY['pest_control']::damage_category[], 150.00, TRUE, 'Discreet and thorough'),
  ('c0000001-0006-0000-0000-000000000006', 'Schlüsseldienst 24', 'Thomas Brunner', 'thomas@schluessel24.ch', '+41 79 678 90 12', ARRAY['locksmith']::damage_category[], 80.00, TRUE, '15-minute arrival guarantee in city')
ON CONFLICT DO NOTHING;

-- Properties
INSERT INTO properties (id, name, address, city, postal_code, country, erp_property_id, metadata) VALUES
  ('a0000001-0001-0000-0000-000000000001', 'Bahnhofstrasse 10', 'Bahnhofstrasse 10', 'Bern', '3011', 'CH', 'ERP-PROP-001', '{"units": 8, "year_built": 1985, "type": "residential"}'),
  ('a0000001-0002-0000-0000-000000000002', 'Neuengasse 42', 'Neuengasse 42', 'Bern', '3011', 'CH', 'ERP-PROP-002', '{"units": 12, "year_built": 2010, "type": "mixed"}'),
  ('a0000001-0003-0000-0000-000000000003', 'Seftigenstrasse 77', 'Seftigenstrasse 77', 'Köniz', '3098', 'CH', 'ERP-PROP-003', '{"units": 6, "year_built": 1995, "type": "residential"}')
ON CONFLICT DO NOTHING;

-- ERP Mock Data
INSERT INTO erp_mock_data (entity_type, external_id, data) VALUES
  ('property', 'ERP-PROP-001', '{"insurance": "Helvetia", "insurance_number": "HEL-2024-001", "maintenance_budget_chf": 15000, "last_renovation": "2020-03"}'),
  ('property', 'ERP-PROP-002', '{"insurance": "Zurich", "insurance_number": "ZUR-2024-042", "maintenance_budget_chf": 25000, "last_renovation": "2022-06"}'),
  ('property', 'ERP-PROP-003', '{"insurance": "Mobiliar", "insurance_number": "MOB-2024-103", "maintenance_budget_chf": 12000, "last_renovation": "2019-11"}'),
  ('contract', 'ERP-CONTRACT-001', '{"tenant_name": "Max Muster", "start_date": "2023-01-01", "rent_chf": 1850, "deposit_chf": 3700}'),
  ('contract', 'ERP-CONTRACT-002', '{"tenant_name": "Sarah Beispiel", "start_date": "2022-06-01", "rent_chf": 2100, "deposit_chf": 4200}'),
  ('contract', 'ERP-CONTRACT-003', '{"tenant_name": "Test Tenant", "start_date": "2024-01-01", "rent_chf": 1650, "deposit_chf": 3300}')
ON CONFLICT DO NOTHING;
