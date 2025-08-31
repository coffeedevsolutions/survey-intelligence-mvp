import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './modal';
import { FormInput, FormTextarea } from './form-input';
import { Button } from './button';
import { FileText, Sparkles, AlertTriangle } from './icons';
import { Badge } from './badge';
import { API_BASE_URL } from '../../utils/api';

export function CreateCampaignModal({ isOpen, onClose, onSubmit, isSubmitting = false, user }) {
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    survey_template_id: '',
    brief_template_id: ''
  });
  
  const [errors, setErrors] = useState({});
  const [surveyTemplates, setSurveyTemplates] = useState([]);
  const [briefTemplates, setBriefTemplates] = useState([]);

  const fetchTemplates = useCallback(async () => {
    try {
      // Fetch both survey templates and brief templates
      const [surveyResponse, briefResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/survey-templates`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/brief-templates`, {
          credentials: 'include'
        })
      ]);
      
      if (surveyResponse.ok) {
        const data = await surveyResponse.json();
        setSurveyTemplates(data.templates || []);
      }
      
      if (briefResponse.ok) {
        const data = await briefResponse.json();
        setBriefTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
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
      survey_template_id: '',
      brief_template_id: ''
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
                value={formData.survey_template_id}
                onChange={(e) => handleInputChange('survey_template_id', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Use organization default template</option>
                {surveyTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.is_default && '(Default)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose how surveys in this campaign will appear to respondents. This can be overridden per survey flow.
              </p>
            </div>
          </div>
        </div>

        {/* AI Brief Template Selection */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="form-section-title">AI Brief Template</h3>
              <p className="form-section-description">Choose how AI generates business briefs from survey responses</p>
            </div>
            <Badge variant="secondary" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
              AI Powered
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brief Template <span className="text-gray-400">(Optional)</span>
              </label>
              <select
                value={formData.brief_template_id}
                onChange={(e) => handleInputChange('brief_template_id', e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Use organization default brief template</option>
                {briefTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.is_default && '(Default)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a template that defines how AI generates business briefs from survey responses. Create templates in Organization Settings → Brief Templates.
              </p>
              {briefTemplates.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700">
                    📝 No brief templates found. Create your first template in <strong>Organization Settings → Brief Templates</strong> to customize how AI generates business briefs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
