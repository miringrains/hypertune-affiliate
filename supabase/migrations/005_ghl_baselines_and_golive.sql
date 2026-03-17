-- Migration 005: GHL baseline data + go-live calibration
-- Stores GHL historical numbers so portal stats match what affiliates saw on GHL.
-- After go-live, new data from our tracking endpoints adds on top of these baselines.

-- Step 1: Add baseline columns
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_leads INT NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS baseline_clicks INT NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS go_live_at TIMESTAMPTZ;

-- Step 2: Populate baseline_leads from GHL master CSV (2026-03-16 export)
-- Each value = GHL's total lead count for that affiliate at time of export
UPDATE affiliates SET baseline_leads = 322  WHERE id = '0138eecc-9d95-4f9f-8dfe-52fe368aac5b'; -- Rhys Sinks
UPDATE affiliates SET baseline_leads = 989  WHERE id = '5335a947-4091-418a-9434-6c0a85667bc9'; -- Coma Rust
UPDATE affiliates SET baseline_leads = 977  WHERE id = '3966ab97-f53a-4e51-a241-3883dff701d8'; -- Falcon Silas
UPDATE affiliates SET baseline_leads = 1277 WHERE id = 'dd4f7344-a669-432a-a7e3-f3c78ea8d45c'; -- Cru Cru
UPDATE affiliates SET baseline_leads = 1228 WHERE id = '923e72b6-5b41-41ef-a9b7-2fa48f0c2a92'; -- Railson Ubiali Junior
UPDATE affiliates SET baseline_leads = 757  WHERE id = '44f2b192-7056-4535-a040-1f5200a23af4'; -- spinky Josh
UPDATE affiliates SET baseline_leads = 778  WHERE id = 'cd56564d-ecb0-4de7-996e-ca8f90e21974'; -- Tacularr Ahmad
UPDATE affiliates SET baseline_leads = 699  WHERE id = '9c2aaf40-d878-4b36-9858-08e7b60de590'; -- Mikeyduck Mike
UPDATE affiliates SET baseline_leads = 555  WHERE id = '52864248-d91c-46f4-856c-a9403250c5d6'; -- Austin copeland
UPDATE affiliates SET baseline_leads = 485  WHERE id = 'b6d9e472-4c0b-49e6-8dc5-93a5ec6624b1'; -- Lyric Quinonez
UPDATE affiliates SET baseline_leads = 463  WHERE id = 'd9ea1e9c-9991-4ec3-95c4-7f970ddf0057'; -- aloneintokyo Matt
UPDATE affiliates SET baseline_leads = 400  WHERE id = '7de52c4f-3b65-4950-a858-424d69576aff'; -- Schoolwe Schoolwe
UPDATE affiliates SET baseline_leads = 390  WHERE id = 'dbf9cc92-9c56-4fbf-a6f1-a83b440d4a4a'; -- spiicy rust
UPDATE affiliates SET baseline_leads = 352  WHERE id = 'ea93d0a1-1fcd-4cb8-a189-7a6f75de331c'; -- dinling Dan
UPDATE affiliates SET baseline_leads = 336  WHERE id = 'a5baa527-3fdb-47e6-80b4-82bd64a80ec7'; -- sh0cker Marcelo
UPDATE affiliates SET baseline_leads = 314  WHERE id = '33f3358e-e5b6-46d7-8de7-36e209d8bbb8'; -- Flokie Jesper
UPDATE affiliates SET baseline_leads = 288  WHERE id = 'a4986fee-3f4a-44c0-b40a-edaf0f249d0d'; -- Deathwingua Nikita
UPDATE affiliates SET baseline_leads = 257  WHERE id = 'a6802a19-a3de-4db8-98dd-ad3fc3c4eecf'; -- PRODI Ivan
UPDATE affiliates SET baseline_leads = 159  WHERE id = '18110810-6a04-424b-b910-2af7462007da'; -- Gorliac Luis
UPDATE affiliates SET baseline_leads = 150  WHERE id = '62e3b41d-763f-44e2-933b-1b99baff77db'; -- Clinky Clinky
UPDATE affiliates SET baseline_leads = 145  WHERE id = '322816ba-2f75-4a32-87f5-adde512f2e4f'; -- Pyro0 Cyril
UPDATE affiliates SET baseline_leads = 128  WHERE id = '308ea86d-7787-44ad-8856-20c33f3faa9b'; -- Alex Rust Alex
UPDATE affiliates SET baseline_leads = 126  WHERE id = '5827daab-432b-40d6-9625-fc27a552bd9f'; -- BBraden Braden
UPDATE affiliates SET baseline_leads = 79   WHERE id = 'cfc9585f-a222-4580-bf41-279ea238de4c'; -- wash Jonas
UPDATE affiliates SET baseline_leads = 73   WHERE id = 'a440da46-a31b-4c14-babe-49acb3953308'; -- Griffin Rachford
UPDATE affiliates SET baseline_leads = 65   WHERE id = 'f853d93c-8353-4d9c-8e98-98e125aef867'; -- Tonza Rust Toni
UPDATE affiliates SET baseline_leads = 65   WHERE id = 'cbd47cd7-ab47-4213-a443-00f001c0e746'; -- yss
UPDATE affiliates SET baseline_leads = 57   WHERE id = 'b624c4a8-5c51-48cf-b5c7-13dbe19b2403'; -- Blue Bubs
UPDATE affiliates SET baseline_leads = 49   WHERE id = '0c1eafe3-0f46-4bd8-b4f0-1d003eb6a82c'; -- AndreRossi André
UPDATE affiliates SET baseline_leads = 48   WHERE id = 'abcb9edb-25b4-4af2-a315-1f890ead2083'; -- leagueofhu3br Gabriel
UPDATE affiliates SET baseline_leads = 47   WHERE id = 'f2fc9edd-922d-428a-99bf-9aea089cc15a'; -- LEDOO LEDOO
UPDATE affiliates SET baseline_leads = 44   WHERE id = '1fe09c8b-1554-4f68-a9f7-c7380638f767'; -- OT Lewis
UPDATE affiliates SET baseline_leads = 31   WHERE id = 'fe712e48-3619-4379-9799-0e8a99223f07'; -- perzzon Emil
UPDATE affiliates SET baseline_leads = 25   WHERE id = '37494d0f-f77a-4360-98ad-a3d1a0c16cf7'; -- NAZ Tristan
UPDATE affiliates SET baseline_leads = 24   WHERE id = 'ca205a0b-27f5-4fec-bd0c-67309f66771b'; -- Tanizen Agustin
UPDATE affiliates SET baseline_leads = 20   WHERE id = '5ca92a16-7987-4842-b32a-73e8de39f0f5'; -- Matti Matti
UPDATE affiliates SET baseline_leads = 14   WHERE id = '6bbc24d1-a537-4da1-827a-38b9b9c20cf3'; -- UltraViolet Benjamin
UPDATE affiliates SET baseline_leads = 13   WHERE id = '3dd25e9b-1c5a-462b-b36e-320aa43de67c'; -- ScrimScene Joel
UPDATE affiliates SET baseline_leads = 12   WHERE id = '8e6a26eb-7694-4e47-9431-8a7a72cf2304'; -- 3ez Ezz
UPDATE affiliates SET baseline_leads = 9    WHERE id = '5cba8395-e22f-4a02-9c48-fdb11d0af586'; -- Kickz Corey
UPDATE affiliates SET baseline_leads = 8    WHERE id = '926147bb-5f36-45a0-983e-499a843ea366'; -- v2unstoppablee Noah
UPDATE affiliates SET baseline_leads = 8    WHERE id = 'aabffaeb-2284-4d07-b42c-153e90ca4bed'; -- lucas
UPDATE affiliates SET baseline_leads = 6    WHERE id = '11b85477-48d6-41d2-a033-6df1067aaad1'; -- Lee Matthew
UPDATE affiliates SET baseline_leads = 5    WHERE id = '5c89155f-a165-4d1d-a9e5-775d1174c98b'; -- Rem Domenic Fuoco
UPDATE affiliates SET baseline_leads = 3    WHERE id = 'b5ead876-7604-4099-ac5b-45ca79c8c6e7'; -- 144Rust
UPDATE affiliates SET baseline_leads = 3    WHERE id = '22c78284-1c81-4720-90e3-14139fef1e86'; -- Energy Zack
UPDATE affiliates SET baseline_leads = 2    WHERE id = 'e940117f-3bc0-479b-a787-747b4102427e'; -- imVertzo Ruben
UPDATE affiliates SET baseline_leads = 2    WHERE id = '68e4e748-2460-4d0e-9d4b-ffa1687a5d7e'; -- Lost Lost
UPDATE affiliates SET baseline_leads = 2    WHERE id = '923e65dc-59dc-418c-84fe-6c8ad3d8681b'; -- Disfigure Ryan
UPDATE affiliates SET baseline_leads = 1    WHERE id = 'b57fd114-7b89-472f-b1bb-287475a6dc63'; -- Riqqeloff Riku
UPDATE affiliates SET baseline_leads = 1    WHERE id = '52fb3d55-f032-4de0-b1dd-ab58661a62af'; -- Ayetrain Marc
UPDATE affiliates SET baseline_leads = 1    WHERE id = 'bec5edc0-f179-4b74-94e2-d1c599a83287'; -- kamil2310 Kamil
