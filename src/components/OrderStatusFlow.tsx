import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  MessageCircle, 
  CheckCircle, 
  CreditCard, 
  Package, 
  Star,
  AlertCircle,
  XCircle 
} from 'lucide-react';

interface OrderStatusFlowProps {
  request: any;
  onOpenChat: () => void;
  onCompleteOrder?: () => void;
  onLeaveReview?: () => void;
}

const OrderStatusFlow: React.FC<OrderStatusFlowProps> = ({ 
  request, 
  onOpenChat, 
  onCompleteOrder, 
  onLeaveReview 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          title: 'Awaiting Response',
          description: 'Waiting for owner to respond to your request',
          actions: ['chat']
        };
      case 'negotiating':
        return {
          icon: MessageCircle,
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800',
          title: 'In Negotiation',
          description: 'Discussing terms and conditions',
          actions: ['chat']
        };
      case 'accepted':
        return {
          icon: CheckCircle,
          color: 'bg-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          title: 'Order Accepted',
          description: request.payment_status === 'completed' ? 'Payment completed, awaiting delivery' : 'Please complete payment',
          actions: request.payment_status === 'completed' ? ['chat', 'complete'] : ['chat', 'payment']
        };
      case 'in_progress':
        return {
          icon: Package,
          color: 'bg-purple-500',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-800',
          title: 'In Progress',
          description: 'Item/Service is being provided',
          actions: ['chat', 'complete']
        };
      case 'completed':
        return {
          icon: Star,
          color: 'bg-emerald-500',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-800',
          title: 'Completed',
          description: 'Order has been completed successfully',
          actions: ['review']
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          title: 'Cancelled',
          description: 'Order was cancelled',
          actions: []
        };
      case 'rejected':
        return {
          icon: AlertCircle,
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          title: 'Rejected',
          description: 'Owner declined your request',
          actions: []
        };
      default:
        return {
          icon: Clock,
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          title: 'Unknown Status',
          description: 'Status unknown',
          actions: []
        };
    }
  };

  const config = getStatusConfig(request.status);
  const StatusIcon = config.icon;

  const getPaymentStatusBadge = () => {
    if (!request.payment_status) return null;
    
    const paymentConfig = {
      pending: { label: 'Payment Pending', variant: 'outline' as const },
      completed: { label: 'Paid', variant: 'default' as const },
      failed: { label: 'Payment Failed', variant: 'destructive' as const },
    };
    
    const paymentInfo = paymentConfig[request.payment_status as keyof typeof paymentConfig];
    if (!paymentInfo) return null;
    
    return (
      <Badge variant={paymentInfo.variant} className="ml-2">
        {paymentInfo.label}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.color}`}>
            <StatusIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{config.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex items-center">
            <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
            {getPaymentStatusBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Request</span>
            <span>Negotiate</span>
            <span>Accept</span>
            <span>Complete</span>
          </div>
          <div className="flex items-center">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${config.color} transition-all duration-500`}
                style={{
                  width: 
                    request.status === 'pending' ? '25%' :
                    request.status === 'negotiating' ? '50%' :
                    request.status === 'accepted' || request.status === 'in_progress' ? '75%' :
                    request.status === 'completed' ? '100%' : '0%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {config.actions.includes('chat') && (
            <Button 
              onClick={onOpenChat}
              variant="outline"
              size="sm"
              className="border-temple-red text-temple-red hover:bg-temple-red hover:text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Chat
            </Button>
          )}
          
          {config.actions.includes('payment') && (
            <Button 
              onClick={onOpenChat}
              size="sm"
              className="bg-temple-red hover:bg-temple-red-dark text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Complete Payment
            </Button>
          )}
          
          {config.actions.includes('complete') && onCompleteOrder && (
            <Button 
              onClick={onCompleteOrder}
              size="sm"
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          
          {config.actions.includes('review') && onLeaveReview && (
            <Button 
              onClick={onLeaveReview}
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Star className="h-4 w-4 mr-2" />
              Leave Review
            </Button>
          )}
        </div>

        {/* Additional Info */}
        {request.negotiated_rate && (
          <div className="mt-4 p-3 bg-temple-red-soft rounded-lg">
            <p className="text-sm font-medium text-temple-red">
              Final Terms: ${request.negotiated_rate}/{request.item?.is_service ? 'hour' : 'day'} × {request.negotiated_duration_days} days
            </p>
            <p className="text-lg font-bold text-temple-red">
              Total: ${(request.negotiated_rate * request.negotiated_duration_days).toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderStatusFlow;