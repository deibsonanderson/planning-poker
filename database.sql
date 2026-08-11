CREATE DATABASE IF NOT EXISTS planning_poker;
USE planning_poker;

CREATE TABLE IF NOT EXISTS tb_poker_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_poker_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    created_by INT,
    status ENUM('voting','revealed') DEFAULT 'voting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_poker_room_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    user_id INT,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_poker_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    user_id INT,
    value VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_poker_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    type VARCHAR(50),
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados
CREATE INDEX idx_events_room_id ON tb_poker_events(room_id);
CREATE INDEX idx_votes_room_id ON tb_poker_votes(room_id);
CREATE INDEX idx_room_users_room_id ON tb_poker_room_users(room_id);
