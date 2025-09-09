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
  Phone
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
  const [isTyping, setIsTyping] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerDays, setOfferDays] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !conversation?.id || !currentProfile?.id) return;

    setIsTyping(true);
    setUploading(!!selectedImage);
    
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const messageData: any = {
        conversation_id: conversation.id,
        sender_id: currentProfile.id,
        message_type: selectedImage ? 'image' : 'text',
        content: newMessage.trim() || (selectedImage ? 'Image' : '')
      };

      if (imageUrl) {
        messageData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      // Update request status to negotiating if it's pending
      if (request.status === 'pending') {
        await supabase
          .from('borrow_requests')
          .update({ status: 'negotiating' })
          .eq('id', request.id);
      }

      setNewMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
      setUploading(false);
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
        description: "The terms have been agreed upon. Please proceed with payment.",
      });

      // Show payment form for borrower
      if (currentProfile.id === request.borrower_id) {
        setShowPaymentForm(true);
      }

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

  const handlePayment = async () => {
    if (!deliveryAddress.trim() || !contactPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide delivery address and contact phone.",
        variant: "destructive",
      });
      return;
    }

    try {
      const finalAmount = request.negotiated_rate * request.negotiated_duration_days;
      
      // Create payment session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          requestId: request.id,
          amount: finalAmount,
          description: `${request.item.title} - ${request.negotiated_duration_days} days rental`
        }
      });

      if (error) throw error;

      // Save delivery details
      await supabase
        .from('borrow_requests')
        .update({
          owner_response: JSON.stringify({
            delivery_address: deliveryAddress,
            contact_phone: contactPhone
          })
        })
        .eq('id', request.id);

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
      
      setShowPaymentForm(false);
      
      toast({
        title: "Payment initiated",
        description: "Complete your payment in the new window.",
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
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
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-temple-red-soft rounded-full">
              <MessageCircle className="h-5 w-5 text-temple-red" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{request.item.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <Badge variant="outline" className="border-temple-red text-temple-red">
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
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-neutral-50 to-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.sender_id === currentProfile?.id ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-temple-red text-white text-xs">
                  {getInitials(message.sender?.full_name || 'User')}
                </AvatarFallback>
              </Avatar>

              {/* Message Bubble */}
              <div
                className={`max-w-[70%] ${
                  message.message_type === 'system'
                    ? 'bg-blue-50 text-blue-800 mx-auto text-center border border-blue-200'
                    : message.sender_id === currentProfile?.id
                    ? 'bg-temple-red text-white shadow-lg'
                    : 'bg-white border border-gray-200 shadow-sm'
                } rounded-2xl px-4 py-3 space-y-2 relative`}
              >
                {/* Message tail */}
                <div 
                  className={`absolute top-3 w-3 h-3 rotate-45 ${
                    message.message_type === 'system' ? 'hidden' :
                    message.sender_id === currentProfile?.id
                      ? 'bg-temple-red -right-1'
                      : 'bg-white border-l border-t border-gray-200 -left-1'
                  }`}
                />

                {/* Sender name for received messages */}
                {message.sender_id !== currentProfile?.id && message.message_type !== 'system' && (
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {message.sender?.full_name || 'User'}
                  </p>
                )}

                {message.message_type === 'offer' && (
                  <div className={`${
                    message.sender_id === currentProfile?.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-temple-red-soft text-temple-red'
                  } rounded-xl p-3 space-y-2`}>
                    <div className="flex items-center gap-2">
                      <Handshake className="h-4 w-4" />
                      <span className="font-semibold text-sm">Counter Offer</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Rate: <span className="font-medium">${message.offer_amount}/{request.item.is_service ? 'hour' : 'day'}</span></p>
                      <p>Duration: <span className="font-medium">{message.offer_duration_days} days</span></p>
                      <p className="font-bold text-base">
                        Total: ${((message.offer_amount || 0) * (message.offer_duration_days || 1)).toFixed(2)}
                      </p>
                    </div>
                    
                    {/* Accept/Reject buttons for offers */}
                    {message.sender_id !== currentProfile?.id && 
                     request.status === 'negotiating' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => acceptOffer(message.id, message.offer_amount!, message.offer_duration_days!)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {message.image_url && (
                  <div className="mt-2">
                    <img 
                      src={message.image_url} 
                      alt="Shared image" 
                      className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                      onClick={() => window.open(message.image_url, '_blank')}
                    />
                  </div>
                )}
                
                {message.content && (
                  <p className={`text-sm ${message.message_type === 'system' ? 'text-center font-medium' : ''}`}>
                    {message.content}
                  </p>
                )}
                
                <div className={`text-xs opacity-75 ${
                  message.sender_id === currentProfile?.id ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {formatDistanceToNow(new Date(message.created_at))} ago
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {(isTyping || uploading) && (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-300 text-gray-600 text-xs">
                  {uploading ? '📷' : '...'}
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {request.status !== 'accepted' && request.status !== 'rejected' && (
          <div className="flex-shrink-0 p-6 border-t bg-white space-y-4">
            {showPaymentForm ? (
              <Card className="border-temple-red">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-temple-red-soft rounded-full">
                      <CreditCard className="h-6 w-6 text-temple-red" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">Complete Your Order</h4>
                      <p className="text-sm text-muted-foreground">Finalize payment and delivery details</p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-temple-red-soft to-temple-red-light p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-temple-red">
                          ${(request.negotiated_rate * request.negotiated_duration_days).toFixed(2)}
                        </p>
                        <p className="text-sm text-temple-red/80">
                          ${request.negotiated_rate}/{request.item.is_service ? 'hour' : 'day'} × {request.negotiated_duration_days} days
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-temple-red">Final Total</p>
                        <p className="text-xs text-temple-red/80">Including all fees</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                        <MapPin className="h-4 w-4 text-temple-red" />
                        Delivery Address
                      </label>
                      <Textarea
                        placeholder="Enter your complete delivery address including postal code..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        rows={3}
                        className="resize-none border-gray-300 focus:border-temple-red"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-temple-red" />
                        Contact Phone Number
                      </label>
                      <Input
                        placeholder="Your phone number for delivery coordination"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="border-gray-300 focus:border-temple-red"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handlePayment} 
                      disabled={!deliveryAddress.trim() || !contactPhone.trim()}
                      className="flex-1 bg-temple-red hover:bg-temple-red-dark text-white py-3 text-base font-medium"
                      size="lg"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Proceed to Payment
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPaymentForm(false)}
                      className="px-6 border-gray-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : showOfferForm ? (
              <Card className="border-temple-red">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-temple-red-soft rounded-full">
                      <Handshake className="h-5 w-5 text-temple-red" />
                    </div>
                    <h4 className="text-lg font-semibold">Make a Counter Offer</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Rate (${request.item.is_service ? 'per hour' : 'per day'})
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        className="border-gray-300 focus:border-temple-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Duration (days)</label>
                      <Input
                        type="number"
                        placeholder="Days"
                        value={offerDays}
                        onChange={(e) => setOfferDays(e.target.value)}
                        className="border-gray-300 focus:border-temple-red"
                      />
                    </div>
                  </div>
                  
                  {offerAmount && offerDays && (
                    <div className="bg-temple-red-soft p-4 rounded-xl">
                      <p className="text-base font-bold text-temple-red">
                        Total Offer: ${(parseFloat(offerAmount) * parseInt(offerDays)).toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={sendOffer} 
                      disabled={!offerAmount || !offerDays}
                      className="bg-temple-red hover:bg-temple-red-dark text-white"
                    >
                      <Handshake className="h-4 w-4 mr-2" />
                      Send Offer
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOfferForm(false)}
                      className="border-gray-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedImage && (
                  <div className="flex items-center gap-3 p-3 bg-temple-red-soft rounded-xl border border-temple-red-light">
                    <ImageIcon className="h-5 w-5 text-temple-red" />
                    <span className="text-sm font-medium text-temple-red flex-1">{selectedImage.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="h-8 w-8 p-0 hover:bg-temple-red-light text-temple-red"
                    >
                      ×
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={isTyping || uploading}
                      rows={2}
                      className="resize-none border-gray-300 focus:border-temple-red"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="border-gray-300 hover:border-temple-red hover:text-temple-red"
                      size="lg"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    
                    <Button 
                      onClick={sendMessage} 
                      disabled={(!newMessage.trim() && !selectedImage) || isTyping || uploading}
                      className="bg-temple-red hover:bg-temple-red-dark text-white"
                      size="lg"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOfferForm(true)}
                      className="whitespace-nowrap border-temple-red text-temple-red hover:bg-temple-red hover:text-white"
                      size="lg"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Counter Offer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(request.status === 'accepted' || request.status === 'rejected') && (
          <div className="flex-shrink-0 p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                request.status === 'accepted' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {request.status === 'accepted' ? 
                  <CheckCircle className="h-4 w-4" /> : 
                  <XCircle className="h-4 w-4" />
                }
                Order {request.status === 'accepted' ? 'Completed' : 'Cancelled'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This conversation has ended. The request has been {request.status}.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatInterface;