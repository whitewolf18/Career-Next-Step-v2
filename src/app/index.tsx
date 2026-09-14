import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Landing from '../components/Landing';
import Login from '../components/Login';
import Register from '../components/Register';
import Dashboard from '../components/Dashboard';
import BusinessDashboard from '../components/BusinessDashboard';
import AdminDashboard from '../components/AdminDashboard';

export default function HomeScreen() {
  const [page, setPage] = useState('landing');
  const [user, setUser] = useState<any>(null);

  // Auto-login disabled: the app now always opens on the landing/choose-flow
  // screen. Saved sessions are not restored automatically so the user picks
  // how they want to continue each time.
  useEffect(() => {
    // no-op: we do not restore a saved "careerAI_user" session on launch.
  }, []);

  async function loadSession() {
    // Kept as a no-op so call sites in this file stay consistent.
    // Previously this restored a saved "careerAI_user" session and routed
    // to the job-seeker / business / admin dashboards automatically.
    return;
  }

  /*
   * LOGIN
   */
  function handleLogin(sessionUser: any) {
    setUser(sessionUser);

    if (
      sessionUser?.role === 'job-seeker' ||
      sessionUser?.role === 'student' ||
      sessionUser?.role === 'alumni'
    ) {
      setPage('job-seeker');
      return;
    }

    if (sessionUser?.role === 'business') {
      setPage('business');
      return;
    }

    if (sessionUser?.role === 'admin') {
      setPage('admin');
      return;
    }

    setPage('landing');
  }

  /*
   * REGISTER
   */
  function handleRegister(sessionUser: any) {
    setUser(sessionUser);

    if (
      sessionUser?.role === 'job-seeker' ||
      sessionUser?.role === 'student' ||
      sessionUser?.role === 'alumni'
    ) {
      setPage('job-seeker');
      return;
    }

    if (sessionUser?.role === 'business') {
      setPage('business');
      return;
    }

    setPage('landing');
  }

  /*
   * LOGOUT
   */
  async function handleLogout() {
    try {
      await AsyncStorage.removeItem('careerAI_user');
    } catch (error) {
      console.log('Logout error:', error);
    }

    setUser(null);
    setPage('landing');
  }

  /*
   * LOADING
   */
  if (page === 'loading') {
    return null;
  }

  /*
   * LOGIN
   */
  if (page === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => setPage('register')}
        onBack={() => setPage('landing')}
      />
    );
  }

  /*
   * REGISTER
   */
  if (page === 'register') {
    return (
      <Register
        onRegister={handleRegister}
        onLogin={() => setPage('login')}
        onBack={() => setPage('landing')}
      />
    );
  }

  /*
   * JOB SEEKER
   */
  if (page === 'job-seeker') {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  /*
   * BUSINESS
   */
  if (page === 'business') {
    return (
      <BusinessDashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  /*
   * ADMIN
   */
  if (page === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  /*
   * LANDING
   */
  return (
    <Landing
      onLogin={() => setPage('login')}
      onRegister={() => setPage('register')}
    />
  );
}