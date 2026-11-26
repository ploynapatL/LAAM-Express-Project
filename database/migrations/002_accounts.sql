BEGIN;

CREATE TABLE web_account (
    account_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(40) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    password_version INTEGER NOT NULL DEFAULT 1,
    customer_id INTEGER UNIQUE REFERENCES customer(customer_id),
    employee_id INTEGER UNIQUE REFERENCES employee(employee_id),
    CHECK ((customer_id IS NULL) <> (employee_id IS NULL))
);

CREATE UNIQUE INDEX web_account_username_key ON web_account (lower(username));
CREATE UNIQUE INDEX web_account_email_key ON web_account (lower(email));

CREATE TABLE web_session (
    token_hash TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES web_account(account_id) ON DELETE CASCADE,
    password_version INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX web_session_expires_at_idx ON web_session (expires_at);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laam_backend_reader') THEN
        GRANT INSERT (name, phone, email, customer_type), SELECT (customer_id)
            ON customer TO laam_backend_reader;
        GRANT SELECT (customer_id, order_date) ON orders TO laam_backend_reader;
        GRANT SELECT, INSERT (username, email, password_hash, customer_id),
            UPDATE (password_hash, password_version) ON web_account TO laam_backend_reader;
        GRANT SELECT, INSERT, DELETE ON web_session TO laam_backend_reader;
    END IF;
END;
$$;

COMMIT;
