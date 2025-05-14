
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTimestamp } from '@/utils/cameraUtils';
import { Recording } from '@/types';
import { toast } from '@/components/ui/sonner';

const RecordingsList: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  
  useEffect(() => {
    // Load recordings from localStorage
    const loadRecordings = () => {
      try {
        const storedRecordings = localStorage.getItem('shopGuardRecordings');
        if (storedRecordings) {
          const parsedRecordings = JSON.parse(storedRecordings);
          
          // Convert string timestamps to Date objects
          const processedRecordings = parsedRecordings.map((recording: any) => ({
            ...recording,
            timestamp: new Date(recording.timestamp)
          }));
          
          setRecordings(processedRecordings);
        }
      } catch (error) {
        console.error('Error loading recordings:', error);
      }
    };
    
    loadRecordings();
    
    // Set up listener for storage changes
    const handleStorageChange = () => loadRecordings();
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for changes every 10 seconds
    const interval = setInterval(loadRecordings, 10000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const deleteRecording = (id: string) => {
    try {
      const updatedRecordings = recordings.filter(recording => recording.id !== id);
      localStorage.setItem('shopGuardRecordings', JSON.stringify(updatedRecordings));
      setRecordings(updatedRecordings);
      
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
      }
      
      toast.success('Recording deleted');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  const handlePlay = (recording: Recording) => {
    setSelectedRecording(recording);
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Recordings</span>
          <span className="text-sm px-2 py-1 bg-blue-500/20 text-blue-500 rounded-md">
            {recordings.length}/5 used
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        {recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
            <p>No recordings available</p>
            <p className="text-sm mt-2">Motion detected recordings will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {selectedRecording && (
              <div className="mb-4">
                <div className="bg-black rounded-md overflow-hidden aspect-video mb-2">
                  <video 
                    src={selectedRecording.videoUrl} 
                    controls 
                    className="w-full h-full"
                    autoPlay
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {formatTimestamp(selectedRecording.timestamp)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRecording.duration}s • 
                      {selectedRecording.detectedMotion ? ' Motion detected' : ' Manual recording'}
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteRecording(selectedRecording.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <div 
                    key={recording.id}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedRecording?.id === recording.id 
                        ? 'bg-secondary'
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => handlePlay(recording)}
                  >
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">
                        {formatTimestamp(recording.timestamp)}
                      </p>
                      <div className="flex items-center">
                        {recording.detectedMotion && (
                          <span className="text-xs bg-security-accent/20 text-security-accent px-2 py-0.5 rounded mr-2">
                            Motion
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0" 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecording(recording.id);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {recording.duration}s recording
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecordingsList;
