CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION aurelius;

ALTER ROLE aurelius IN DATABASE aurelius_db SET search_path TO app, public;
