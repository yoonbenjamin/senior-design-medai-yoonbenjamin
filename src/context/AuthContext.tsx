// AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export interface User {
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
    role?: string;
    status?: 'Online' | 'Away' | 'Busy' | 'Offline';
    // Include any extra fields you need (e.g. licenseNumber, lastActive)
    password?: string;
    organization: string;
    licenseNumber?: string;
    lastActive?: string;
}

interface AuthContextProps {
    isLoggedIn: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize state from localStorage
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        const storedAuth = localStorage.getItem('isLoggedIn');
        return storedAuth === 'true';
    });

    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    // Update localStorage when auth state changes
    useEffect(() => {
        localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    }, [isLoggedIn]);

    // Update localStorage when user data changes
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const login = (user: User) => {
        setIsLoggedIn(true);
        setUser(user);
    };

    const logout = () => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};