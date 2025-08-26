import React, { useState, useEffect } from 'react';

export default function Debug() {
  const [authData, setAuthData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching auth data...');
        const response = await fetch('http://localhost:8787/auth/me', { credentials: 'include' });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Auth data received:', data);
        setAuthData(data);
      } catch (err) {
        console.error('Auth fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading auth data...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <pre className="text-red-700">{error}</pre>
        </div>
      )}
      
      {authData && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Auth Data</h2>
          <pre className="text-green-700 whitespace-pre-wrap">
            {JSON.stringify(authData, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Current URL:</h3>
          <p className="text-gray-600">{window.location.href}</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Available Actions:</h3>
          <div className="space-x-2">
            <a 
              href="http://localhost:8787/auth/login" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Login
            </a>
            <a 
              href="http://localhost:8787/auth/logout" 
              className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </a>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
