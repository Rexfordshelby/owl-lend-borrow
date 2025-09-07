-- Fix security warning for function search path
CREATE OR REPLACE FUNCTION calculate_total_cost(
    item_id_param uuid,
    start_date_param date,
    end_date_param date
) RETURNS numeric AS $$
DECLARE
    item_record RECORD;
    days_count integer;
    total numeric;
BEGIN
    -- Get item details
    SELECT daily_rate, hourly_rate, is_service, deposit_amount 
    INTO item_record 
    FROM items 
    WHERE id = item_id_param;
    
    -- Calculate duration
    days_count := end_date_param - start_date_param + 1;
    
    -- Calculate cost based on item type
    IF item_record.is_service THEN
        -- For services, use hourly rate (assuming 8 hours per day)
        total := COALESCE(item_record.hourly_rate, 0) * days_count * 8;
    ELSE
        -- For items, use daily rate
        total := COALESCE(item_record.daily_rate, 0) * days_count;
    END IF;
    
    -- Add deposit
    total := total + COALESCE(item_record.deposit_amount, 0);
    
    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;