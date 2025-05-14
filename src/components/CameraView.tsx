
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/context/AuthContext';
import { 
  requestCameraPermission, 
  detectMotion,
  isShopOpen,
  getMediaRecorder,
  formatTimestamp
} from '@/utils/cameraUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff } from 'lucide-react';
import { Recording, EventLog } from '@/types';

const MAX_RECORDINGS = 5;
const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1514/1514.wav');
alarmSound.loop = true;

type CameraStatus = 'inactive' | 'requesting' | 'active' | 'denied' | 'motion-detected' | 'recording';

const CameraView: React.FC = () => {
  const { user } = useAuth();
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('inactive');
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const [sensitivity, setSensitivity] = useState<number>(25);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [temporaryDeactivationMinutes, setTemporaryDeactivationMinutes] = useState(30);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [deactivationEndTime, setDeactivationEndTime] = useState<Date | null>(null);
  const [motionDetectionActive, setMotionDetectionActive] = useState(false);
  
  // Refs for camera elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);
  const motionDetectionRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const isRecordingRef = useRef(false);
  const lastMotionTimestampRef = useRef<number | null>(null);
  
  // Computed shop open status
  const shopOpen = user ? isShopOpen(user.shopOpeningTime, user.shopClosingTime) : true;
  
  // Effect for checking the camera permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionStatus(permissionStatus.state);
        
        permissionStatus.addEventListener('change', () => {
          setPermissionStatus(permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setCameraStatus('denied');
            stopCamera();
          }
        });
      } catch (error) {
        console.warn('Camera permission query not supported:', error);
      }
    };
    
    checkPermission();
  }, []);

  // Effect to handle deactivation timer
  useEffect(() => {
    let timer: number;
    
    if (isDeactivated && deactivationEndTime) {
      timer = window.setInterval(() => {
        const now = new Date();
        
        if (now >= deactivationEndTime) {
          setIsDeactivated(false);
          setDeactivationEndTime(null);
          toast.info('Temporary deactivation period ended. Motion detection resumed.');
          
          // Log the event
          const eventData: EventLog = {
            id: Date.now().toString(),
            timestamp: new Date(),
            type: 'temporary_deactivation',
            details: 'Temporary deactivation period ended'
          };
          
          const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
          events.push(eventData);
          localStorage.setItem('shopGuardEvents', JSON.stringify(events));
        }
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDeactivated, deactivationEndTime]);

  // Effect for starting/stopping motion detection based on shop hours
  useEffect(() => {
    if (!user) return;
    
    // If camera is active, update the motion detection based on shop hours
    if (cameraStatus === 'active') {
      setMotionDetectionActive(!shopOpen);
      
      if (shopOpen) {
        toast.info('Shop is open - camera in normal mode');
      } else {
        toast.info('Shop is closed - security monitoring active');
      }
    }
  }, [shopOpen, cameraStatus, user]);

  const startCamera = useCallback(async () => {
    setCameraStatus('requesting');
    
    try {
      const stream = await requestCameraPermission();
      
      if (!stream) {
        setCameraStatus('denied');
        toast.error('Could not access camera. Please check permissions.');
        return;
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Setup media recorder
        const recorder = getMediaRecorder(stream);
        if (recorder) {
          mediaRecorderRef.current = recorder;
          
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          recorder.onstop = () => {
            if (recordedChunksRef.current.length > 0) {
              saveRecording();
            }
          };
        }
        
        setCameraStatus('active');
        setPermissionStatus('granted');
        toast.success('Camera activated');
        
        // Start motion detection if shop is closed
        setMotionDetectionActive(!shopOpen);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setCameraStatus('denied');
      toast.error('Error accessing camera');
    }
  }, [shopOpen]);

  const stopCamera = useCallback(() => {
    // Stop motion detection loop
    if (motionDetectionRef.current) {
      cancelAnimationFrame(motionDetectionRef.current);
      motionDetectionRef.current = null;
    }
    
    // Stop recording if in progress
    if (isRecordingRef.current && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
    }
    
    // Stop alarm
    stopAlarm();
    
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraStatus('inactive');
    setMotionDetectionActive(false);
    lastFrameRef.current = null;
  }, []);

  const startMotionDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      } else {
        // Default size if video dimensions aren't available
        canvas.width = 640;
        canvas.height = 480;
      }
    };
    
    // Wait for video to load dimensions
    if (video.readyState >= 2) {
      updateCanvasSize();
    } else {
      video.onloadeddata = updateCanvasSize;
    }
    
    const detectFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Only detect motion if shop is closed and motion detection is active
        if (motionDetectionActive && !isDeactivated) {
          const motionDetected = detectMotion(lastFrameRef.current, currentFrame, sensitivity, 5);
          
          if (motionDetected) {
            handleMotionDetected();
          }
        }
        
        lastFrameRef.current = currentFrame;
        
        // Continue the detection loop
        motionDetectionRef.current = requestAnimationFrame(detectFrame);
      } catch (error) {
        console.error('Error in motion detection:', error);
      }
    };
    
    // Start the detection loop
    motionDetectionRef.current = requestAnimationFrame(detectFrame);
    
    // Backup interval in case requestAnimationFrame fails
    const intervalId = setInterval(() => {
      if (!motionDetectionRef.current) {
        console.log('Restarting motion detection with fallback method');
        motionDetectionRef.current = requestAnimationFrame(detectFrame);
      }
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
      if (motionDetectionRef.current) {
        cancelAnimationFrame(motionDetectionRef.current);
      }
    };
  }, [sensitivity, motionDetectionActive, isDeactivated]);

  // Start motion detection when camera is active and motion detection is enabled
  useEffect(() => {
    if (cameraStatus === 'active' && motionDetectionActive) {
      const cleanup = startMotionDetection();
      return cleanup;
    }
  }, [cameraStatus, motionDetectionActive, startMotionDetection]);

  const handleMotionDetected = () => {
    // Cooldown period of 3 seconds to prevent multiple triggers
    const now = Date.now();
    if (lastMotionTimestampRef.current && now - lastMotionTimestampRef.current < 3000) {
      return;
    }
    
    lastMotionTimestampRef.current = now;
    
    // If already in motion detected state, don't trigger again
    if (cameraStatus === 'motion-detected' || cameraStatus === 'recording') {
      return;
    }
    
    setCameraStatus('motion-detected');
    
    // Log the event
    const eventData: EventLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'motion_detected',
      details: 'Motion detected in the shop'
    };
    
    const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
    events.push(eventData);
    localStorage.setItem('shopGuardEvents', JSON.stringify(events));
    
    // Trigger alarm
    startAlarm();
    
    // Start recording
    startRecording();
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current || isRecordingRef.current) return;
    
    try {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      isRecordingRef.current = true;
      setCameraStatus('recording');
      
      // Stop recording after 15 seconds
      setTimeout(() => {
        if (isRecordingRef.current && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          isRecordingRef.current = false;
        }
      }, 15000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const saveRecording = () => {
    if (recordedChunksRef.current.length === 0) return;
    
    try {
      // Create a blob from the recorded chunks
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      
      // Get existing recordings
      const storedRecordings = JSON.parse(localStorage.getItem('shopGuardRecordings') || '[]');
      
      // Create new recording
      const newRecording: Recording = {
        id: Date.now().toString(),
        timestamp: new Date(),
        videoUrl,
        duration: 15, // Fixed duration in seconds
        detectedMotion: true
      };
      
      // Add new recording to beginning of array, limit to max recordings
      const updatedRecordings = [newRecording, ...storedRecordings].slice(0, MAX_RECORDINGS);
      
      // Save to local storage
      localStorage.setItem('shopGuardRecordings', JSON.stringify(updatedRecordings));
      
      toast.success('Motion recording saved');
      setIsResponding(true);
      
      // Reset recording state
      recordedChunksRef.current = [];
      setCameraStatus('active');
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording');
      setCameraStatus('active');
    }
  };

  const startAlarm = () => {
    try {
      alarmSound.currentTime = 0;
      alarmSound.play().catch(err => console.error('Error playing alarm:', err));
      setIsAlarmActive(true);
      
      // Log the event
      const eventData: EventLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'alarm_triggered',
        details: 'Alarm triggered due to motion detection'
      };
      
      const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
      events.push(eventData);
      localStorage.setItem('shopGuardEvents', JSON.stringify(events));
      
      // Show the response dialog
      setIsResponding(true);
    } catch (error) {
      console.error('Error starting alarm:', error);
    }
  };

  const stopAlarm = () => {
    try {
      alarmSound.pause();
      alarmSound.currentTime = 0;
      setIsAlarmActive(false);
      
      if (cameraStatus === 'motion-detected') {
        setCameraStatus('active');
      }
      
      // Log the event
      const eventData: EventLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'alarm_dismissed',
        details: 'Alarm dismissed'
      };
      
      const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
      events.push(eventData);
      localStorage.setItem('shopGuardEvents', JSON.stringify(events));
      
    } catch (error) {
      console.error('Error stopping alarm:', error);
    }
  };

  const handleUserPresent = () => {
    stopAlarm();
    setIsDeactivated(true);
    
    // Calculate deactivation end time
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + temporaryDeactivationMinutes);
    setDeactivationEndTime(endTime);
    
    toast.success(`Motion detection temporarily disabled for ${temporaryDeactivationMinutes} minutes`);
    
    // Log the event
    const eventData: EventLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'temporary_deactivation',
      details: `Motion detection disabled for ${temporaryDeactivationMinutes} minutes`
    };
    
    const events = JSON.parse(localStorage.getItem('shopGuardEvents') || '[]');
    events.push(eventData);
    localStorage.setItem('shopGuardEvents', JSON.stringify(events));
    
    // Close the responding dialog
    setIsResponding(false);
  };

  const handleUserNotPresent = () => {
    stopAlarm();
    toast.warning('Alert acknowledged - Shop may be at risk');
    // Close the responding dialog
    setIsResponding(false);
  };

  return (
    <Card className="w-full shadow-lg border-gray-800">
      <CardHeader className="relative">
        <CardTitle className="flex justify-between items-center">
          <span>Security Camera</span>
          {shopOpen ? (
            <span className="text-sm px-2 py-1 bg-green-500/20 text-green-500 rounded-md">
              Normal Camera Mode
            </span>
          ) : (
            <span className="text-sm px-2 py-1 bg-security-accent/20 text-security-accent rounded-md">
              Security Monitoring
            </span>
          )}
        </CardTitle>
        {isDeactivated && deactivationEndTime && (
          <div className="absolute right-4 -bottom-2 z-10 text-xs px-2 py-1 bg-amber-500/20 text-amber-500 rounded-md">
            Motion detection paused until {formatTimestamp(deactivationEndTime)}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex flex-col items-center pb-4">
        {permissionStatus === 'denied' && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Camera access denied</AlertTitle>
            <AlertDescription>
              This application needs camera access to function. Please enable camera access in your browser settings.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
          {/* Camera Placeholder */}
          {cameraStatus === 'inactive' || cameraStatus === 'requesting' || cameraStatus === 'denied' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
              {cameraStatus === 'requesting' ? (
                <div className="animate-pulse">
                  <Camera className="w-16 h-16 mb-4" />
                  <p>Requesting camera access...</p>
                </div>
              ) : cameraStatus === 'denied' ? (
                <div>
                  <CameraOff className="w-16 h-16 mb-4" />
                  <p>Camera access denied</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => startCamera()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div>
                  <Camera className="w-16 h-16 mb-4" />
                  <p>Camera inactive</p>
                </div>
              )}
            </div>
          ) : null}
          
          {/* Live Video Feed */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted 
            className={`w-full h-full object-cover ${cameraStatus !== 'active' && cameraStatus !== 'recording' && cameraStatus !== 'motion-detected' ? 'hidden' : ''}`}
          />
          
          {/* Canvas for Motion Detection (Hidden) */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Motion Alert Overlay */}
          {cameraStatus === 'motion-detected' && (
            <div className="absolute inset-0 border-8 border-security-warning animate-pulse-warning" />
          )}
          
          {/* Recording Indicator */}
          {cameraStatus === 'recording' && (
            <div className="absolute top-4 right-4 flex items-center bg-security-warning/80 px-2 py-1 rounded-md">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
              <span className="text-white text-sm">Recording</span>
            </div>
          )}
          
          {/* Deactivation Status */}
          {isDeactivated && (
            <div className="absolute bottom-4 left-4 bg-amber-500/80 px-2 py-1 rounded-md text-white text-sm">
              Motion Detection Paused
            </div>
          )}
        </div>
        
        {/* Motion Sensitivity slider - Only show when motion detection is active */}
        {(cameraStatus === 'active' || cameraStatus === 'motion-detected' || cameraStatus === 'recording') && 
         !shopOpen && (
          <div className="w-full mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Motion Sensitivity:</span>
              <span className="text-sm">{sensitivity}</span>
            </div>
            <Slider
              value={[sensitivity]}
              min={5}
              max={50}
              step={5}
              onValueChange={(values) => setSensitivity(values[0])}
              disabled={cameraStatus !== 'active'}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {(cameraStatus === 'inactive' || cameraStatus === 'denied') ? (
          <Button 
            onClick={startCamera} 
            className="w-full"
            disabled={cameraStatus === 'requesting'}
          >
            {cameraStatus === 'requesting' ? 'Activating...' : 'Start Camera'}
          </Button>
        ) : (
          <Button 
            variant="destructive" 
            onClick={stopCamera} 
            className="w-full"
          >
            Stop Camera
          </Button>
        )}
      </CardFooter>
      
      {/* Alarm Response Dialog */}
      <Dialog open={isAlarmActive && isResponding} onOpenChange={(open) => {
        if (!open) {
          setIsResponding(false);
          stopAlarm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-security-warning">⚠️ Motion Detected!</DialogTitle>
            <DialogDescription>
              Motion was detected in your shop. Are you currently at the shop?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 py-4">
            <div className="space-y-2">
              <Label>If you are at the shop, for how long?</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={temporaryDeactivationMinutes}
                  onChange={(e) => setTemporaryDeactivationMinutes(Math.max(5, Math.min(120, parseInt(e.target.value) || 30)))}
                  className="w-20"
                />
                <span className="flex items-center ml-2">minutes</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="default" onClick={handleUserPresent}>
              Yes, I'm In
            </Button>
            <Button variant="destructive" onClick={handleUserNotPresent}>
              No, I'm Not There
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CameraView;
