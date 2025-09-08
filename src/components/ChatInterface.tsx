import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Handshake,
  Clock,
  MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string | null;
  message_type: string;
  content: string;
  offer_amount?: number;
  offer_duration_days?: number;
  is_read: boolean;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

interface ChatInterfaceProps {
  request: any;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ request, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerDays, setOfferDays] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      initializeChat();
      getCurrentProfile();
    }
  }, [user, request]);

  useEffect(() => {
    if (conversation?.id) {
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    setCurrentProfile(data);
  };

  const initializeChat = async () => {
    try {
      // Check if conversation exists
      let { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('borrow_request_id', request.id)
        .single();

      if (!existingConv) {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({ borrow_request_id: request.id })
          .select('*')
          .single();

        if (error) throw error;
        existingConv = newConv;
      }

      setConversation(existingConv);
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async () => {
    if (!conversation?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            full_name
          )
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversation.id)
        .neq('sender_id', currentProfile?.id);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation?.id || !currentProfile?.id) return;

    setIsTyping(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentProfile.id,
          message_type: 'text',
          content: newMessage
        });

      if (error) throw error;

      // Update request status to negotiating if it's pending
      if (request.status === 'pending') {
        await supabase
          .from('borrow_requests')
          .update({ status: 'negotiating' })
          .eq('id', request.id);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const sendOffer = async () => {
    if (!offerAmount || !offerDays || !conversation?.id || !currentProfile?.id) return;

    try {
      const amount = parseFloat(offerAmount);
      const days = parseInt(offerDays);

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentProfile.id,
          message_type: 'offer',
          content: `Offer: $${amount}/${request.item.is_service ? 'hour' : 'day'} for ${days} days`,
          offer_amount: amount,
          offer_duration_days: days
        });

      if (error) throw error;

      // Update request status to negotiating
      await supabase
        .from('borrow_requests')
        .update({ 
          status: 'negotiating',
          negotiated_rate: amount,
          negotiated_duration_days: days
        })
        .eq('id', request.id);

      setShowOfferForm(false);
      setOfferAmount('');
      setOfferDays('');

      toast({
        title: "Offer sent",
        description: "Your counter-offer has been sent successfully.",
      });
    } catch (error) {
      console.error('Error sending offer:', error);
      toast({
        title: "Error",
        description: "Failed to send offer",
        variant: "destructive",
      });
    }
  };

  const acceptOffer = async (messageId: string, amount: number, days: number) => {
    try {
      // Update the request with the negotiated terms
      await supabase
        .from('borrow_requests')
        .update({ 
          status: 'accepted',
          negotiated_rate: amount,
          negotiated_duration_days: days,
          total_cost: amount * days
        })
        .eq('id', request.id);

      // Send acceptance message
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentProfile.id,
          message_type: 'system',
          content: `Offer accepted! Final terms: $${amount}/${request.item.is_service ? 'hour' : 'day'} for ${days} days`
        });

      toast({
        title: "Offer accepted!",
        description: "The terms have been agreed upon.",
      });

      // Refresh messages to show the update
      fetchMessages();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast({
        title: "Error",
        description: "Failed to accept offer",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const isOwner = currentProfile?.id === request.owner_id;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-temple-red" />
            Chat & Negotiate - {request.item.title}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              ${request.item.is_service ? request.item.hourly_rate : request.item.daily_rate}/{request.item.is_service ? 'hour' : 'day'}
            </span>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === currentProfile?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] ${
                  message.message_type === 'system'
                    ? 'bg-blue-100 text-blue-800 mx-auto text-center'
                    : message.sender_id === currentProfile?.id
                    ? 'bg-temple-red text-white'
                    : 'bg-white border'
                } rounded-lg p-3 space-y-2`}
              >
                {message.message_type === 'offer' && (
                  <div className="bg-white/20 rounded p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Handshake className="h-4 w-4" />
                      <span className="font-semibold">Counter Offer</span>
                    </div>
                    <p>Rate: ${message.offer_amount}/{request.item.is_service ? 'hour' : 'day'}</p>
                    <p>Duration: {message.offer_duration_days} days</p>
                    <p className="font-semibold">
                      Total: ${((message.offer_amount || 0) * (message.offer_duration_days || 1)).toFixed(2)}
                    </p>
                    
                    {/* Accept/Reject buttons for offers (only for recipients) */}
                    {message.sender_id !== currentProfile?.id && 
                     request.status === 'negotiating' && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => acceptOffer(message.id, message.offer_amount!, message.offer_duration_days!)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                <p>{message.content}</p>
                
                <div className="text-xs opacity-75">
                  {formatDistanceToNow(new Date(message.created_at))} ago
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {request.status !== 'accepted' && request.status !== 'rejected' && (
          <div className="flex-shrink-0 p-4 border-t space-y-3">
            {showOfferForm ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold">Make a Counter Offer</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">
                        Rate (${request.item.is_service ? 'per hour' : 'per day'})
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Duration (days)</label>
                      <Input
                        type="number"
                        placeholder="Days"
                        value={offerDays}
                        onChange={(e) => setOfferDays(e.target.value)}
                      />
                    </div>
                  </div>
                  {offerAmount && offerDays && (
                    <div className="bg-temple-red-soft p-2 rounded">
                      <p className="text-sm font-medium">
                        Total: ${(parseFloat(offerAmount) * parseInt(offerDays)).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={sendOffer} disabled={!offerAmount || !offerDays}>
                      Send Offer
                    </Button>
                    <Button variant="outline" onClick={() => setShowOfferForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isTyping}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim() || isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOfferForm(true)}
                  className="whitespace-nowrap"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Counter Offer
                </Button>
              </div>
            )}
          </div>
        )}

        {(request.status === 'accepted' || request.status === 'rejected') && (
          <div className="flex-shrink-0 p-4 border-t">
            <div className="text-center text-muted-foreground">
              <p>This conversation has ended. The request has been {request.status}.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatInterface;