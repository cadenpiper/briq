import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('rupert_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Transform to match old format
    const actions = data.map(action => ({
      id: action.id,
      type: action.type,
      token: action.token,
      currentStrategy: action.current_strategy,
      newStrategy: action.new_strategy,
      improvement: action.improvement,
      txHash: action.tx_hash,
      fromPool: action.from_pool,
      toPool: action.to_pool,
      timestamp: action.created_at
    }));

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ actions: [] });
  }
}

export async function POST(request) {
  try {
    const action = await request.json();
    
    const { error } = await supabase
      .from('rupert_actions')
      .insert({
        type: action.type,
        token: action.token,
        current_strategy: action.currentStrategy,
        new_strategy: action.newStrategy,
        improvement: action.improvement,
        tx_hash: action.txHash,
        from_pool: action.fromPool,
        to_pool: action.toPool
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving action:', error);
    return NextResponse.json({ error: 'Failed to save action' }, { status: 500 });
  }
}
