-- Add storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);

-- Create policies for chat image uploads
CREATE POLICY "Chat images are viewable by authenticated users" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload chat images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own chat images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

-- Add image_url column to messages table for image attachments
ALTER TABLE public.messages ADD COLUMN image_url TEXT;

-- Add payment columns to borrow_requests table
ALTER TABLE public.borrow_requests ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE public.borrow_requests ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.borrow_requests ADD COLUMN payment_amount NUMERIC;