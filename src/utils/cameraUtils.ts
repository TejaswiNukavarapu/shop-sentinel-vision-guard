
export const hasGetUserMedia = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const requestCameraPermission = async (): Promise<MediaStream | null> => {
  try {
    if (!hasGetUserMedia()) {
      console.error('getUserMedia is not supported in this browser');
      return null;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 } 
      },
      audio: false 
    });
    
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    return null;
  }
};

export const isShopOpen = (openingTime: string, closingTime: string): boolean => {
  try {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    
    // Parse shop hours
    const [openHour, openMinute] = openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = closingTime.split(':').map(Number);
    
    const openTimeInMinutes = openHour * 60 + openMinute;
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    // Check if shop is open
    if (closeTimeInMinutes > openTimeInMinutes) {
      // Normal case: opening time is before closing time
      return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
    } else {
      // Edge case: shop closes after midnight
      return currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes < closeTimeInMinutes;
    }
  } catch (error) {
    console.error('Error checking shop hours:', error);
    return true; // Default to shop open on error
  }
};

export function detectMotion(
  previous: ImageData | null, 
  current: ImageData, 
  sensitivity: number = 25,
  threshold: number = 15
): boolean {
  if (!previous) return false;

  const data1 = previous.data;
  const data2 = current.data;
  
  // Require a minimum number of pixels that changed
  const pixelsChanged = calculatePixelChanges(data1, data2, sensitivity);
  
  // If the percentage of pixels changed is greater than the threshold, motion is detected
  const totalPixels = data1.length / 4; // RGBA values, so divide by 4
  const percentChanged = (pixelsChanged / totalPixels) * 100;
  
  return percentChanged > threshold;
}

function calculatePixelChanges(data1: Uint8ClampedArray, data2: Uint8ClampedArray, sensitivity: number): number {
  let pixelChanges = 0;
  
  // Only sample every Nth pixel for performance (adjust based on sensitivity)
  const samplingRate = Math.max(1, Math.floor(10 - sensitivity / 10));
  
  for (let i = 0; i < data1.length; i += 4 * samplingRate) {
    // Calculate brightness difference between pixels
    const brightness1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
    const brightness2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;
    
    // If the difference exceeds our sensitivity, count it as changed
    if (Math.abs(brightness1 - brightness2) > sensitivity) {
      pixelChanges++;
    }
  }
  
  return pixelChanges;
}

export function createVideoFromStream(stream: MediaStream): HTMLVideoElement {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  return video;
}

export const captureImage = (videoElement: HTMLVideoElement): string | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  } catch (error) {
    console.error('Error capturing image:', error);
    return null;
  }
};

export function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function getMediaRecorder(stream: MediaStream): MediaRecorder | null {
  try {
    return new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch (e) {
    try {
      return new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (e2) {
      console.error('Could not create MediaRecorder', e2);
      return null;
    }
  }
}
