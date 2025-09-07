import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BorrowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title: string;
    daily_rate?: number;
    owner?: {
      full_name: string;
    };
    profiles?: {
      full_name: string;
    };
  };
}

const BorrowRequestModal: React.FC<BorrowRequestModalProps> = ({ isOpen, onClose, item }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const calculateTotalCost = () => {
    if (!startDate || !endDate || !item.daily_rate) return 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days * item.daily_rate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate || !endDate) return;

    setLoading(true);
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Get item owner profile
      const { data: itemData } = await supabase
        .from('items')
        .select('owner_id')
        .eq('id', item.id)
        .single();

      if (!itemData) throw new Error('Item not found');

      // Create borrow request
      const { error } = await supabase.from('borrow_requests').insert({
        item_id: item.id,
        borrower_id: profile.id,
        owner_id: itemData.owner_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        message,
        total_cost: calculateTotalCost(),
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Request Sent!",
        description: `Your borrow request for "${item.title}" has been sent to ${item.owner.full_name}.`,
      });

      onClose();
      setStartDate(undefined);
      setEndDate(undefined);
      setMessage('');
    } catch (error) {
      console.error('Error creating borrow request:', error);
      toast({
        title: "Error",
        description: "Failed to send borrow request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Borrow Request</DialogTitle>
          <DialogDescription>
            Send a request to borrow "{item.title}" from {item.owner?.full_name || item.profiles?.full_name || 'the owner'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {item.daily_rate && startDate && endDate && (
            <div className="bg-temple-red-soft/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-temple-red">
                <Calculator className="h-4 w-4" />
                <span className="font-medium">
                  Total Cost: ${calculateTotalCost().toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days × ${item.daily_rate}/day
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to the owner..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="temple" 
              className="flex-1"
              disabled={!startDate || !endDate || loading}
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowRequestModal;