
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  alternateNumbers: string[];
  shopAddress: string;
  shopOpeningTime: string;
  shopClosingTime: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  timestamp: Date;
  videoUrl: string;
  thumbnail?: string;
  duration: number;
  detectedMotion: boolean;
}

export interface EventLog {
  id: string;
  timestamp: Date;
  type: 'login' | 'logout' | 'motion_detected' | 'alarm_triggered' | 'alarm_dismissed' | 'temporary_deactivation';
  details?: string;
}
