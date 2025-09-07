-- TempleBorrow Database Schema

-- Create enum for item categories
CREATE TYPE public.item_category AS ENUM (
  'books',
  'electronics',
  'notes',
  'bikes',
  'sports_equipment',
  'tools',
  'clothing',
  'furniture',
  'other'
);

-- Create enum for borrow request status
CREATE TYPE public.request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'borrowed',
  'returned',
  'overdue'
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  temple_id TEXT,
  major TEXT,
  year_of_study TEXT,
  bio TEXT,
  trust_score DECIMAL(3,2) DEFAULT 5.00 CHECK (trust_score >= 0 AND trust_score <= 5),
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.item_category NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  daily_rate DECIMAL(10,2),
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  image_urls TEXT[],
  location TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create borrow_requests table
CREATE TABLE public.borrow_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.request_status DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,
  owner_response TEXT,
  actual_return_date DATE,
  total_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrow_request_id UUID NOT NULL REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('borrower', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('request', 'approval', 'rejection', 'reminder', 'review')),
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for items
CREATE POLICY "Items are viewable by everyone" ON public.items FOR SELECT USING (true);
CREATE POLICY "Users can create their own items" ON public.items FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));
CREATE POLICY "Users can update their own items" ON public.items FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));
CREATE POLICY "Users can delete their own items" ON public.items FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));

-- Create RLS policies for borrow_requests
CREATE POLICY "Users can view their own borrow requests" ON public.borrow_requests FOR SELECT 
USING (
  auth.uid() = (SELECT user_id FROM public.profiles WHERE id = borrower_id) OR 
  auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id)
);
CREATE POLICY "Users can create borrow requests" ON public.borrow_requests FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = borrower_id));
CREATE POLICY "Users can update their relevant borrow requests" ON public.borrow_requests FOR UPDATE 
USING (
  auth.uid() = (SELECT user_id FROM public.profiles WHERE id = borrower_id) OR 
  auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id)
);

-- Create RLS policies for reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = reviewer_id));

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = user_id));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE 
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = user_id));

-- Create indexes for better performance
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_owner ON public.items(owner_id);
CREATE INDEX idx_items_available ON public.items(is_available);
CREATE INDEX idx_borrow_requests_status ON public.borrow_requests(status);
CREATE INDEX idx_borrow_requests_borrower ON public.borrow_requests(borrower_id);
CREATE INDEX idx_borrow_requests_owner ON public.borrow_requests(owner_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_borrow_requests_updated_at
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();