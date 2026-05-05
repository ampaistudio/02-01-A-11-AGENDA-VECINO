-- KAIZEN 10: Procedimientos Almacenados (RPC) para Atomicidad

-- 1. Asegurar columna event_type (Kaizen 1)
ALTER TABLE citizen_request ADD COLUMN IF NOT EXISTS event_type text CHECK (event_type IN ('reunion', 'llamado'));

-- 2. RPC para creación atómica de solicitud y registro
CREATE OR REPLACE FUNCTION create_citizen_request_atomic(
    p_citizen_name text,
    p_citizen_phone text,
    p_topic text,
    p_reason text,
    p_locality text,
    p_neighborhood text,
    p_priority integer,
    p_status text,
    p_agent_id text,
    p_trace_id uuid,
    p_event_type text
) RETURNS uuid AS $$
DECLARE
    v_request_id uuid;
BEGIN
    -- Insertar en citizen_request
    INSERT INTO citizen_request (
        citizen_name, citizen_phone, topic, reason, 
        locality, neighborhood, priority, status, 
        created_by_agent_id, updated_by_agent_id, trace_id, event_type
    ) VALUES (
        p_citizen_name, p_citizen_phone, p_topic, p_reason, 
        p_locality, p_neighborhood, p_priority, p_status, 
        p_agent_id, p_agent_id, p_trace_id, p_event_type
    ) RETURNING id INTO v_request_id;

    -- Insertar en meeting_registry si está aprobado o agendado
    IF p_status IN ('approved', 'scheduled') THEN
        INSERT INTO meeting_registry (
            request_id, requester_name, requester_phone, topic, 
            locality, neighborhood, status, created_by_agent_id
        ) VALUES (
            v_request_id, p_citizen_name, p_citizen_phone, p_topic, 
            p_locality, p_neighborhood, p_status, p_agent_id
        );
    END IF;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
