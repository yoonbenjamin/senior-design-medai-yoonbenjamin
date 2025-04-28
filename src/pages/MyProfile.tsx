import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const MyProfile: React.FC = () => {
    const { user, login } = useAuth();
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        password: '',
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!user || !user.username) {
            setError('Error: User data is not available.');
            setMessage('');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:5001/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, ...formData }),
            });

            const data = await response.json();

            if (response.ok) {
                const updatedUser = {
                    ...user,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    password: formData.password, // Update password locally only for display (optional)
                };
                login(updatedUser);
                setMessage('Profile updated successfully!');
                setError('');
            } else {
                setError(data.error || 'Failed to update profile');
                setMessage('');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred');
            setMessage('');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen min-w-screen bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
            <div className="w-full max-w-md bg-gray-900 rounded-lg shadow-lg p-8">
                <h2 className="text-3xl font-semibold text-center text-blue-400 mb-6">My Profile</h2>
                {message && (
                    <p className="bg-green-600 text-white text-sm p-3 rounded mb-4 text-center">
                        {message}
                    </p>
                )}
                {error && (
                    <p className="bg-red-600 text-white text-sm p-3 rounded mb-4 text-center">
                        {error}
                    </p>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-2">Username</label>
                        <input
                            type="text"
                            value={user?.username}
                            disabled
                            className="w-full p-3 rounded bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 p-3 rounded text-white font-semibold hover:bg-blue-700 transition duration-300"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
