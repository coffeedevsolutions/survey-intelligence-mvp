import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './modal';
import { FormInput, FormTextarea } from './form-input';
import { Button } from './button';
import { FileText, Sparkles, AlertTriangle } from './icons';
import { Badge } from './badge';
import { API_BASE_URL } from '../../utils/api';

// Helper functions for template display
function getTemplateDisplayName(template) {
  const typeEmoji = {
    'ai_dynamic': '🤖',
    'static': '📋',
    'hybrid': '🎯'
  };
  return `${typeEmoji[template.template_type] || '📄'} ${template.name}`;
}

function getTemplateTypeLabel(type) {
  const typeLabels = {
    'ai_dynamic': '🤖 AI Dynamic Survey',
    'static': '📋 Static Survey', 
    'hybrid': '🎯 Hybrid Survey'
  };
  return typeLabels[type] || type;
}

export function CreateCampaignModal({ isOpen, onClose, onSubmit, isSubmitting = false, user }) {
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    unified_template_id: ''
  });
  
  const [errors, setErrors] = useState({});
  const [unifiedTemplates, setUnifiedTemplates] = useState([]);

  const fetchTemplates = useCallback(async () => {
    try {
      // Fetch unified templates
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/unified-templates`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnifiedTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching unified templates:', error);
    }
  }, [user.orgId]);

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen && user?.orgId) {
      fetchTemplates();
    }
  }, [isOpen, user?.orgId, fetchTemplates]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    console.log('🎯 Frontend submitting campaign data:', formData);
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      purpose: '',
      unified_template_id: ''
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };



  const footer = (
    <>
      <Button 
        variant="outline" 
        onClick={handleClose} 
        disabled={isSubmitting}
        className="px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        className="min-w-[160px] px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            Creating Campaign...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Create Campaign
          </>
        )}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Campaign"
      description="Set up a new survey campaign with custom templates and flows"
      footer={footer}
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Campaign Overview Section */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="form-section-title">Campaign Overview</h3>
              <p className="form-section-description">Define the core details for your new survey campaign</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormInput
                label="Campaign Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Q4 IT Requests"
                required
                disabled={isSubmitting}
              />
              {errors.name && (
                <div className="form-error-enhanced">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.name}
                </div>
              )}
            </div>
            
            <div className="md:col-span-2">
              <FormTextarea
                label="Purpose"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="Collect and prioritize IT requests for Q4 planning and resource allocation"
                rows={3}
                required
                disabled={isSubmitting}
              />
              {errors.purpose && (
                <div className="form-error-enhanced">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.purpose}
                </div>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Template <span className="text-gray-400">(Optional)</span>
              </label>
              <select
                value={formData.unified_template_id}
                onChange={(e) => handleInputChange('unified_template_id', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Use organization default template</option>
                {unifiedTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {getTemplateDisplayName(template)} {template.is_default && '(Default)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose a unified template that handles everything: AI behavior, questions, output format, and appearance.
              </p>
              {unifiedTemplates.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700">
                    📝 No unified templates found. Create your first template in <strong>🎯 Templates (New)</strong> to define survey behavior, AI logic, and output format in one place.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Template Info Section */}
        {formData.unified_template_id && (
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="form-section-title">Template Configuration</h3>
                <p className="form-section-description">Preview of selected template settings</p>
              </div>
              <Badge variant="secondary" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                Unified System
              </Badge>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const selectedTemplate = unifiedTemplates.find(t => t.id === formData.unified_template_id);
                if (!selectedTemplate) return null;
                
                return (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Template Type</h4>
                        <p className="text-sm text-gray-600">{getTemplateTypeLabel(selectedTemplate.template_type)}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Category</h4>
                        <p className="text-sm text-gray-600">{selectedTemplate.category || 'General'}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Features</h4>
                        <p className="text-sm text-gray-600">
                          {selectedTemplate.template_type === 'static' 
                            ? 'Fixed questions' 
                            : 'AI-powered + Optimizations'}
                        </p>
                      </div>
                    </div>
                    {selectedTemplate.description && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                        <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
