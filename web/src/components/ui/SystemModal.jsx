import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { FormInput, FormTextarea } from './form-input';
import { Button } from './button';

const API = "http://localhost:8787";

export function SystemModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingSystem = null, 
  orgId,
  className = "" 
}) {
  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    category: '',
    status: 'active',
    url: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(editingSystem);

  // Reset form when modal opens/closes or editingSystem changes
  useEffect(() => {
    console.log('🔄 SystemModal useEffect triggered');
    console.log('📱 isOpen:', isOpen);
    console.log('📝 editingSystem:', editingSystem);
    console.log('🏢 orgId:', orgId);
    
    if (isOpen) {
      if (editingSystem) {
        console.log('✏️ Setting form data for editing');
        setFormData({
          name: editingSystem.name || '',
          vendor: editingSystem.vendor || '',
          category: editingSystem.category || '',
          status: editingSystem.status || 'active',
          url: editingSystem.url || '',
          notes: editingSystem.notes || ''
        });
      } else {
        console.log('➕ Setting form data for new system');
        setFormData({
          name: '',
          vendor: '',
          category: '',
          status: 'active',
          url: '',
          notes: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editingSystem]);

  const validateForm = () => {
    const newErrors = {};
    
    console.log('🔍 Validating form...');
    console.log('📝 Form data for validation:', formData);
    
    if (!formData.name.trim()) {
      console.log('❌ Name validation failed - name is empty');
      newErrors.name = 'System name is required';
    } else {
      console.log('✅ Name validation passed');
    }
    
    // Auto-fix URL if it doesn't have protocol
    if (formData.url && formData.url.trim()) {
      if (!formData.url.match(/^https?:\/\//)) {
        console.log('🔧 Auto-fixing URL by adding https://');
        formData.url = `https://${formData.url}`;
        console.log('🔧 Fixed URL:', formData.url);
      }
      console.log('✅ URL validation passed');
    } else {
      console.log('ℹ️ URL is empty, skipping validation');
    }
    
    console.log('🔍 Validation errors:', newErrors);
    console.log('🔍 Validation result:', Object.keys(newErrors).length === 0);
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔧 SystemModal handleSubmit called');
    console.log('📋 Form data:', formData);
    console.log('🏢 OrgId:', orgId);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    console.log('✅ Form validation passed, making API request...');
    setLoading(true);
    try {
      const url = isEditing 
        ? `${API}/api/orgs/${orgId}/systems/${editingSystem.id}`
        : `${API}/api/orgs/${orgId}/systems`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      console.log(`🌐 Making ${method} request to:`, url);
      console.log('📦 Request payload:', JSON.stringify(formData, null, 2));
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const savedSystem = await response.json();
        console.log('✅ System saved successfully:', savedSystem);
        onSave(savedSystem);
        onClose();
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
        try {
          const error = JSON.parse(errorText);
          setErrors({ submit: error.error || 'Failed to save system' });
        } catch {
          setErrors({ submit: `Failed to save system (${response.status})` });
        }
      }
    } catch (err) {
      console.error('❌ Network/fetch error:', err);
      setErrors({ submit: 'Failed to save system. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <Button 
        variant="outline" 
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSubmit}
        disabled={loading}
        className="min-w-[100px]"
      >
        {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit System' : 'Add New System'}
      description={isEditing ? 'Update system information' : 'Add a new system to your tech stack'}
      footer={footer}
      className={className}
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormInput
              label="System Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="e.g., Salesforce, AWS EC2, GitHub"
              required
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <FormInput
            label="Vendor"
            value={formData.vendor}
            onChange={handleInputChange('vendor')}
            placeholder="e.g., Salesforce, Amazon, Microsoft"
          />

          <FormInput
            label="Category"
            value={formData.category}
            onChange={handleInputChange('category')}
            placeholder="e.g., CRM, Cloud Infrastructure, Version Control"
          />

          <div>
            <label className="form-label-enhanced">Status</label>
            <select
              value={formData.status}
              onChange={handleInputChange('status')}
              className="form-input-enhanced w-full"
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <FormInput
            label="URL"
            type="url"
            value={formData.url}
            onChange={handleInputChange('url')}
            placeholder="https://example.com"
          />
          {errors.url && (
            <p className="text-sm text-destructive mt-1">{errors.url}</p>
          )}
        </div>

        <div>
          <FormTextarea
            label="Notes"
            value={formData.notes}
            onChange={handleInputChange('notes')}
            placeholder="Additional information about this system, such as use cases, integration details, or special considerations..."
            rows={4}
          />
        </div>

        {errors.submit && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{errors.submit}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
