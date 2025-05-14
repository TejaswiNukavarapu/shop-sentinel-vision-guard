
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import CameraView from '@/components/CameraView';
import RecordingsList from '@/components/RecordingsList';
import EventLogView from '@/components/EventLogView';
import UserProfile from '@/components/UserProfile';

const Dashboard = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Shop Guard Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* First column - Camera */}
          <div className="md:col-span-2">
            <div className="space-y-6">
              <CameraView />
              
              <EventLogView />
            </div>
          </div>
          
          {/* Second column - User Profile and Recordings */}
          <div className="space-y-6">
            <UserProfile />
            
            <RecordingsList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
