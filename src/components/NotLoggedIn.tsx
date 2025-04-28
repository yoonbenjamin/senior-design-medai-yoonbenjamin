import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Home } from 'lucide-react';

const NotLoggedIn = () => {
  const navigate = useNavigate();

  return (
    <Card className="w-full bg-gray-800 p-6 rounded-lg text-white">
      <div className="text-center space-y-4">
        <p className="text-lg mb-4">Please log in to view content.</p>
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2"
          >
            <LogIn size={20} />
            Go to Login
          </Button>
          <Button 
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 transition-colors duration-300 flex items-center gap-2"
          >
            <Home size={20} />
            Back to Home
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NotLoggedIn;