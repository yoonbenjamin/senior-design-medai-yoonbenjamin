import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search, ArrowUpDown } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Patient {
    patient_id: number;
    first_name: string;
    last_name: string;
    birth_date: string;
    sex: string;
}

type SortConfig = {
    key: keyof Patient | null;
    direction: 'ascending' | 'descending';
};

const StructuredIntakeList: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'patient_id', direction: 'ascending' });
    const [searchTerm, setSearchTerm] = useState<string>("");

    useEffect(() => {
        fetchPatientList();
    }, []);

    const fetchPatientList = () => {
        setLoading(true);
        setError(null);
        axios.get('http://127.0.0.1:5001/patients')
            .then(response => {
                setPatients(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching patients:', error);
                setError('Failed to load patients');
                setLoading(false);
            });
    };

    const filteredAndSortedPatients = useMemo(() => {
        let filteredItems = [...patients];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(patient => {
                return (
                    patient.patient_id.toString().toLowerCase().includes(lowerCaseSearchTerm) ||
                    patient.first_name.toLowerCase().includes(lowerCaseSearchTerm) ||
                    patient.last_name.toLowerCase().includes(lowerCaseSearchTerm) ||
                    patient.sex.toLowerCase().includes(lowerCaseSearchTerm) ||
                    new Date(patient.birth_date).toLocaleDateString().includes(lowerCaseSearchTerm)
                );
            });
        }

        if (sortConfig.key !== null) {
            filteredItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof Patient];
                const bValue = b[sortConfig.key as keyof Patient];
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filteredItems;
    }, [patients, sortConfig, searchTerm]);

    const requestSort = (key: keyof Patient) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Patient) => {
        if (sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        }
        return sortConfig.direction === 'ascending' ? 
            <ArrowUpDown className="ml-2 h-4 w-4 transform rotate-180" /> : 
            <ArrowUpDown className="ml-2 h-4 w-4" />;
    };

    const handlePatientClick = (patient: Patient) => {
        navigate('/structured-intake-agent', { 
            state: { 
                firstName: patient.first_name, 
                lastName: patient.last_name, 
                patientId: patient.patient_id 
            } 
        });
    };

    return (
        <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/30 min-h-screen">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Structured Intake List</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">Select a patient to start the structured intake process.</p>
                </div>
                <Button
                    onClick={() => navigate('/patients-new')}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md transition-all"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add New Patient
                </Button>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-gray-800/60 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Available Patients</p>
                            <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{loading ? '...' : searchTerm ? filteredAndSortedPatients.length : patients.length}</h3>
                        </div>
                        <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/50">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Patients List Table */}
            <Card className="bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden">
                <CardHeader className="border-b dark:border-gray-700 p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Search patients..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="p-6 text-center text-gray-600 dark:text-gray-300">Loading patients...</p>
                    ) : error ? (
                        <p className="p-6 text-center text-red-500">Error: {error}</p>
                    ) : patients.length === 0 ? (
                        <p className="p-6 text-center text-gray-600 dark:text-gray-300">No patients found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                        <TableHead className="w-[80px] cursor-pointer" onClick={() => requestSort('patient_id')}>
                                            <div className="flex items-center">ID {getSortIcon('patient_id')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('first_name')}>
                                            <div className="flex items-center">First Name {getSortIcon('first_name')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('last_name')}>
                                            <div className="flex items-center">Last Name {getSortIcon('last_name')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('birth_date')}>
                                            <div className="flex items-center">Birth Date {getSortIcon('birth_date')}</div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => requestSort('sex')}>
                                            <div className="flex items-center">Sex {getSortIcon('sex')}</div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedPatients.map(patient => (
                                        <TableRow
                                            key={patient.patient_id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 cursor-pointer"
                                            onClick={() => handlePatientClick(patient)}
                                        >
                                            <TableCell className="font-medium text-center">{patient.patient_id}</TableCell>
                                            <TableCell>{patient.first_name}</TableCell>
                                            <TableCell>{patient.last_name}</TableCell>
                                            <TableCell className="text-center">
                                                {new Date(patient.birth_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-center">{patient.sex}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredAndSortedPatients.length === 0 && searchTerm && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No patients found matching "{searchTerm}".
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {patients.length > 0 && filteredAndSortedPatients.length === 0 && !searchTerm && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                All patients have been processed or filtered out.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StructuredIntakeList;