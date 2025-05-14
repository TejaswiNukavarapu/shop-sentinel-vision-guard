
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventLog } from '@/types';
import { formatTimestamp } from '@/utils/cameraUtils';

const EventLogView = () => {
  const [events, setEvents] = useState<EventLog[]>([]);
  
  useEffect(() => {
    const loadEvents = () => {
      try {
        const storedEvents = localStorage.getItem('shopGuardEvents');
        if (storedEvents) {
          const parsedEvents = JSON.parse(storedEvents);
          
          // Convert string timestamps to Date objects
          const processedEvents = parsedEvents.map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp)
          }));
          
          // Sort by timestamp descending
          processedEvents.sort((a: EventLog, b: EventLog) => 
            b.timestamp.getTime() - a.timestamp.getTime()
          );
          
          setEvents(processedEvents);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };
    
    loadEvents();
    
    // Set up listener for storage changes
    const handleStorageChange = () => loadEvents();
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for changes every 10 seconds
    const interval = setInterval(loadEvents, 10000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const getEventIcon = (type: EventLog['type']) => {
    switch (type) {
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      case 'motion_detected':
        return '👀';
      case 'alarm_triggered':
        return '🚨';
      case 'alarm_dismissed':
        return '🔕';
      case 'temporary_deactivation':
        return '⏸️';
      default:
        return '📝';
    }
  };

  const getEventColor = (type: EventLog['type']) => {
    switch (type) {
      case 'login':
        return 'bg-green-500/20 text-green-500';
      case 'logout':
        return 'bg-blue-500/20 text-blue-500';
      case 'motion_detected':
        return 'bg-amber-500/20 text-amber-500';
      case 'alarm_triggered':
        return 'bg-red-500/20 text-red-500';
      case 'alarm_dismissed':
        return 'bg-purple-500/20 text-purple-500';
      case 'temporary_deactivation':
        return 'bg-indigo-500/20 text-indigo-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Event Log</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p>No events recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="p-3 rounded-md bg-secondary/30">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {event.details || event.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default EventLogView;
