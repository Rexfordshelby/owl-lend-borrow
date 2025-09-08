-- Add chat and enhanced order management tables
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_request_id UUID REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'offer', 'system'
  content TEXT NOT NULL,
  offer_amount NUMERIC,
  offer_duration_days INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add more detailed status to borrow_requests
ALTER TABLE public.borrow_requests 
ADD COLUMN IF NOT EXISTS negotiated_rate NUMERIC,
ADD COLUMN IF NOT EXISTS negotiated_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- Update status enum to include more states
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status_new') THEN
        CREATE TYPE request_status_new AS ENUM (
            'pending', 
            'negotiating', 
            'accepted', 
            'rejected', 
            'cancelled', 
            'active', 
            'completed',
            'overdue'
        );
        
        -- Migrate existing data
        ALTER TABLE public.borrow_requests 
        ALTER COLUMN status DROP DEFAULT,
        ALTER COLUMN status TYPE request_status_new USING status::text::request_status_new,
        ALTER COLUMN status SET DEFAULT 'pending'::request_status_new;
        
        -- Drop old enum
        DROP TYPE IF EXISTS request_status;
        
        -- Rename new enum
        ALTER TYPE request_status_new RENAME TO request_status;
    END IF;
END
$$;

-- Enable RLS for new tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view conversations for their requests" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.borrow_requests br
    INNER JOIN public.profiles p ON (p.id = br.borrower_id OR p.id = br.owner_id)
    WHERE br.id = conversations.borrow_request_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations for their requests" ON public.conversations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.borrow_requests br
    INNER JOIN public.profiles p ON (p.id = br.borrower_id OR p.id = br.owner_id)
    WHERE br.id = conversations.borrow_request_id 
    AND p.user_id = auth.uid()
  )
);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.borrow_requests br ON br.id = c.borrow_request_id
    INNER JOIN public.profiles p ON (p.id = br.borrower_id OR p.id = br.owner_id)
    WHERE c.id = messages.conversation_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations" ON public.messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.borrow_requests br ON br.id = c.borrow_request_id
    INNER JOIN public.profiles p ON (p.id = br.borrower_id OR p.id = br.owner_id)
    WHERE c.id = messages.conversation_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (
  sender_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create indexes for performance (avoiding existing ones)
CREATE INDEX IF NOT EXISTS idx_conversations_request_id ON public.conversations(borrow_request_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_last_message ON public.borrow_requests(last_message_at);

-- Create triggers for updating timestamps
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update last_message_at on borrow_requests
CREATE OR REPLACE FUNCTION update_request_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.borrow_requests 
  SET last_message_at = NEW.created_at
  WHERE id = (
    SELECT borrow_request_id 
    FROM public.conversations 
    WHERE id = NEW.conversation_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_request_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_request_last_message();