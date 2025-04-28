import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '../images/medai-logo.png';
import { AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import SignUpVisual from '../images/ai-image.jpg';

const SignUp: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        organization: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5001/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                const user = {
                    username: formData.username,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    organization: formData.organization,
                    password: formData.password,
                };
                login(user); // Pass the user object to set logged-in state
                navigate('/home'); // Redirect to main page
            } else {
                setError(data.error || 'An error occurred');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred during sign-up.');
        }
    };

    const benefits = [
        "Access AI-powered contouring",
        "Streamline patient intake",
        "Optimize treatment plans",
        "Integrate seamlessly with workflows"
    ];

    return (
        <div className="relative flex items-center justify-center min-h-screen w-screen bg-gradient-to-br from-gray-900 via-penn-blue to-gray-900 text-slate-100 p-4 overflow-hidden">
            <Button
                variant="ghost"
                className="absolute top-4 left-4 md:top-6 md:left-6 text-slate-400 hover:text-slate-100 hover:bg-white/10 p-2 h-auto rounded-full"
                onClick={() => navigate('/')}
                aria-label="Back to Landing Page"
            >
                <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
                <div className="hidden md:flex flex-col items-center justify-center p-8 lg:p-12 h-full relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-medium-blue/10 to-bright-cyan/10 opacity-50 rounded-l-xl blur-2xl"></div>
                    <img src={SignUpVisual} alt="Med.ai Sign Up Visual" className="w-3/4 max-w-xs mb-8 rounded-lg shadow-lg relative z-10" />
                    <h3 className="text-xl lg:text-2xl font-semibold text-slate-200 mb-4 text-center relative z-10">Unlock the Power of AI in Cancer Care</h3>
                    <ul className="space-y-2 text-sm text-slate-400 relative z-10">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-center">
                                <CheckCircle className="h-4 w-4 mr-2 text-bright-cyan flex-shrink-0" />
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="w-full rounded-xl md:rounded-l-none shadow-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-lg z-10">
                    <div className="p-8 md:p-10">
                        <div className="flex justify-center mb-6">
                            <img src={Logo} alt="Med.ai Logo" className="h-16 w-auto" />
                        </div>

                        <h2 className="text-3xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-bright-cyan">
                            Create Account
                        </h2>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-md mb-4 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form className="space-y-4">
                            <Input
                                type="text"
                                name="username"
                                placeholder="Username"
                                className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
                                value={formData.username}
                                onChange={handleChange}
                                aria-label="Username"
                            />
                            <Input
                                type="password"
                                name="password"
                                placeholder="Password"
                                className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
                                value={formData.password}
                                onChange={handleChange}
                                aria-label="Password"
                            />
                            <Input
                                type="text"
                                name="firstName"
                                placeholder="First Name"
                                className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
                                value={formData.firstName}
                                onChange={handleChange}
                                aria-label="First Name"
                            />
                            <Input
                                type="text"
                                name="lastName"
                                placeholder="Last Name"
                                className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
                                value={formData.lastName}
                                onChange={handleChange}
                                aria-label="Last Name"
                            />
                            <Input
                                type="text"
                                name="organization"
                                placeholder="Organization"
                                className="w-full bg-white/10 border-white/20 placeholder-slate-400 text-white focus:ring-bright-cyan focus:border-bright-cyan transition duration-300 h-11"
                                value={formData.organization}
                                onChange={handleChange}
                                aria-label="Organization"
                            />
                            <Button
                                type="button"
                                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-bright-cyan to-medium-blue text-white shadow-lg hover:shadow-bright-cyan/40 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
                                onClick={handleSubmit}
                            >
                                Sign Up
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Already have an account?{' '}
                            <button
                                className="font-medium text-bright-cyan hover:text-opacity-80 transition-colors duration-200 ml-1"
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
