
-- Meta tables (BUSY definitions)
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  layer TEXT NOT NULL,
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  inherits_from_id INTEGER REFERENCES roles(id),
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  cadence_config TEXT,
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  schema_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_id INTEGER REFERENCES playbooks(id),
  role_id INTEGER REFERENCES roles(id),
  name TEXT NOT NULL,
  description TEXT,
  execution_type TEXT NOT NULL,
  estimated_duration TEXT,
  config_json TEXT,
  order_index INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  import_type TEXT NOT NULL,
  name TEXT NOT NULL,
  capability TEXT NOT NULL,
  config_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Runtime tables (process instances)
CREATE TABLE playbook_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_id INTEGER REFERENCES playbooks(id),
  status TEXT DEFAULT 'started',
  client_name TEXT,
  client_folder_path TEXT,
  current_step INTEGER DEFAULT 0,
  data_json TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_instance_id INTEGER REFERENCES playbook_instances(id),
  task_id INTEGER REFERENCES tasks(id),
  status TEXT DEFAULT 'pending',
  assigned_role_id INTEGER REFERENCES roles(id),
  input_data_json TEXT,
  output_data_json TEXT,
  notes TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER REFERENCES documents(id),
  playbook_instance_id INTEGER REFERENCES playbook_instances(id),
  task_instance_id INTEGER REFERENCES task_instances(id),
  file_path TEXT,
  data_json TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER NOT NULL,
  instance_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  user_id TEXT,
  notes TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Indexes for performance
CREATE INDEX idx_playbook_instances_status ON playbook_instances(status);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_task_instances_playbook ON task_instances(playbook_instance_id);
CREATE INDEX idx_state_transitions_instance ON state_transitions(instance_id, instance_type);
CREATE INDEX idx_teams_layer ON teams(layer);
CREATE INDEX idx_tasks_playbook ON tasks(playbook_id);
