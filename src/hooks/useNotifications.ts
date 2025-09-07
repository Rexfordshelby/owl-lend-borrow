import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications'
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: string,
    relatedId?: string
  ) => {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        related_id: relatedId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    createNotification,
  };
};

export default useNotifications;