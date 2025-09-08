import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from './ChatInterface';
import { formatDistanceToNow, format } from 'date-fns';

interface MyBorrowRequest {
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
  owner: {
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

const MyRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MyBorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MyBorrowRequest | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyRequests();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    if (!user) return;

    try {
      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch requests made by the current user
      const { data, error } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          owner:owner_id (
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
        .eq('borrower_id', profile.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []).filter(r => r.owner && r.item) as any);
    } catch (error) {
      console.error('Error fetching my requests:', error);
      toast({
        title: "Error",
        description: "Failed to load your requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('my-requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'borrow_requests'
        },
        () => {
          fetchMyRequests(); // Refresh requests on any change
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
          fetchMyRequests(); // Refresh to update last_message_at
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your borrow request has been cancelled.",
      });

      fetchMyRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  const openChat = (request: MyBorrowRequest) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'negotiating':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
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
        <h2 className="text-2xl font-bold">My Borrow Requests</h2>
        <Badge variant="outline" className="text-sm">
          {requests.length} total requests
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              You haven't made any borrow requests yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Browse items and services to make your first request!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{request.item?.title}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {request.negotiated_rate || (request.item?.is_service ? request.item?.hourly_rate : request.item?.daily_rate)}/
                        {request.item?.is_service ? 'hour' : 'day'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(request.last_message_at || request.created_at))} ago
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Owner Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={request.owner?.full_name} />
                      <AvatarFallback className="bg-temple-red-soft text-temple-red">
                        {request.owner ? getInitials(request.owner.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.owner?.full_name || 'Unknown Owner'}</p>
                      {request.owner?.trust_score && request.owner?.total_ratings && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{request.owner.trust_score.toFixed(1)}</span>
                          <span>({request.owner.total_ratings} reviews)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-temple-red">
                      ${(request.negotiated_rate ? 
                        request.negotiated_rate * (request.negotiated_duration_days || 1) : 
                        request.total_cost || 0).toFixed(2)}
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

                {/* Status specific info */}
                {request.status === 'accepted' && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium">
                      🎉 Request accepted! You can now coordinate pickup with the owner.
                    </p>
                  </div>
                )}

                {request.status === 'rejected' && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      Request was declined by the owner.
                    </p>
                  </div>
                )}

                {request.status === 'negotiating' && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💬 Negotiation in progress. Continue chatting to agree on terms.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {['pending', 'negotiating', 'accepted'].includes(request.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openChat(request)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {request.status === 'accepted' ? 'Contact Owner' : 'Chat & Negotiate'}
                    </Button>
                  )}

                  {['pending', 'negotiating'].includes(request.status) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelRequest(request.id)}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel Request
                    </Button>
                  )}

                  {request.status === 'completed' && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✅ Completed
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Interface */}
      {showChat && selectedRequest && (
        <ChatInterface
          request={selectedRequest}
          onClose={() => {
            setShowChat(false);
            setSelectedRequest(null);
            fetchMyRequests(); // Refresh to get updated data
          }}
        />
      )}
    </div>
  );
};

export default MyRequests;