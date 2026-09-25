CREATE TABLE lots(
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	capacity INTEGER NOT NULL,
	occupancy INTEGER NOT NULL DEFAULT 0,
	is_open BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'guest',
	lot_id INTEGER REFERENCES lots(id)
);

INSERT INTO lots (name, capacity, occupancy, is_open) VALUES
	('Confluence Paved Lot' , 50, 0, true),
	('Confluence-Asteria unpaved Lot' , 100, 0, true),
	('Asteria unpaved Lot', 70, 0, true),
	('Parking Garage UC', 100, 0, true),
	('Parking Garage RugbyPitch', 200, 0, true),
	('Parking Garage Gym', 50, 0, true),
	('ResLot 12th Street Premium', 30, 0, true),
	('ResLot 12th Street General', 70, 0, true),
	('ResLot Garfield', 70, 0, true),
	('ResLot Bunting', 40, 0, true),
	('ResLot Bunting Unpaved',50, 0, true)
;


INSERT INTO users (username, password_hash, role) VALUES
	('admin', '$2b$10$Vh.SBji3P6rwcW11G0v3lOQxMY2byjJx3x4CMz1dZIG5.Vlwzw2uK', 'admin')
	ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;


