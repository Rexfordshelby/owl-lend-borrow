import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, MessageCircle, Star } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentSuccessProps {
  requestId?: string;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ requestId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const request = searchParams.get('request');

  useEffect(() => {
    if (request || requestId) {
      // Update payment status to completed
      updatePaymentStatus(request || requestId!);
      
      toast({
        title: "Payment Successful! 🎉",
        description: "Your payment has been processed successfully. The owner has been notified.",
        duration: 5000,
      });
    }
  }, [request, requestId, toast]);

  const updatePaymentStatus = async (reqId: string) => {
    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({ 
          payment_status: 'completed',
          status: 'active'
        })
        .eq('id', reqId);

      if (error) {
        console.error('Error updating payment status:', error);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-success-soft to-primary-soft">
      <Card className="w-full max-w-md shadow-glow animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center mx-auto animate-glow">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-success">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Your payment has been processed successfully. The item owner has been notified and will contact you soon.
            </p>
            <Badge variant="secondary" className="bg-success-soft text-success">
              <Package className="h-3 w-3 mr-1" />
              Order Confirmed
            </Badge>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">What's Next?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                The owner will contact you about pickup/delivery
              </li>
              <li className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                You'll receive the item as agreed
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Don't forget to leave a review after use
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/orders')}
              className="flex-1"
              variant="premium"
            >
              View Orders
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              Browse More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;