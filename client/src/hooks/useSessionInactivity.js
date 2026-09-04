import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, clearToken } from '../utils/tokenManager';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const DEFAULT_TIMEOUT_MINUTES = 15;
const WARNING_THRESHOLD_SECONDS = 60; // Show countdown modal 60s before logout
const ACTIVITY_STORAGE_KEY = 'cyphish_last_activity';

export const useSessionInactivity = () => {
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_THRESHOLD_SECONDS);
  
  const lastThrottleRef = useRef(Date.now());

  // Fetch configured timeout from backend
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/system/session-config`);
        if (isMounted && res.data?.data?.sessionInactivityTimeoutMinutes) {
          setTimeoutMinutes(res.data.data.sessionInactivityTimeoutMinutes);
        }
      } catch (e) {
        // Fallback to default 15 mins
      }
    };
    fetchConfig();
    return () => { isMounted = false; };
  }, []);

  // Update last activity timestamp in localStorage (syncs across tabs)
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle localStorage writes to at most once per 2 seconds
    if (now - lastThrottleRef.current > 2000) {
      lastThrottleRef.current = now;
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
      setWarningOpen(false);
    }
  }, []);

  // Reset timer manually when user clicks "Stay Logged In"
  const stayLoggedIn = useCallback(() => {
    const now = Date.now();
    lastThrottleRef.current = now;
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    setWarningOpen(false);
  }, []);

  // Immediate manual logout
  const logOutNow = useCallback(() => {
    clearToken();
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    window.location.href = '/console';
  }, []);

  // Listen to user input / interaction events
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleUserActivity = () => {
      if (getToken()) {
        recordActivity();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Initialize activity timestamp if not set
    if (!localStorage.getItem(ACTIVITY_STORAGE_KEY)) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [recordActivity]);

  // Main inactivity evaluation ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getToken();
      if (!token) {
        setWarningOpen(false);
        return;
      }

      const storedTime = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      const lastActive = storedTime ? parseInt(storedTime, 10) : Date.now();
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const elapsed = Date.now() - lastActive;
      const msLeft = timeoutMs - elapsed;

      if (msLeft <= 0) {
        // Inactivity timeout reached: sign out operator
        clearInterval(interval);
        clearToken();
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
        window.location.href = `/console?reason=inactivity&timeout=${timeoutMinutes}`;
      } else if (msLeft <= WARNING_THRESHOLD_SECONDS * 1000) {
        // Within warning window
        setWarningOpen(true);
        setSecondsRemaining(Math.max(1, Math.ceil(msLeft / 1000)));
      } else {
        setWarningOpen(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMinutes]);

  return {
    timeoutMinutes,
    warningOpen,
    secondsRemaining,
    stayLoggedIn,
    logOutNow,
  };
};

export default useSessionInactivity;
