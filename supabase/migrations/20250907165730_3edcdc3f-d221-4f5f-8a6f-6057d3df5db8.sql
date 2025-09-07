-- Fix condition enum and add services support
ALTER TYPE item_category ADD VALUE IF NOT EXISTS 'services';

-- Drop the problematic condition constraint and recreate with proper enum
DO $$
BEGIN
    -- Drop constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'items_condition_check' 
               AND table_name = 'items') THEN
        ALTER TABLE public.items DROP CONSTRAINT items_condition_check;
    END IF;
END
$$;

-- Create condition enum type
CREATE TYPE IF NOT EXISTS item_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

-- Update items table to use proper condition enum
ALTER TABLE public.items ALTER COLUMN condition TYPE item_condition USING condition::item_condition;

-- Add service-specific fields to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS hourly_rate numeric,
ADD COLUMN IF NOT EXISTS is_service boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS service_type text,
ADD COLUMN IF NOT EXISTS availability_schedule text[];

-- Update existing items to be products by default
UPDATE public.items SET is_service = false WHERE is_service IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_is_service ON public.items(is_service);
CREATE INDEX IF NOT EXISTS idx_items_category_service ON public.items(category, is_service);

-- Create function to update borrow requests total cost based on service/item type
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
$$ LANGUAGE plpgsql STABLE;