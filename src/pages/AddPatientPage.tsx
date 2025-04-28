import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';

const AddPatientPage: React.FC = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        birth_date: '',
        sex: 'Male',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!formData.first_name || !formData.last_name || !formData.birth_date) {
            setMessage("Please fill in all required fields.");
            setLoading(false);
            return;
        }

        try {
            const response = await api.addPatient(formData);
            setMessage(`${response.msg} Progress tracking has been initialized.`);
            setFormData({ first_name: '', last_name: '', birth_date: '', sex: 'Male' });
        } catch (error) {
            console.error('Error adding patient:', error);
            const errorMessage = (error as any)?.response?.data?.error || 'Failed to add patient. Please try again.';
            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Add New Patient</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-300">Enter patient details to register them in the system.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Patient Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter first name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter last name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="birth_date">Birth Date</Label>
                                <Input
                                    id="birth_date"
                                    type="date"
                                    name="birth_date"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sex">Sex</Label>
                                <Select 
                                    name="sex" 
                                    value={formData.sex} 
                                    onValueChange={(value) => setFormData({ ...formData, sex: value })} 
                                    required
                                >
                                    <SelectTrigger id="sex">
                                        <SelectValue placeholder="Select sex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                {loading ? 'Adding Patient...' : 'Add Patient'}
                            </Button>
                        </div>
                    </form>

                    {message && (
                        <p className={`mt-6 text-center text-sm ${message.startsWith('Failed') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {message}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AddPatientPage;