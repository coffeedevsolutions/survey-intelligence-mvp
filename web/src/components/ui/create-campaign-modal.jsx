import React, { useState } from 'react';
import { Modal } from './modal';
import { FormInput, FormTextarea } from './form-input';
import { Button } from './button';
import { FileText, Sparkles, AlertTriangle } from './icons';
import { Badge } from './badge';

export function CreateCampaignModal({ isOpen, onClose, onSubmit, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    template_md: ''
  });
  
  const [errors, setErrors] = useState({});

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
    
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({ name: '', purpose: '', template_md: '' });
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

  const getDefaultTemplate = () => `# Project Brief

**Problem Statement**  
{{problem_statement}}

**Who is affected**  
{{affected_users}}

**Impact**  
{{impact_metric}}

**Data sources/systems**  
{{data_sources}}

**Current workaround**  
{{current_workaround}}

**Deadline/dependencies**  
{{deadline}}

**Acceptance criteria**  
- Captures the problem and impacted users
- Lists data sources and desired outputs
- Defines success in measurable terms`;

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
          </div>
        </div>

        {/* Template Section */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="form-section-title">Brief Template</h3>
              <p className="form-section-description">Customize the output format for generated project briefs</p>
            </div>
            <Badge variant="secondary" className="text-xs px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
              Markdown Supported
            </Badge>
          </div>
          
          <div className="space-y-4">
            <FormTextarea
              label="Template (Markdown)"
              value={formData.template_md}
              onChange={(e) => handleInputChange('template_md', e.target.value)}
              placeholder={getDefaultTemplate()}
              rows={12}
              className="font-mono text-sm"
              disabled={isSubmitting}
            />
            
            <div className="form-help-text">
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                <strong>Template Variables:</strong> Use double curly braces for dynamic content
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <code className="template-variable-tag">{'{{problem_statement}}'}</code>
                <code className="template-variable-tag">{'{{affected_users}}'}</code>
                <code className="template-variable-tag">{'{{impact_metric}}'}</code>
                <code className="template-variable-tag">{'{{data_sources}}'}</code>
                <code className="template-variable-tag">{'{{current_workaround}}'}</code>
                <code className="template-variable-tag">{'{{deadline}}'}</code>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
