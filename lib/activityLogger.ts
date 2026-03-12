
import { supabase } from './supabase';

export async function logActivity(action: string, details: any = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action: action,
        details: details
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
