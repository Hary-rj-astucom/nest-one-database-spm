CREATE DATABASE spm_call_register;
ALTER DATABASE spm_call_register CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

use spm_call_register;

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ivr_id VARCHAR(45) NOT NULL,
  client_name VARCHAR(45) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `call` (
  id VARCHAR(255) PRIMARY KEY,
  call_id VARCHAR(255),
  date_start VARCHAR(45) NULL,
  date_answer VARCHAR(45) NULL,
  user_id VARCHAR(45),
  user_name VARCHAR(45),
  direction VARCHAR(20),
  duration INT,
  from_number VARCHAR(25),
  to_number VARCHAR(25),
  is_answered BOOLEAN,
  last_state VARCHAR(25),
  tags JSON,
  raw_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  historique_lecture_id INT,
  ChannelID VARCHAR(45),
  `type` VARCHAR(45),
  HangupTime VARCHAR(45) NULL,
  InCallDuration DECIMAL(20,2),
  QueueDuration DECIMAL(20,6),
  HoldDuration DECIMAL(20,6),
  RingingDuration DECIMAL(20,6),
  AfterCallDuration DECIMAL(20,6),
  IVRDuration DECIMAL(20,6),
  contact  VARCHAR(255),
  IVRID  VARCHAR(50),
  ScenarioName TEXT,
  `File` VARCHAR(255),
  Note VARCHAR(255),
  HangupBy VARCHAR(255),
  `Groups` VARCHAR(255),
  Notes VARCHAR(255),
  Locations TEXT,
  DigitEntered TEXT,
  Missed DATETIME
);

CREATE TABLE empower_stats (
  empower_id INT AUTO_INCREMENT PRIMARY KEY,
  call_uuid VARCHAR(255),
  call_id VARCHAR(255) UNIQUE,
  score_global FLOAT,
  customer_sentiment VARCHAR(255),
  moments JSON,
  transcription TEXT,
  raw_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  export_type ENUM('csv_stats', 'csv_empower') NOT NULL,
  file_path TEXT NOT NULL,
  `status` ENUM('success', 'failed') DEFAULT 'failed',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  historique_lecture_id INT NOT NULL
);

CREATE TABLE historique_lecture (
  id SERIAL NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  `status` ENUM('success', 'failed') DEFAULT 'failed',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  file_type ENUM('csv_stats', 'csv_empower') NOT NULL
);

