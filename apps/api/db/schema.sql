CREATE TABLE IF NOT EXISTS projects (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text    NOT NULL UNIQUE,
  title       text    NOT NULL,
  summary     text    NOT NULL,
  description text    NOT NULL,
  stack       text[]  NOT NULL DEFAULT '{}',
  year        integer NOT NULL
);
