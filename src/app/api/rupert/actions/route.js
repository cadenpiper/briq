import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ACTIONS_FILE = path.join(process.cwd(), 'rupert-actions.json');

// Ensure actions file exists
function ensureActionsFile() {
  if (!fs.existsSync(ACTIONS_FILE)) {
    fs.writeFileSync(ACTIONS_FILE, JSON.stringify({ actions: [] }, null, 2));
  }
}

export async function GET() {
  try {
    ensureActionsFile();
    const data = fs.readFileSync(ACTIONS_FILE, 'utf8');
    const actionsData = JSON.parse(data);
    
    // Return last 20 actions, sorted by timestamp (newest first)
    const recentActions = actionsData.actions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
    
    return NextResponse.json({ actions: recentActions });
  } catch (error) {
    console.error('Error reading actions file:', error);
    return NextResponse.json({ actions: [] });
  }
}

export async function POST(request) {
  try {
    const action = await request.json();
    
    ensureActionsFile();
    const data = fs.readFileSync(ACTIONS_FILE, 'utf8');
    const actionsData = JSON.parse(data);
    
    // Add new action with timestamp
    const newAction = {
      ...action,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    actionsData.actions.push(newAction);
    
    // Keep only last 100 actions to prevent file from growing too large
    if (actionsData.actions.length > 100) {
      actionsData.actions = actionsData.actions.slice(-100);
    }
    
    fs.writeFileSync(ACTIONS_FILE, JSON.stringify(actionsData, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving action:', error);
    return NextResponse.json({ error: 'Failed to save action' }, { status: 500 });
  }
}
