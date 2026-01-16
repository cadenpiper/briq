import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export function useChatHistory(walletAddress) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load messages from Supabase
  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    async function loadMessages() {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        setMessages(data || []);
      }
      setIsLoading(false);
    }

    loadMessages();
  }, [walletAddress]);

  // Save message to Supabase
  const saveMessage = async (role, content) => {
    if (!walletAddress) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        wallet_address: walletAddress,
        role,
        content
      });

    if (error) {
      console.error('Error saving message:', error);
    }
  };

  return { messages, isLoading, saveMessage };
}
