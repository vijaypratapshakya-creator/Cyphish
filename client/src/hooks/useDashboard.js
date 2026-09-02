import { useState, useEffect } from 'react';
import axiosInstance from '../services/axiosInstance';

export const useDashboard = (days = 30) => {
    const [dashboardData, setDashboardData] = useState({
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        totalContacts: 0,
        totalTemplates: 0,
        totalSenderProfiles: 0,
        simulationsSent: 0,
        usersClicked: 0,
        usersReported: 0,
        clickRate: 0,
        reportRate: 0,
        awarenessScore: 85,
    });

    const [timelineData, setTimelineData] = useState({ labels: [], datasets: [] });
    const [riskData, setRiskData] = useState([]);
    const [systemStats, setSystemStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
            const queryParams = `?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;

            const [overviewRes, timelineRes, riskRes, statsRes] = await Promise.all([
                axiosInstance.get(`/api/dashboard/overview${queryParams}`).catch(() => ({ data: { success: false } })),
                axiosInstance.get(`/api/dashboard/timeline${queryParams}`).catch(() => ({ data: { success: false } })),
                axiosInstance.get(`/api/dashboard/risk${queryParams}&groupBy=department`).catch(() => ({ data: { success: false } })),
                axiosInstance.get('/api/system/stats').catch(() => ({ data: { success: false } })),
            ]);

            if (overviewRes.data?.success) {
                setDashboardData(overviewRes.data.data);
            }
            if (timelineRes.data?.success) {
                setTimelineData(timelineRes.data.data);
            }
            if (riskRes.data?.success) {
                setRiskData(riskRes.data.data || []);
            }
            if (statsRes.data?.success) {
                setSystemStats(statsRes.data.data);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [days]);

    return { dashboardData, timelineData, riskData, systemStats, loading, error, refetch: fetchData };
};
