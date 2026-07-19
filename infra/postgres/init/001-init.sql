CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION aurelinx;

ALTER ROLE aurelinx IN DATABASE aurelinx_db SET search_path TO app, public;
