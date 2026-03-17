-- Migration 006: Extended baselines + click deduplication
-- Adds baseline columns for customers, revenue, paid, owed, churned from GHL CSV.
-- Adds composite index on clicks for efficient 24h dedup lookups.

-- Step 1: Add new baseline columns
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_customers INT NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_revenue NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_paid NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_owed NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_churned INT NOT NULL DEFAULT 0;

-- Step 2: Composite index for click dedup queries (affiliate + ip_hash + recency)
CREATE INDEX IF NOT EXISTS idx_clicks_dedup ON clicks(affiliate_id, ip_hash, clicked_at DESC);

-- Step 3: Populate baselines from GHL CSV (2026-03-16 export)
UPDATE affiliates SET baseline_customers = 79, baseline_revenue = 2214.01, baseline_paid = 1386.58, baseline_owed = 162.65, baseline_churned = 68 WHERE id = 'dd4f7344-a669-432a-a7e3-f3c78ea8d45c'; -- Cru Cru
UPDATE affiliates SET baseline_customers = 52, baseline_revenue = 1232.59, baseline_paid = 389.58, baseline_owed = 227.35, baseline_churned = 32 WHERE id = '923e72b6-5b41-41ef-a9b7-2fa48f0c2a92'; -- Railson Ubiali Junior
UPDATE affiliates SET baseline_customers = 301, baseline_revenue = 7701.57, baseline_paid = 4855.14, baseline_owed = 534.05, baseline_churned = 123 WHERE id = '5335a947-4091-418a-9434-6c0a85667bc9'; -- Coma Rust
UPDATE affiliates SET baseline_customers = 227, baseline_revenue = 6268.85, baseline_paid = 4031.99, baseline_owed = 354.60, baseline_churned = 126 WHERE id = '3966ab97-f53a-4e51-a241-3883dff701d8'; -- Falcon Silas
UPDATE affiliates SET baseline_customers = 132, baseline_revenue = 2739.50, baseline_paid = 1450.29, baseline_owed = 467.09, baseline_churned = 24 WHERE id = 'cd56564d-ecb0-4de7-996e-ca8f90e21974'; -- Tacularr Ahmad
UPDATE affiliates SET baseline_customers = 131, baseline_revenue = 3246.22, baseline_paid = 2039.37, baseline_owed = 232.08, baseline_churned = 62 WHERE id = '44f2b192-7056-4535-a040-1f5200a23af4'; -- spinky Josh
UPDATE affiliates SET baseline_customers = 52, baseline_revenue = 1690.30, baseline_paid = 1109.33, baseline_owed = 73.29, baseline_churned = 51 WHERE id = '9c2aaf40-d878-4b36-9858-08e7b60de590'; -- Mikeyduck Mike
UPDATE affiliates SET baseline_customers = 29, baseline_revenue = 742.32, baseline_paid = 119.32, baseline_owed = 226.29, baseline_churned = 27 WHERE id = '52864248-d91c-46f4-856c-a9403250c5d6'; -- Austin copeland
UPDATE affiliates SET baseline_customers = 71, baseline_revenue = 1393.63, baseline_owed = 13.97, baseline_churned = 2 WHERE id = 'b6d9e472-4c0b-49e6-8dc5-93a5ec6624b1'; -- Lyric Quinonez
UPDATE affiliates SET baseline_customers = 59, baseline_revenue = 642.52, baseline_owed = 6.44, baseline_churned = 1 WHERE id = 'd9ea1e9c-9991-4ec3-95c4-7f970ddf0057'; -- aloneintokyo Matt
UPDATE affiliates SET baseline_customers = 103, baseline_revenue = 2599.19, baseline_paid = 1656.04, baseline_owed = 162.65, baseline_churned = 50 WHERE id = '7de52c4f-3b65-4950-a858-424d69576aff'; -- Schoolwe Schoolwe
UPDATE affiliates SET baseline_customers = 50, baseline_revenue = 635.51, baseline_paid = 6.98, baseline_owed = 437.79 WHERE id = 'dbf9cc92-9c56-4fbf-a6f1-a83b440d4a4a'; -- spiicy rust
UPDATE affiliates SET baseline_customers = 73, baseline_revenue = 1920.67, baseline_paid = 1147.80, baseline_owed = 196.17, baseline_churned = 45 WHERE id = 'ea93d0a1-1fcd-4cb8-a189-7a6f75de331c'; -- dinling Dan
UPDATE affiliates SET baseline_customers = 8, baseline_revenue = 192.59, baseline_paid = 88.94, baseline_owed = 7.50, baseline_churned = 12 WHERE id = 'a5baa527-3fdb-47e6-80b4-82bd64a80ec7'; -- sh0cker Marcelo
UPDATE affiliates SET baseline_customers = 49, baseline_revenue = 696.41, baseline_paid = 1887.91, baseline_owed = 375.91, baseline_churned = 8 WHERE id = '0138eecc-9d95-4f9f-8dfe-52fe368aac5b'; -- Rhys Sinks
UPDATE affiliates SET baseline_customers = 7, baseline_revenue = 94.81, baseline_paid = 24.43, baseline_owed = 41.88, baseline_churned = 6 WHERE id = '33f3358e-e5b6-46d7-8de7-36e209d8bbb8'; -- Flokie Jesper
UPDATE affiliates SET baseline_customers = 59, baseline_revenue = 1497.71, baseline_paid = 961.89, baseline_owed = 88.25, baseline_churned = 36 WHERE id = 'a4986fee-3f4a-44c0-b40a-edaf0f249d0d'; -- Deathwingua Nikita
UPDATE affiliates SET baseline_customers = 21, baseline_revenue = 628.50, baseline_paid = 429.43, baseline_owed = 10.47, baseline_churned = 15 WHERE id = 'a6802a19-a3de-4db8-98dd-ad3fc3c4eecf'; -- PRODI Ivan
UPDATE affiliates SET baseline_customers = 12, baseline_revenue = 100.27, baseline_owed = 1.00 WHERE id = '18110810-6a04-424b-b910-2af7462007da'; -- Gorliac Luis
UPDATE affiliates SET baseline_customers = 6, baseline_revenue = 44.91, baseline_paid = 17.45, baseline_owed = 13.96, baseline_churned = 3 WHERE id = '62e3b41d-763f-44e2-933b-1b99baff77db'; -- Clinky Clinky
UPDATE affiliates SET baseline_customers = 23, baseline_revenue = 516.34, baseline_paid = 261.10, baseline_owed = 100.19, baseline_churned = 9 WHERE id = '322816ba-2f75-4a32-87f5-adde512f2e4f'; -- Pyro0 Cyril
UPDATE affiliates SET baseline_customers = 16, baseline_revenue = 338.25, baseline_paid = 223.21, baseline_owed = 13.96, baseline_churned = 9 WHERE id = '308ea86d-7787-44ad-8856-20c33f3faa9b'; -- Alex Rust Alex
UPDATE affiliates SET baseline_customers = 20, baseline_revenue = 578.72, baseline_paid = 370.02, baseline_owed = 34.90, baseline_churned = 17 WHERE id = '5827daab-432b-40d6-9625-fc27a552bd9f'; -- BBraden Braden
UPDATE affiliates SET baseline_customers = 8, baseline_revenue = 142.20, baseline_paid = 90.73, baseline_owed = 8.72, baseline_churned = 7 WHERE id = 'cfc9585f-a222-4580-bf41-279ea238de4c'; -- wash Jonas
UPDATE affiliates SET baseline_customers = 10, baseline_revenue = 182.61, baseline_paid = 83.76, baseline_owed = 43.99, baseline_churned = 6 WHERE id = 'a440da46-a31b-4c14-babe-49acb3953308'; -- Griffin Rachford
UPDATE affiliates SET baseline_customers = 7, baseline_revenue = 39.92, baseline_paid = 20.94, baseline_owed = 6.98 WHERE id = 'cbd47cd7-ab47-4213-a443-00f001c0e746'; -- yss
UPDATE affiliates SET baseline_customers = 14, baseline_revenue = 248.43, baseline_paid = 156.40, baseline_owed = 17.45, baseline_churned = 2 WHERE id = 'f853d93c-8353-4d9c-8e98-98e125aef867'; -- Tonza Rust Toni
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 4.99, baseline_owed = 3.49 WHERE slug = 'enardo'; -- Enardo Enardo
UPDATE affiliates SET baseline_customers = 8, baseline_revenue = 221.46, baseline_paid = 77.51, baseline_owed = 77.51 WHERE id = 'b624c4a8-5c51-48cf-b5c7-13dbe19b2403'; -- Blue Bubs
UPDATE affiliates SET baseline_customers = 2, baseline_revenue = 19.96, baseline_owed = 13.96, baseline_churned = 2 WHERE id = '0c1eafe3-0f46-4bd8-b4f0-1d003eb6a82c'; -- AndreRossi André
UPDATE affiliates SET baseline_customers = 3, baseline_revenue = 62.85, baseline_paid = 37.01, baseline_owed = 8.98, baseline_churned = 1 WHERE id = 'f2fc9edd-922d-428a-99bf-9aea089cc15a'; -- LEDOO LEDOO
UPDATE affiliates SET baseline_customers = 2, baseline_revenue = 72.83, baseline_paid = 51.91, baseline_owed = 11.73, baseline_churned = 1 WHERE id = '1fe09c8b-1554-4f68-a9f7-c7380638f767'; -- OT Lewis
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 4.99, baseline_paid = 3.49 WHERE id = 'fe712e48-3619-4379-9799-0e8a99223f07'; -- perzzon Emil
UPDATE affiliates SET baseline_customers = 5, baseline_revenue = 188.55, baseline_paid = 128.48, baseline_owed = 3.49, baseline_churned = 2 WHERE id = '37494d0f-f77a-4360-98ad-a3d1a0c16cf7'; -- NAZ Tristan
UPDATE affiliates SET baseline_revenue = 14.97, baseline_paid = 3.49, baseline_owed = 6.98, baseline_churned = 1 WHERE id = 'ca205a0b-27f5-4fec-bd0c-67309f66771b'; -- Tanizen Agustin
UPDATE affiliates SET baseline_customers = 2, baseline_revenue = 52.87, baseline_owed = 26.44 WHERE id = '5ca92a16-7987-4842-b32a-73e8de39f0f5'; -- Matti Matti
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 4.99, baseline_paid = 2.50 WHERE id = '6bbc24d1-a537-4da1-827a-38b9b9c20cf3'; -- UltraViolet Benjamin
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 9.98, baseline_paid = 3.49, baseline_owed = 3.49 WHERE id = '3dd25e9b-1c5a-462b-b36e-320aa43de67c'; -- ScrimScene Joel
UPDATE affiliates SET baseline_revenue = 14.97, baseline_paid = 10.47, baseline_churned = 1 WHERE id = '5cba8395-e22f-4a02-9c48-fdb11d0af586'; -- Kickz Corey
UPDATE affiliates SET baseline_customers = 2, baseline_revenue = 9.98, baseline_paid = 6.98 WHERE id = 'aabffaeb-2284-4d07-b42c-153e90ca4bed'; -- lucas
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 47.88, baseline_paid = 33.52 WHERE id = '926147bb-5f36-45a0-983e-499a843ea366'; -- v2unstoppablee Noah
UPDATE affiliates SET baseline_revenue = 4.99, baseline_paid = 8.53, baseline_owed = 0.75, baseline_churned = 1 WHERE id = '11b85477-48d6-41d2-a033-6df1067aaad1'; -- Lee Matthew
UPDATE affiliates SET baseline_customers = 4, baseline_revenue = 135.68, baseline_paid = 60.38, baseline_owed = 7.50, baseline_churned = 1 WHERE id = '22c78284-1c81-4720-90e3-14139fef1e86'; -- Energy Zack
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 47.88, baseline_paid = 33.52 WHERE id = '68e4e748-2460-4d0e-9d4b-ffa1687a5d7e'; -- Lost Lost
UPDATE affiliates SET baseline_customers = 1, baseline_revenue = 4.99, baseline_paid = 3.49 WHERE id = 'e940117f-3bc0-479b-a787-747b4102427e'; -- imVertzo Ruben
UPDATE affiliates SET baseline_revenue = 4.99, baseline_paid = 3.49, baseline_churned = 1 WHERE id = 'b57fd114-7b89-472f-b1bb-287475a6dc63'; -- Riqqeloff Riku
