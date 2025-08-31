import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../layout/LoadingSpinner';
import { CheckCircle, XCircle, Mail } from '../ui/icons';

const API = "http://localhost:8787";

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link - no token provided');
      return;
    }

    // You could add an endpoint to validate the token and get invite info
    // For now, we'll just proceed with the form
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/auth/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          email: formData.email,
          password: formData.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setInviteInfo(result);
        // Redirect to dashboard after a brief success message
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <Card style={{ maxWidth: '400px', width: '100%' }}>
          <CardHeader style={{ textAlign: 'center' }}>
            <XCircle style={{ width: '48px', height: '48px', color: '#dc3545', margin: '0 auto 16px' }} />
            <CardTitle style={{ color: '#dc3545' }}>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent style={{ textAlign: 'center' }}>
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <Card style={{ maxWidth: '400px', width: '100%' }}>
          <CardHeader style={{ textAlign: 'center' }}>
            <CheckCircle style={{ width: '48px', height: '48px', color: '#28a745', margin: '0 auto 16px' }} />
            <CardTitle style={{ color: '#28a745' }}>Welcome!</CardTitle>
            <CardDescription>
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '16px' }}>
              You've joined <strong>{inviteInfo?.org?.name}</strong> as a <strong>{inviteInfo?.user?.role}</strong>.
            </p>
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8f9fa'
    }}>
      <Card style={{ maxWidth: '400px', width: '100%' }}>
        <CardHeader style={{ textAlign: 'center' }}>
          <Mail style={{ width: '48px', height: '48px', color: '#007bff', margin: '0 auto 16px' }} />
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Create your account to join the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '4px' 
              }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '4px' 
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a password (min 8 characters)"
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '4px' 
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {error && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '14px', 
                marginBottom: '16px',
                padding: '8px 12px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px'
              }}>
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span style={{ marginLeft: '8px' }}>Creating Account...</span>
                </>
              ) : (
                'Accept Invitation & Create Account'
              )}
            </Button>
          </form>

          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#6c757d' 
          }}>
            By creating an account, you agree to the organization's terms of service.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
