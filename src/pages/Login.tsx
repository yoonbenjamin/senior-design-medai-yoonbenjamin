import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '../images/medai-logo.png';
import { AlertTriangle } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api'; // Import the api service

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleSubmit = async () => {
    setError(''); // Clear previous errors
    setLoading(true); // Set loading state
    try {
      // Use the centralized api.login function
      const loginResponse = await api.login(credentials.username, credentials.password);

      // The api.login function (when successful) should return { token, user }
      if (loginResponse && loginResponse.user) {
        // Construct the user object based on what AuthContext expects
        // and what api.login provides in loginResponse.user
        const userForAuth = {
            username: loginResponse.user.username, // Assuming api response has username
            firstName: loginResponse.user.firstName,
            lastName: loginResponse.user.lastName,
            organization: loginResponse.user.organization || '', // Provide default
        };
        // Pass this object to the login function from AuthContext
        login(userForAuth);
        navigate('/home'); // Redirect to home page
      } else {
        // This case might not be reachable if api.login throws errors correctly
        console.error('Login response missing user data:', loginResponse);
        setError('Login failed. Unexpected response from server.');
      }
    } catch (err: any) { // Catch potential errors thrown by api.ts
      console.error('Login error:', err);
      // Display the error message from the caught error (ApiError, NetworkError, etc.)
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false); // Reset loading state
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-screen bg-gradient-to-br from-gray-900 via-penn-blue to-gray-900 text-slate-100 p-4">
      <Button
        variant="ghost"
        className="absolute top-4 left-4 md:top-6 md:left-6 text-slate-400 hover:text-slate-100 hover:bg-white/10 p-2 h-auto rounded-full"
        onClick={() => navigate('/')}
        aria-label="Back to Landing Page"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="p-8 md:p-10">
          <div className="flex justify-center mb-6">
            <img src={Logo} alt="Med.ai Logo" className="h-16 w-auto" />
          </div>

          <h2 className="text-3xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-bright-cyan">
            Sign In
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-md mb-4 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5">
            <Input
              type="text"
              name="username"
              placeholder="Username"
              className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
              value={credentials.username}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              aria-label="Username"
              disabled={loading} // Disable input while loading
            />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
              value={credentials.password}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              aria-label="Password"
              disabled={loading} // Disable input while loading
            />
            <Button
              type="button"
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-bright-cyan to-medium-blue text-white shadow-lg hover:shadow-bright-cyan/40 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={loading} // Disable button while loading
            >
              {loading ? 'Signing In...' : 'Sign In'} 
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <button
              className="font-medium text-bright-cyan hover:text-opacity-80 transition-colors duration-200 ml-1"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
