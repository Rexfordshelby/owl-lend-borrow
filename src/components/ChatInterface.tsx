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
  MessageCircle,
  ImageIcon,
  CreditCard,
  MapPin,
  User,
  Phone,
  Paperclip,
  MoreVertical,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
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
  image_url?: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [offerDuration, setOfferDuration] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    deliveryAddress: '',
    contactPhone: '',
    specialInstructions: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = user?.id === request.item?.owner_id;
  const otherUser = isOwner ? request.borrower : request.item?.owner;

  useEffect(() => {
    loadConversation();
    loadMessages();
  }, [request.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('borrow_request_id', request.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading conversation:', error);
        return;
      }

      if (data) {
        setConversation(data);
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({ borrow_request_id: request.id })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          return;
        }
        setConversation(newConversation);
      }
    } catch (error) {
      console.error('Error in loadConversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: conversationData } = await supabase
        .from('conversations')
        .select('id')
        .eq('borrow_request_id', request.id)
        .single();

      if (!conversationData) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name)
        `)
        .eq('conversation_id', conversationData.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  };

  const sendMessage = async (messageType: string = 'text', content: string = newMessage, extraData: any = {}) => {
    if (!conversation) return;
    if (messageType === 'text' && !content.trim()) return;

    setIsLoading(true);
    setIsTyping(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) {
        toast({
          title: "Error",
          description: "Profile not found",
          variant: "destructive",
        });
        return;
      }

      const messageData = {
        conversation_id: conversation.id,
        sender_id: profileData.id,
        message_type: messageType,
        content: content,
        ...extraData,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:sender_id(full_name)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return;
      }

      setMessages(prev => [...prev, data]);
      setNewMessage('');
      setOfferAmount('');
      setOfferDuration('');
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const sendOffer = () => {
    if (!offerAmount || !offerDuration) {
      toast({
        title: "Error",
        description: "Please enter both amount and duration",
        variant: "destructive",
      });
      return;
    }

    const content = `I'd like to offer $${offerAmount} for ${offerDuration} days`;
    sendMessage('offer', content, {
      offer_amount: parseFloat(offerAmount),
      offer_duration_days: parseInt(offerDuration),
    });
  };

  const sendPaymentRequest = () => {
    const content = `💳 Payment request: Please click to proceed with payment of $${request.total_cost}`;
    sendMessage('payment_request', content);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `chat-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Error",
          description: "Failed to upload image",
          variant: "destructive",
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      sendMessage('image', 'Shared an image', { image_url: publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOffer = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({
          status: 'accepted',
          negotiated_rate: message.offer_amount,
          negotiated_duration_days: message.offer_duration_days,
        })
        .eq('id', request.id);

      if (error) {
        console.error('Error accepting offer:', error);
        return;
      }

      toast({
        title: "Offer Accepted!",
        description: "The borrower can now proceed with payment.",
      });

      sendMessage('system', '✅ Offer accepted! You can now proceed with payment.');
    } catch (error) {
      console.error('Error in handleAcceptOffer:', error);
    }
  };

  const handlePaymentClick = async () => {
    if (!paymentFormData.deliveryAddress || !paymentFormData.contactPhone) {
      toast({
        title: "Missing Information",
        description: "Please provide delivery address and contact phone",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          requestId: request.id,
          amount: request.total_cost || request.negotiated_rate,
          description: `Rental payment for ${request.item?.title}`,
          deliveryAddress: paymentFormData.deliveryAddress,
          contactPhone: paymentFormData.contactPhone,
          specialInstructions: paymentFormData.specialInstructions,
        },
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Error",
          description: "Failed to create payment session",
          variant: "destructive",
        });
        return;
      }

      // Open payment in new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Payment Processing",
        description: "Secure payment window opened. Complete your payment to finalize the order. This chat will remain open for continued communication.",
        duration: 6000,
      });

      // Keep payment form closed but chat open for continued communication
      setShowPaymentForm(false);
      
      // Send system message about payment initiation
      sendMessage('system', '💳 Payment window opened! Complete your payment to finalize this order. Feel free to continue chatting here.');
    } catch (error) {
      console.error('Error initiating payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/20 text-warning-foreground border-warning/30';
      case 'accepted':
        return 'bg-success/20 text-success-foreground border-success/30';
      case 'completed':
        return 'bg-primary/20 text-primary-foreground border-primary/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isCurrentUser = message.sender_id === (user as any)?.profile?.id;
    const isSystemMessage = message.message_type === 'system';
    const isPaymentRequest = message.message_type === 'payment_request';
    
    if (isSystemMessage) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-muted/60 backdrop-blur-sm text-muted-foreground px-4 py-2 rounded-full text-sm">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4 group animate-fade-in`}>
        <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 max-w-[85%]`}>
          <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
            <AvatarImage src={otherUser?.avatar_url} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-accent/20">
              {message.sender?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            <div className={`
              px-4 py-3 rounded-2xl shadow-bubble backdrop-blur-sm border transition-all duration-300 group-hover:shadow-lg
              ${isCurrentUser 
                ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground border-primary/20' 
                : 'bg-glass-medium border-border/50 text-foreground'
              }
              ${isPaymentRequest ? 'border-primary ring-2 ring-primary/20' : ''}
            `}>
              {message.message_type === 'offer' && (
                <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                  <DollarSign className="h-4 w-4" />
                  <span>Offer</span>
                </div>
              )}
              
              {isPaymentRequest && (
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Payment Request</span>
                </div>
              )}

              <p className="text-sm leading-relaxed">{message.content}</p>
              
              {message.image_url && (
                <img 
                  src={message.image_url} 
                  alt="Shared image" 
                  className="mt-2 rounded-lg max-w-xs max-h-48 object-cover border border-border/20"
                />
              )}
              
              {message.offer_amount && message.offer_duration_days && (
                <div className="mt-3 pt-3 border-t border-current/20 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">${message.offer_amount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{message.offer_duration_days} days</span>
                  </div>
                  
                  {isOwner && message.message_type === 'offer' && request.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptOffer(message)}
                        className="bg-success hover:bg-success/90 text-success-foreground"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {isPaymentRequest && !isCurrentUser && request.status === 'accepted' && (
                <Button
                  onClick={() => setShowPaymentForm(true)}
                  className="mt-3 w-full bg-success hover:bg-success/90 text-success-foreground"
                  size="sm"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Proceed to Payment
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </span>
              {isCurrentUser && (
                <div className="h-1 w-1 rounded-full bg-primary/60" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 bg-gradient-to-br from-background to-neutral-50 border-0 shadow-2xl">
          {/* Modern Header */}
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-glass-medium backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
                  <AvatarImage src={otherUser?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                    {otherUser?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {otherUser?.full_name || 'Unknown User'}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${getStatusBadgeStyle(request.status)} border`}>
                      {request.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {request.item?.title}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isTyping && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200" />
                    </div>
                    <span>typing...</span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-background/50 to-background">
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex justify-center">
                <div className="bg-muted/60 backdrop-blur-sm px-4 py-2 rounded-full">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Sending...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 bg-glass-medium backdrop-blur-sm p-4">
            {/* Quick Actions */}
            {request.status === 'accepted' && isOwner && (
              <div className="mb-4 p-3 bg-gradient-to-r from-success/10 to-success/5 rounded-lg border border-success/20">
                <p className="text-sm text-success-foreground mb-2 font-medium">Order accepted! Send payment request:</p>
                <Button 
                  onClick={sendPaymentRequest}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  size="sm"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Send Payment Request
                </Button>
              </div>
            )}

            {/* Offer Section */}
            {!isOwner && request.status === 'pending' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
                <h4 className="font-medium text-primary mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Make an Offer
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Amount ($)</label>
                    <Input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Duration (days)</label>
                    <Input
                      type="number"
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(e.target.value)}
                      placeholder="7"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button 
                  onClick={sendOffer} 
                  className="mt-3 bg-primary hover:bg-primary/90"
                  disabled={!offerAmount || !offerDuration}
                >
                  <Handshake className="h-4 w-4 mr-2" />
                  Send Offer
                </Button>
              </div>
            )}

            {/* Message Input */}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="min-h-[48px] max-h-32 resize-none pr-12 bg-background/80 backdrop-blur-sm border-border/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 hover:bg-primary/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                onClick={() => sendMessage()}
                disabled={!newMessage.trim() || isLoading}
                className="h-12 w-12 p-0 bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all duration-300"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </DialogContent>
      </Dialog>

      {/* Payment Form Modal */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md bg-gradient-to-br from-background to-neutral-50 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-primary">
                  ${request.total_cost || request.negotiated_rate}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Delivery Address *
              </label>
              <Textarea
                value={paymentFormData.deliveryAddress}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                placeholder="Enter your delivery address..."
                className="bg-background/80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Contact Phone *
              </label>
              <Input
                value={paymentFormData.contactPhone}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="Your phone number"
                className="bg-background/80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Special Instructions (Optional)
              </label>
              <Textarea
                value={paymentFormData.specialInstructions}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                placeholder="Any special delivery instructions..."
                className="bg-background/80"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePaymentClick}
                disabled={isLoading || !paymentFormData.deliveryAddress || !paymentFormData.contactPhone}
                className="flex-1 bg-gradient-to-r from-success to-success/90 hover:shadow-lg"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Proceed to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatInterface;