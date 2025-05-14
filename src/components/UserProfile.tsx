
import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getCurrentTime, formatTimestamp } from '@/utils/cameraUtils';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  
  if (!user) {
    return null;
  }
  
  const shopIsOpen = () => {
    try {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;
      
      // Parse shop hours
      const [openHour, openMinute] = user.shopOpeningTime.split(':').map(Number);
      const [closeHour, closeMinute] = user.shopClosingTime.split(':').map(Number);
      
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
  
  // Update current time every minute
  setInterval(() => {
    setCurrentTime(getCurrentTime());
  }, 60000);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Shop Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">{user.mobileNumber}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium">Shop Address</h4>
          <p className="text-sm text-muted-foreground">{user.shopAddress}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium">Opening Time</h4>
            <p className="text-sm">{user.shopOpeningTime}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Closing Time</h4>
            <p className="text-sm">{user.shopClosingTime}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="flex-1">
            <h4 className="text-sm font-medium">Current Status</h4>
            <div className="flex items-center mt-1">
              <div className={`w-3 h-3 rounded-full ${shopIsOpen() ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
              <p className="text-sm">{shopIsOpen() ? 'Open' : 'Closed'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current Time</p>
            <p className="text-sm font-medium">{currentTime}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => logout()}
        >
          Logout
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserProfile;
