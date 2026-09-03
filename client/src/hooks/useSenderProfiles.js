import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../services/axiosInstance';

export const useSenderProfiles = () => {
    const [senderProfiles, setSenderProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSenderProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/api/sender-profile');
            if (response.data.success) {
                setSenderProfiles(response.data.data);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSenderProfiles();
    }, [fetchSenderProfiles]);

    const createSenderProfile = async (formData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.post('/api/sender-profile', formData);
            if (response.data.success) {
                setSenderProfiles((prev) => [response.data.data, ...prev]);
                return { success: true, data: response.data.data };
            }
            const errorMessage = response.data.message || 'Unable to create profile';
            setError(errorMessage);
            return { success: false, message: errorMessage };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Server error creating profile';
            setError(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const updateSenderProfile = async (id, formData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.put(`/api/sender-profile/${id}`, formData);
            if (response.data.success) {
                setSenderProfiles((prev) => prev.map((p) => (p._id === id ? response.data.data : p)));
                return { success: true, data: response.data.data };
            }
            const errorMessage = response.data.message || 'Unable to update profile';
            return { success: false, message: errorMessage };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Server error updating profile';
            return { success: false, message: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async (payload) => {
        try {
            const response = await axiosInstance.post('/api/sender-profile/test-connection', payload);
            return { success: true, message: response.data.message || 'Connection successful' };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || err.message || 'Connection failed',
                code: err.response?.data?.code,
            };
        }
    };

    const handleDelete = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.delete(`/api/sender-profile/${id}`);
            if (response.data.success) {
                setSenderProfiles((prev) => prev.filter((profile) => profile._id !== id));
                return { success: true, message: 'Sender profile deleted successfully' };
            } else {
                setError(response.data.message);
                return { success: false, message: response.data.message };
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setError(msg);
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    };

    return {
        senderProfiles,
        loading,
        error,
        fetchSenderProfiles,
        createSenderProfile,
        updateSenderProfile,
        testConnection,
        handleDelete,
    };
};
