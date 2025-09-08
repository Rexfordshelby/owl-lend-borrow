import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  MapPin,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from './ChatInterface';
import { formatDistanceToNow, format } from 'date-fns';

interface BorrowRequest {
  id: string;
  start_date: string;
  end_date: string;
  message: string;
  status: string;
  total_cost: number;
  created_at: string;
  last_message_at: string;
  negotiated_rate?: number;
  negotiated_duration_days?: number;
  borrower: {
    id: string;
    full_name: string;
    trust_score: number;
    total_ratings: number;
  } | null;
  item: {
    id: string;
    title: string;
    daily_rate: number;
    hourly_rate?: number;
    is_service: boolean;
    image_urls?: string[];
  } | null;
  conversation?: {
    id: string;
  };
}

const OrderManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (user) {
      fetchRequests();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch requests for items owned by the current user
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          borrower:borrower_id (
            id,
            full_name,
            trust_score,
            total_ratings
          ),
          item:item_id (
            id,
            title,
            daily_rate,
            hourly_rate,
            is_service,
            image_urls
          ),
          conversations (
            id
          )
        `)
        .eq('owner_id', profile.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []).filter(r => r.borrower && r.item) as any);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'borrow_requests'
        },
        () => {
          fetchRequests(); // Refresh requests on any change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchRequests(); // Refresh to update last_message_at
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Create system message
      await createSystemMessage(requestId, `Request ${action}ed by owner`);

      toast({
        title: `Request ${action}ed`,
        description: `The borrow request has been ${action}ed successfully.`,
      });

      fetchRequests();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} request`,
        variant: "destructive",
      });
    }
  };

  const createSystemMessage = async (requestId: string, content: string) => {
    try {
      // Get or create conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('borrow_request_id', requestId)
        .single();

      if (!conversation) {
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({ borrow_request_id: requestId })
          .select('id')
          .single();
        conversation = newConversation;
      }

      if (conversation) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: null, // System message
            message_type: 'system',
            content
          });
      }
    } catch (error) {
      console.error('Error creating system message:', error);
    }
  };

  const openChat = (request: BorrowRequest) => {
    setSelectedRequest(request);
    setShowChat(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      negotiating: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      active: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getFilteredRequests = (status: string) => {
    if (status === 'pending') {
      return requests.filter(r => ['pending', 'negotiating'].includes(r.status));
    }
    if (status === 'active') {
      return requests.filter(r => ['accepted', 'active'].includes(r.status));
    }
    if (status === 'completed') {
      return requests.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status));
    }
    return requests.filter(r => r.status === status);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <Badge variant="outline" className="text-sm">
          {requests.length} total requests
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({getFilteredRequests('pending').length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Active ({getFilteredRequests('active').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Completed ({getFilteredRequests('completed').length})
          </TabsTrigger>
        </TabsList>

        {['pending', 'active', 'completed'].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            {getFilteredRequests(tabValue).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground text-lg">
                    No {tabValue} requests found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              getFilteredRequests(tabValue).map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{request.item?.title}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {request.negotiated_rate || (request.item.is_service ? request.item.hourly_rate : request.item.daily_rate)}/
                            {request.item.is_service ? 'hour' : 'day'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(request.last_message_at || request.created_at))} ago
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Borrower Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" alt={request.borrower.full_name} />
                          <AvatarFallback className="bg-temple-red-soft text-temple-red">
                            {getInitials(request.borrower.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.borrower.full_name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>⭐ {request.borrower.trust_score?.toFixed(1)}</span>
                            <span>({request.borrower.total_ratings} reviews)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-temple-red">
                          ${(request.negotiated_rate || request.total_cost || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total cost</p>
                      </div>
                    </div>

                    {/* Message */}
                    {request.message && (
                      <div className="bg-neutral-50 p-3 rounded-lg">
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openChat(request)}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat & Negotiate
                      </Button>

                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="temple"
                            size="sm"
                            onClick={() => handleAction(request.id, 'accept')}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAction(request.id, 'reject')}
                            className="flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </Button>
                        </>
                      )}

                      {request.status === 'negotiating' && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Negotiating...
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Chat Interface */}
      {showChat && selectedRequest && (
        <ChatInterface
          request={selectedRequest}
          onClose={() => {
            setShowChat(false);
            setSelectedRequest(null);
            fetchRequests(); // Refresh to get updated data
          }}
        />
      )}
    </div>
  );
};

export default OrderManagement;