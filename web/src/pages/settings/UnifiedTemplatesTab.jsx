/**
 * Unified Templates Tab - Single, clear template management
 * Replaces the confusing AI Settings, Survey Templates, and Brief Templates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { FormInput, FormTextarea } from '../../components/ui/form-input.jsx';
import { Select } from '../../components/ui/simple-select.jsx';
import { useNotifications } from '../../components/ui/notifications.jsx';
import { API_BASE_URL } from '../../utils/api.js';

const TEMPLATE_TYPES = [
  { 
    value: 'ai_dynamic', 
    label: '🤖 AI Dynamic Survey', 
    description: 'AI generates smart, adaptive questions based on responses' 
  },
  { 
    value: 'static', 
    label: '📋 Static Survey', 
    description: 'Predefined questions in a fixed order' 
  },
  { 
    value: 'hybrid', 
    label: '🎯 Hybrid Survey', 
    description: 'Mix of predefined questions and AI-generated follow-ups' 
  }
];

const CATEGORIES = [
  { value: 'general', label: 'General Purpose' },
  { value: 'course_feedback', label: 'Course Feedback' },
  { value: 'customer_feedback', label: 'Customer Feedback' },
  { value: 'employee_feedback', label: 'Employee Feedback' },
  { value: 'event_feedback', label: 'Event Feedback' },
  { value: 'product_feedback', label: 'Product Feedback' },
  { value: 'service_feedback', label: 'Service Feedback' },
  { value: 'it_support', label: 'IT Support' },
  { value: 'requirements', label: 'IT Project Intake' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'business_analysis', label: 'Business Analysis' },
  { value: 'market_research', label: 'Market Research' },
  { value: 'user_research', label: 'User Research' },
  { value: 'nps_survey', label: 'Net Promoter Score (NPS)' },
  { value: 'exit_interview', label: 'Exit Interview' }
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)', cost: '$0.15/$0.60 per 1K tokens' },
  { value: 'gpt-4o', label: 'GPT-4o (Premium Quality)', cost: '$5/$15 per 1K tokens' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Basic)', cost: '$0.50/$1.50 per 1K tokens' }
];

export function UnifiedTemplatesTab({ user }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  const { showSuccess, showError } = useNotifications();

  const fetchTemplates = useCallback(async () => {
    if (!user?.orgId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates/orgs/${user.orgId}/unified-templates`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        throw new Error('Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleAIGenerateTemplate = () => {
    console.log('AI Generate Template clicked');
    setEditingTemplate(null);
    setShowAIGenerator(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates/orgs/${user.orgId}/unified-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        showSuccess('Template deleted successfully');
        fetchTemplates();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (err) {
      showError('Failed to delete template: ' + err.message);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  const handleModalSave = () => {
    fetchTemplates();
    handleModalClose();
  };

  const handleAIGeneratorClose = () => {
    setShowAIGenerator(false);
  };

  const handleAIGeneratorComplete = (generatedTemplate) => {
    setShowAIGenerator(false);
    setEditingTemplate(generatedTemplate);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading templates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Templates</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTemplates} variant="outline" className="text-red-600 border-red-200">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Survey Templates</h2>
          <p className="text-gray-600 mt-1">
            Create unified survey templates that replace the old confusing AI → Survey → Campaign workflow.
          </p>
          <p className="text-sm text-blue-600 mt-1 font-medium">
            New Simple Workflow: Template → Campaign → Survey ✨
          </p>
        </div>
        <div className="flex space-x-3">
        <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
          Create Template
        </Button>
          <Button onClick={handleAIGenerateTemplate} className="bg-purple-600 hover:bg-purple-700 text-white">
            🤖 Generate Using AI
        </Button>
        </div>
      </div>

      {/* Workflow Explanation */}
      <Card className="p-6 bg-green-50 border-green-200 mb-4">
        <h3 className="text-lg font-semibold text-green-900 mb-3">📋 How The New Workflow Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
              <h4 className="font-medium text-green-900">Create Template</h4>
            </div>
            <p className="text-sm text-green-700">Define everything here: AI behavior, questions, output format, and appearance. One template handles it all.</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
              <h4 className="font-medium text-green-900">Create Campaign</h4>
            </div>
            <p className="text-sm text-green-700">Select your template, add campaign details (name, purpose), and you're ready to launch.</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">3</span>
              <h4 className="font-medium text-green-900">Survey Runs</h4>
            </div>
            <p className="text-sm text-green-700">Template's logic executes directly—no more confusion between AI, survey, and campaign templates!</p>
          </div>
        </div>
      </Card>

      {/* Template Type Explanation */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Template Types Explained</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATE_TYPES.map(type => (
            <div key={type.value} className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">{type.label}</h4>
              <p className="text-sm text-blue-700">{type.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-4">
        {templates.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-4">Create your first survey template to get started.</p>
            <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
              Create Your First Template
            </Button>
          </Card>
        ) : (
          templates.map(template => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal - Rendered at document root with transparent background */}
      {showCreateModal && createPortal(
        <TemplateModal
          template={editingTemplate}
          orgId={user.orgId}
          onClose={handleModalClose}
          onSave={handleModalSave}
          showSuccess={showSuccess}
          showError={showError}
        />,
        document.body
      )}

      {/* AI Template Generator Modal */}
      {showAIGenerator && createPortal(
        <AITemplateGeneratorModal
          orgId={user.orgId}
          onClose={handleAIGeneratorClose}
          onComplete={handleAIGeneratorComplete}
          showSuccess={showSuccess}
          showError={showError}
        />,
        document.body
      )}
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'ai_dynamic': return '🤖';
      case 'static': return '📋';
      case 'hybrid': return '🎯';
      default: return '📄';
    }
  };

  const getTypeLabel = (type) => {
    const typeObj = TEMPLATE_TYPES.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getTypeIcon(template.template_type)}</span>
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            {template.is_default && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Default
              </span>
            )}
          </div>
          
          <p className="text-gray-600 mb-3">{template.description}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{getTypeLabel(template.template_type)}</span>
            <span>•</span>
            <span className="capitalize">{template.category}</span>
            {template.ai_config?.question_limits && (
              <>
                <span>•</span>
                <span>{template.ai_config.question_limits.min_questions}-{template.ai_config.question_limits.max_questions} questions</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={() => onEdit(template)} 
            variant="outline" 
            size="sm"
          >
            Edit
          </Button>
          <Button 
            onClick={() => onDelete(template.id)} 
            variant="outline" 
            size="sm" 
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TemplateModal({ template, orgId, onClose, onSave, showSuccess, showError }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    template_type: 'ai_dynamic',
    is_default: false,
    
    // AI Configuration
    survey_goal: '',
    target_outcome: '',
    ai_instructions: '',
    custom_first_question: '',
    model_name: 'gpt-4o-mini',
    temperature: 0.3,
    max_questions: 6,
    min_questions: 3,
    
    // Optimization Configuration
    enable_semantic_deduplication: true,
    enable_fatigue_detection: true,
    enable_dynamic_thresholds: true,
    fatigue_threshold: 0.7,
    similarity_threshold: 0.85,
    coverage_requirement: 0.8,
    
    // Slot Schema Configuration
    require_problem_statement: true,
    require_stakeholders: true,
    require_requirements: true,
    require_success_metrics: true,
    require_roi_frame: true,
    require_current_process: true,
    max_turns: 8,
    context_token_budget: 1200,
    
    // Output Configuration
    brief_template: '',
    
    // Appearance Configuration
    primary_color: '#2563eb',
    secondary_color: '#64748b',
    show_logo: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      // Check if this is an AI-generated template (flat structure) or existing template (nested structure)
      const isAIGenerated = template.survey_goal !== undefined;
      
      if (isAIGenerated) {
        // AI-generated template has flat structure - use directly
        setFormData({
          name: template.name || '',
          description: template.description || '',
          category: template.category || 'general',
          template_type: template.template_type || 'ai_dynamic',
          is_default: template.is_default || false,
          
          survey_goal: template.survey_goal || '',
          target_outcome: template.target_outcome || '',
          ai_instructions: template.ai_instructions || '',
          model_name: template.model_name || 'gpt-4o-mini',
          temperature: template.temperature || 0.3,
          max_questions: template.max_questions || 6,
          min_questions: template.min_questions || 3,
          
          enable_semantic_deduplication: template.enable_semantic_deduplication !== false,
          enable_fatigue_detection: template.enable_fatigue_detection !== false,
          enable_dynamic_thresholds: template.enable_dynamic_thresholds !== false,
          fatigue_threshold: template.fatigue_threshold || 0.7,
          similarity_threshold: template.similarity_threshold || 0.85,
          coverage_requirement: template.coverage_requirement || 0.8,
          max_turns: template.max_turns || 8,
          context_token_budget: template.context_token_budget || 1200,
          
          // Slot Schema Configuration
          require_problem_statement: template.require_problem_statement !== false,
          require_stakeholders: template.require_stakeholders !== false,
          require_requirements: template.require_requirements !== false,
          require_success_metrics: template.require_success_metrics !== false,
          require_roi_frame: template.require_roi_frame !== false,
          require_current_process: template.require_current_process !== false,
          
          brief_template: template.brief_template || '',
          
          primary_color: template.primary_color || '#2563eb',
          secondary_color: template.secondary_color || '#64748b',
          show_logo: template.show_logo !== false
        });
      } else {
        // Existing template has nested structure - extract from nested objects
      const aiConfig = template.ai_config || {};
      const outputConfig = template.output_config || {};
      const appearanceConfig = template.appearance_config || {};
      const optimizationConfig = aiConfig.optimization_config || {};
      
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'general',
        template_type: template.template_type || 'ai_dynamic',
        is_default: template.is_default || false,
        
        survey_goal: aiConfig.survey_goal || '',
        target_outcome: aiConfig.target_outcome || '',
        ai_instructions: aiConfig.ai_instructions || '',
          custom_first_question: aiConfig.custom_first_question || '',
        model_name: aiConfig.model_settings?.model_name || 'gpt-4o-mini',
        temperature: aiConfig.model_settings?.temperature || 0.3,
        max_questions: aiConfig.question_limits?.max_questions || 6,
        min_questions: aiConfig.question_limits?.min_questions || 3,
        
        enable_semantic_deduplication: optimizationConfig.enable_semantic_deduplication !== false,
        enable_fatigue_detection: optimizationConfig.enable_fatigue_detection !== false,
        enable_dynamic_thresholds: optimizationConfig.enable_dynamic_thresholds !== false,
        fatigue_threshold: optimizationConfig.fatigue_threshold || 0.7,
        similarity_threshold: optimizationConfig.similarity_threshold || 0.85,
        coverage_requirement: optimizationConfig.coverage_requirement || 0.8,
          
          // Slot Schema Configuration
          require_problem_statement: optimizationConfig.require_problem_statement !== false,
          require_stakeholders: optimizationConfig.require_stakeholders !== false,
          require_requirements: optimizationConfig.require_requirements !== false,
          require_success_metrics: optimizationConfig.require_success_metrics !== false,
          require_roi_frame: optimizationConfig.require_roi_frame !== false,
          require_current_process: optimizationConfig.require_current_process !== false,
          max_turns: optimizationConfig.max_turns || 8,
          context_token_budget: optimizationConfig.context_token_budget || 1200,
        
        brief_template: outputConfig.brief_template || '',
        
        primary_color: appearanceConfig.colors?.primary || '#2563eb',
        secondary_color: appearanceConfig.colors?.secondary || '#64748b',
        show_logo: appearanceConfig.branding?.show_logo !== false
      });
      }
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate category against allowed values
      const validCategories = [
        'general', 'course_feedback', 'customer_feedback', 'employee_feedback', 'event_feedback', 
        'product_feedback', 'service_feedback', 'it_support', 'requirements', 'assessment', 
        'troubleshooting', 'business_analysis', 'market_research', 'user_research', 
        'nps_survey', 'exit_interview'
      ];
      const category = validCategories.includes(formData.category) ? formData.category : 'general';
      
      const templateData = {
        name: formData.name,
        description: formData.description,
        category: category, // Ensure valid category
        templateType: formData.template_type,
        isDefault: formData.is_default,
        
        aiConfig: ['ai_dynamic', 'hybrid'].includes(formData.template_type) ? {
          survey_goal: formData.survey_goal,
          target_outcome: formData.target_outcome,
          ai_instructions: formData.ai_instructions,
          custom_first_question: formData.custom_first_question || '',
          model_settings: {
            model_name: formData.model_name,
            temperature: parseFloat(formData.temperature) || 0.3
          },
          question_limits: {
            max_questions: parseInt(formData.max_questions) || 8,
            min_questions: parseInt(formData.min_questions) || 3
          },
          optimization_config: {
            enable_semantic_deduplication: formData.enable_semantic_deduplication,
            enable_fatigue_detection: formData.enable_fatigue_detection,
            enable_dynamic_thresholds: formData.enable_dynamic_thresholds,
            fatigue_threshold: parseFloat(formData.fatigue_threshold) || 0.7,
            similarity_threshold: parseFloat(formData.similarity_threshold) || 0.85,
            coverage_requirement: parseFloat(formData.coverage_requirement) || 0.8,
            max_turns: parseInt(formData.max_turns) || 8,
            context_token_budget: parseInt(formData.context_token_budget) || 1200,
            
            // Slot Schema Configuration
            slot_schema: {
              require_problem_statement: formData.require_problem_statement,
              require_stakeholders: formData.require_stakeholders,
              require_requirements: formData.require_requirements,
              require_success_metrics: formData.require_success_metrics,
              require_roi_frame: formData.require_roi_frame,
              require_current_process: formData.require_current_process
            }
          }
        } : {},
        
        outputConfig: {
          brief_template: formData.brief_template || 'Default brief template based on survey responses.'
        },
        
        appearanceConfig: {
          colors: {
            primary: formData.primary_color,
            secondary: formData.secondary_color
          },
          branding: {
            show_logo: formData.show_logo
          }
        },
        
        flowConfig: {
          // Default flow configuration for new templates
          steps: [],
          transitions: [],
          conditions: []
        }
      };

      console.log('Sending template data:', templateData);

      const url = template && template.id
        ? `${API_BASE_URL}/api/templates/orgs/${orgId}/unified-templates/${template.id}`
        : `${API_BASE_URL}/api/templates/orgs/${orgId}/unified-templates`;
      
      const method = template && template.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        showSuccess(`Template ${template ? 'updated' : 'created'} successfully`);
        onSave();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
    } catch (err) {
      showError(`Failed to save template: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isAITemplate = ['ai_dynamic', 'hybrid'].includes(formData.template_type);

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Lock body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {template && template.id ? 'Edit Template' : 'Create New Template'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure your survey template with advanced AI optimization features
            </p>
          </div>
          <Button type="button" onClick={onClose} variant="outline" size="sm" className="shrink-0">
            ✕ Close
            </Button>
          </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Basic Info */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Basic Information</h3>
                  
                  <div className="space-y-4">
            <FormInput
              label="Template Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., IT Support Request Template"
            />
            
            <FormTextarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this template is for..."
              rows={3}
            />
            
                    <div className="space-y-4">
              <Select
                label="Template Type"
                value={formData.template_type}
                onChange={(e) => setFormData(prev => ({ ...prev, template_type: e.target.value }))}
                options={TEMPLATE_TYPES}
                required
              />
              
              <Select
                label="Survey Category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                options={CATEGORIES}
                required
              />
            </div>
            
                    <label className="flex items-center space-x-2 p-3 bg-white rounded border">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Set as default template for organization</span>
            </label>
                  </div>
          </div>

                {/* Output Configuration */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">📄 Output Configuration</h3>
                  
                  <FormTextarea
                    label="Brief Template"
                    value={formData.brief_template}
                    onChange={(e) => setFormData(prev => ({ ...prev, brief_template: e.target.value }))}
                    placeholder="Template for the final output document. Use {variable_name} for dynamic content."
                    rows={6}
                  />
                </div>

                {/* Appearance Configuration */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3">🎨 Appearance</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                        <input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-full h-10 rounded border border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                        <input
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="w-full h-10 rounded border border-gray-300"
                        />
                      </div>
                    </div>
                    
                    <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                      <input
                        type="checkbox"
                        checked={formData.show_logo}
                        onChange={(e) => setFormData(prev => ({ ...prev, show_logo: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Show organization logo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column - AI & Optimization */}
              <div className="lg:col-span-2 space-y-6">

          {/* AI Configuration (only for AI templates) */}
          {isAITemplate && (
                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-900 mb-4">🤖 AI Configuration</h3>
              
                    <div className="space-y-4">
              <FormInput
                label="Survey Goal"
                value={formData.survey_goal}
                onChange={(e) => setFormData(prev => ({ ...prev, survey_goal: e.target.value }))}
                placeholder="e.g., Help users resolve technical issues quickly"
                required={isAITemplate}
              />
              
              <FormInput
                label="Target Outcome"
                value={formData.target_outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, target_outcome: e.target.value }))}
                placeholder="e.g., Generate actionable IT support ticket with clear next steps"
                required={isAITemplate}
              />
              
              <FormTextarea
                label="AI Instructions"
                value={formData.ai_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, ai_instructions: e.target.value }))}
                placeholder="Instructions for how the AI should behave during the survey..."
                rows={4}
                required={isAITemplate}
              />
              
              <FormTextarea
                label="Custom First Question (Optional)"
                value={formData.custom_first_question || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_first_question: e.target.value }))}
                placeholder="e.g., 'Thank you for taking this survey. Please tell us about your overall experience with this course.' Leave blank for AI-generated contextual question."
                rows={3}
                helpText="If specified, this question will be used as the opening question. If left blank, AI will generate a contextual question based on your survey goal."
              />
              
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="AI Model"
                  value={formData.model_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                  options={MODEL_OPTIONS}
                />
                
                <FormInput
                  label="Temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <FormInput
                    label="Min Questions"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.min_questions}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_questions: e.target.value }))}
                  />
                  <FormInput
                    label="Max Questions"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_questions}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_questions: e.target.value }))}
                  />
                        </div>
                </div>
              </div>
            </div>
          )}

                {/* Optimization Configuration (only for AI templates) */}
                {isAITemplate && (
                  <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">🎯 Optimization Configuration</h3>
                    <p className="text-sm text-indigo-700 mb-4">
                      Configure advanced AI optimization features for better survey performance
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Deduplication Settings */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Deduplication & Similarity</h4>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.enable_semantic_deduplication}
                            onChange={(e) => setFormData(prev => ({ ...prev, enable_semantic_deduplication: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Enable semantic deduplication</span>
                        </label>
                        
                        <FormInput
                          label="Similarity Threshold"
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="1"
                          value={formData.similarity_threshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, similarity_threshold: e.target.value }))}
                          helpText="Questions above this similarity are considered duplicates"
            />
          </div>

                      {/* Fatigue Detection */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Fatigue Detection</h4>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.enable_fatigue_detection}
                            onChange={(e) => setFormData(prev => ({ ...prev, enable_fatigue_detection: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Enable fatigue detection</span>
                        </label>
                        
                        <FormInput
                          label="Fatigue Threshold"
                          type="number"
                          step="0.1"
                          min="0.3"
                          max="1"
                          value={formData.fatigue_threshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, fatigue_threshold: e.target.value }))}
                          helpText="Stop survey when fatigue score exceeds this value"
                        />
                      </div>

                      {/* Coverage Settings */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Coverage Requirements</h4>
                        
                        <FormInput
                          label="Coverage Requirement"
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="1"
                          value={formData.coverage_requirement}
                          onChange={(e) => setFormData(prev => ({ ...prev, coverage_requirement: e.target.value }))}
                          helpText="Minimum slot coverage percentage to complete survey"
                        />
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.enable_dynamic_thresholds}
                            onChange={(e) => setFormData(prev => ({ ...prev, enable_dynamic_thresholds: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Enable dynamic thresholds</span>
                        </label>
                      </div>

                      {/* Advanced Settings */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Advanced Settings</h4>
                        
                        <FormInput
                          label="Max Turns"
                          type="number"
                          min="3"
                          max="15"
                          value={formData.max_turns || 8}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_turns: e.target.value }))}
                          helpText="Maximum number of questions before forcing completion"
                        />
                        
                        <FormInput
                          label="Context Token Budget"
                          type="number"
                          min="800"
                          max="2000"
                          value={formData.context_token_budget || 1200}
                          onChange={(e) => setFormData(prev => ({ ...prev, context_token_budget: e.target.value }))}
                          helpText="Maximum tokens for conversation context"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Slot Schema Configuration (only for AI templates) */}
                {isAITemplate && (
                  <div className="bg-teal-50 p-6 rounded-lg border border-teal-200">
                    <h3 className="text-lg font-semibold text-teal-900 mb-4">📋 Slot Schema Configuration</h3>
                    <p className="text-sm text-teal-700 mb-4">
                      Configure which information slots are required for this template
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Critical Slots</h4>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.require_problem_statement}
                            onChange={(e) => setFormData(prev => ({ ...prev, require_problem_statement: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Problem Statement</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.require_stakeholders}
                            onChange={(e) => setFormData(prev => ({ ...prev, require_stakeholders: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Stakeholders</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.require_requirements}
                            onChange={(e) => setFormData(prev => ({ ...prev, require_requirements: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Requirements</span>
                        </label>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Important Slots</h4>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.require_success_metrics}
                            onChange={(e) => setFormData(prev => ({ ...prev, require_success_metrics: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Success Metrics</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.require_roi_frame}
                            onChange={(e) => setFormData(prev => ({ ...prev, require_roi_frame: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">ROI/Time Impact</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 p-3 bg-white rounded border">
                          <input
                            type="checkbox"
                            checked={formData.require_current_process}
                            onChange={(e) => setFormData(prev => ({ ...prev, require_current_process: e.target.checked }))}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">Current Process</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            onClick={handleSubmit}
            >
              {saving ? 'Saving...' : (template && template.id ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
      </div>
    </div>
  );
}

/**
 * AI Template Generator Modal - Uses the survey system to generate templates
 */
function AITemplateGeneratorModal({ orgId, onClose, onComplete, showSuccess, showError }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [sessionId] = useState(() => `ai-template-gen-${Date.now()}`);

  // Template generation questions - Enhanced for better AI processing
  const templateQuestions = [
    {
      id: 'template_goal',
      question: "What's the main purpose of this survey template? Describe the business need or problem you're trying to solve.",
      type: 'textarea',
      required: true,
      placeholder: "e.g., We need to gather detailed requirements for a new customer portal that will handle online orders, account management, and support tickets. The current system is outdated and causing customer complaints."
    },
    {
      id: 'first_question',
      question: "What should be the opening question for this survey? (Optional - AI will generate one if left blank)",
      type: 'textarea',
      required: false,
      placeholder: "e.g., 'Thank you for taking this survey. Please tell us about your overall experience with this course.' or leave blank for AI generation"
    },
    {
      id: 'target_audience',
      question: "Who will be taking this survey? Describe their role, technical level, and typical time constraints.",
      type: 'textarea',
      required: true,
      placeholder: "e.g., Business stakeholders including product managers, customer service reps, and end users. They have varying technical knowledge and limited time for lengthy surveys."
    },
    {
      id: 'template_type',
      question: "What type of survey experience do you want to provide?",
      type: 'select',
      options: [
        { value: 'ai_dynamic', label: 'AI Dynamic - Intelligent, adaptive questions that adjust based on responses' },
        { value: 'static', label: 'Static - Fixed set of questions in a predetermined order' },
        { value: 'hybrid', label: 'Hybrid - Mix of core questions plus AI-generated follow-ups' }
      ],
      required: true
    },
    {
      id: 'survey_goal',
      question: "What specific information do you need to collect? Be detailed about the key insights required.",
      type: 'textarea',
      required: true,
      placeholder: "e.g., We need to understand current pain points, desired features, user workflows, integration requirements, security needs, and success metrics for the new portal."
    },
    {
      id: 'target_outcome',
      question: "What should the final deliverable look like? Describe the format and content structure you need.",
      type: 'textarea',
      required: true,
      placeholder: "e.g., A comprehensive requirements document with executive summary, detailed feature specifications, user stories, technical requirements, timeline estimates, and implementation recommendations."
    },
    {
      id: 'ai_instructions',
      question: "How should the AI behave during the survey? Describe the tone, approach, and interaction style.",
      type: 'textarea',
      required: true,
      placeholder: "e.g., Be professional but approachable, ask clarifying questions when responses are vague, focus on gathering specific, actionable details, and explain why certain information is needed."
    },
    {
      id: 'optimization_preferences',
      question: "Any specific preferences for survey behavior, length, or focus areas?",
      type: 'textarea',
      required: false,
      placeholder: "e.g., Keep it concise but thorough, prioritize high-impact features, ensure technical stakeholders can provide detailed input, and make it accessible to non-technical users."
    }
  ];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  // Start the template generation process
  useEffect(() => {
    if (templateQuestions.length > 0) {
      setCurrentQuestion(templateQuestions[0]);
    }
  }, []);

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Move to next question
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < templateQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(templateQuestions[nextIndex]);
    } else {
      // All questions answered, generate template
      generateTemplate(newAnswers);
    }
  };

  const handleNext = () => {
    if (currentQuestion && answers[currentQuestion.id]) {
      handleAnswer(currentQuestion.id, answers[currentQuestion.id]);
    }
  };

  const handleSkip = () => {
    if (currentQuestion) {
      handleAnswer(currentQuestion.id, '');
    }
  };

  const generateTemplate = async (allAnswers) => {
    setIsGenerating(true);
    
    try {
      // Use AI to intelligently process responses and generate template configuration
      const aiGeneratedConfig = await generateTemplateWithAI(allAnswers);
      
      setGeneratedTemplate(aiGeneratedConfig);
      setIsComplete(true);
      showSuccess('Template generated successfully! Review and save when ready.');
      
    } catch (error) {
      console.error('Error generating template:', error);
      showError('Failed to generate template. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTemplateWithAI = async (answers) => {
    const systemPrompt = `You are an expert survey template designer. Based on user responses about their survey needs, generate a complete, intelligent template configuration.

User Responses:
- Template Purpose: ${answers.template_goal || 'Not specified'}
- Custom First Question: ${answers.first_question || 'Not specified (AI will generate)'}
- Target Audience: ${answers.target_audience || 'Not specified'}
- Template Type: ${answers.template_type || 'ai_dynamic'}
- Survey Goal: ${answers.survey_goal || 'Not specified'}
- Target Outcome: ${answers.target_outcome || 'Not specified'}
- AI Instructions: ${answers.ai_instructions || 'Not specified'}
- Optimization Preferences: ${answers.optimization_preferences || 'Not specified'}

Generate a comprehensive template configuration that intelligently interprets these responses and creates appropriate settings for:

1. Template Name: Create a concise, professional name that captures the essence
2. Description: Write a detailed description explaining the template's purpose and use cases
3. Survey Goal: Extract and refine the core objective from the responses
4. Target Outcome: Define what deliverable this survey should produce
5. AI Instructions: Create specific, actionable instructions for AI behavior
6. Optimization Config: Adjust settings based on the survey's purpose and requirements
7. Slot Schema: Configure which slots are required/optional based on the deliverable
8. Brief Template: Create a custom brief format that matches the target outcome
9. Custom First Question: If a custom first question was provided, include it in the AI instructions for the first question generation

IMPORTANT: You must provide ALL nested configuration objects with realistic, intelligent values. Do not leave any fields empty or use placeholder values.

CATEGORY MUST BE ONE OF: general, it_support, requirements, feedback, assessment, troubleshooting, business_analysis

IMPORTANT CATEGORY MAPPING:
- Educational/Student feedback → use "feedback"
- Course evaluation → use "assessment" 
- Training needs → use "requirements"
- IT support → use "it_support"
- Business analysis → use "business_analysis"
- General surveys → use "general"

Return ONLY a valid JSON object with this exact structure:
{
  "name": "string",
  "description": "string", 
  "category": "string (must be one of: general, course_feedback, customer_feedback, employee_feedback, event_feedback, product_feedback, service_feedback, it_support, requirements, assessment, troubleshooting, business_analysis, market_research, user_research, nps_survey, exit_interview)",
  "template_type": "string",
  "is_default": false,
  "aiConfig": {
    "survey_goal": "string",
    "target_outcome": "string", 
    "ai_instructions": "string",
    "custom_first_question": "string (optional - if provided, use this as the opening question)",
    "model_settings": {
      "model_name": "string",
      "temperature": number
    },
    "question_limits": {
      "max_questions": number,
      "min_questions": number
    },
    "optimization_config": {
      "enable_semantic_deduplication": boolean,
      "enable_fatigue_detection": boolean,
      "enable_dynamic_thresholds": boolean,
      "fatigue_threshold": number,
      "similarity_threshold": number,
      "coverage_requirement": number,
      "max_turns": number,
      "context_token_budget": number,
      "slot_schema": {
        "require_problem_statement": boolean,
        "require_stakeholders": boolean,
        "require_requirements": boolean,
        "require_success_metrics": boolean,
        "require_roi_frame": boolean,
        "require_current_process": boolean
      }
    }
  },
  "outputConfig": {
    "brief_template": "string"
  },
  "appearanceConfig": {
    "colors": {
      "primary": "string",
      "secondary": "string"
    },
    "branding": {
      "show_logo": boolean
    }
  }
}`;

    const userPrompt = `Please analyze the user responses and generate an intelligent template configuration. Consider:

- The template purpose and target audience to determine appropriate settings
- The survey goal to configure AI instructions and optimization settings  
- The target outcome to determine required slots and brief template format
- The optimization preferences to adjust thresholds and behavior
- The template type to set appropriate question limits and model settings

Make intelligent decisions about:
- Which slots are critical vs optional based on the deliverable
- Appropriate fatigue and similarity thresholds based on audience
- Question limits based on complexity and audience patience
- Brief template format that matches the expected output
- AI instructions that guide behavior appropriate to the use case

CRITICAL: You must provide complete, realistic values for ALL configuration fields. For example:
- Set specific fatigue_threshold values (0.6-0.8) based on audience patience
- Set similarity_threshold values (0.8-0.95) based on how strict deduplication should be
- Set coverage_requirement values (0.7-0.9) based on how complete the brief needs to be
- Set max_turns values (5-12) based on audience time constraints
- Set context_token_budget values (1000-1500) based on complexity
- Configure slot_schema based on what information is actually needed for the deliverable
- Create detailed brief_template with specific sections that match the target outcome

Do not use placeholder values or leave fields empty. Provide intelligent, context-appropriate settings for every field.`;

    const response = await fetch(`${API_BASE_URL}/api/ai/generate-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate template with AI');
    }

    const result = await response.json();
    console.log('AI Response:', result);
    const parsedConfig = JSON.parse(result.content);
    console.log('Parsed Config:', parsedConfig);
    
    // Debug: Log the nested structure
    console.log('AI Config:', parsedConfig.aiConfig);
    console.log('Optimization Config:', parsedConfig.aiConfig?.optimization_config);
    console.log('Slot Schema:', parsedConfig.aiConfig?.optimization_config?.slot_schema);
    console.log('Output Config:', parsedConfig.outputConfig);
    
    // Ensure the response has the correct structure for the template form
    const finalTemplate = {
      name: parsedConfig.name || 'AI Generated Template',
      description: parsedConfig.description || 'AI-generated template',
      category: parsedConfig.category || 'general',
      template_type: parsedConfig.template_type || 'ai_dynamic',
      is_default: false,
      
      // AI Configuration - Extract from nested aiConfig
      survey_goal: parsedConfig.aiConfig?.survey_goal || '',
      target_outcome: parsedConfig.aiConfig?.target_outcome || '',
      ai_instructions: parsedConfig.aiConfig?.ai_instructions || '',
      custom_first_question: parsedConfig.aiConfig?.custom_first_question || '',
      model_name: parsedConfig.aiConfig?.model_settings?.model_name || 'gpt-4o-mini',
      temperature: parsedConfig.aiConfig?.model_settings?.temperature || 0.3,
      max_questions: parsedConfig.aiConfig?.question_limits?.max_questions || 8,
      min_questions: parsedConfig.aiConfig?.question_limits?.min_questions || 3,
      
      // Optimization Configuration - Extract from nested optimization_config
      enable_semantic_deduplication: parsedConfig.aiConfig?.optimization_config?.enable_semantic_deduplication !== false,
      enable_fatigue_detection: parsedConfig.aiConfig?.optimization_config?.enable_fatigue_detection !== false,
      enable_dynamic_thresholds: parsedConfig.aiConfig?.optimization_config?.enable_dynamic_thresholds !== false,
      fatigue_threshold: parsedConfig.aiConfig?.optimization_config?.fatigue_threshold || 0.7,
      similarity_threshold: parsedConfig.aiConfig?.optimization_config?.similarity_threshold || 0.85,
      coverage_requirement: parsedConfig.aiConfig?.optimization_config?.coverage_requirement || 0.8,
      max_turns: parsedConfig.aiConfig?.optimization_config?.max_turns || 8,
      context_token_budget: parsedConfig.aiConfig?.optimization_config?.context_token_budget || 1200,
      
      // Slot Schema Configuration - Extract from nested slot_schema
      require_problem_statement: parsedConfig.aiConfig?.optimization_config?.slot_schema?.require_problem_statement !== false,
      require_stakeholders: parsedConfig.aiConfig?.optimization_config?.slot_schema?.require_stakeholders !== false,
      require_requirements: parsedConfig.aiConfig?.optimization_config?.slot_schema?.require_requirements !== false,
      require_success_metrics: parsedConfig.aiConfig?.optimization_config?.slot_schema?.require_success_metrics !== false,
      require_roi_frame: parsedConfig.aiConfig?.optimization_config?.slot_schema?.require_roi_frame !== false,
      require_current_process: parsedConfig.aiConfig?.optimization_config?.slot_schema?.require_current_process !== false,
      
      // Output Configuration - Extract from nested outputConfig
      brief_template: parsedConfig.outputConfig?.brief_template || '',
      
      // Appearance Configuration - Extract from nested appearanceConfig
      primary_color: parsedConfig.appearanceConfig?.colors?.primary || '#2563eb',
      secondary_color: parsedConfig.appearanceConfig?.colors?.secondary || '#64748b',
      show_logo: parsedConfig.appearanceConfig?.branding?.show_logo !== false
    };
    
    console.log('Final Mapped Template:', finalTemplate);
    return finalTemplate;
  };

  const handleComplete = () => {
    onComplete(generatedTemplate);
  };

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] w-full max-w-4xl max-h-[95vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-purple-50 rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-purple-900">
              🤖 AI Template Generator
            </h2>
            <p className="text-sm text-purple-700 mt-1">
              Answer a few questions and I'll create a custom survey template for you
            </p>
          </div>
          <Button type="button" onClick={onClose} variant="outline" size="sm" className="shrink-0">
            ✕ Close
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isComplete ? (
            <div className="space-y-6">
              {/* Progress */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {templateQuestions.length}</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / templateQuestions.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / templateQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Question */}
              {currentQuestion && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentQuestion.question}
                  </h3>
                  
                  {currentQuestion.type === 'text' && (
                    <FormInput
                      placeholder={currentQuestion.placeholder || "Type your answer here..."}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => {
                        const newAnswers = { ...answers, [currentQuestion.id]: e.target.value };
                        setAnswers(newAnswers);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          handleAnswer(currentQuestion.id, e.target.value.trim());
                        }
                      }}
                    />
                  )}
                  
                  {currentQuestion.type === 'textarea' && (
                    <FormTextarea
                      placeholder={currentQuestion.placeholder || "Type your answer here..."}
                      rows={4}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => {
                        const newAnswers = { ...answers, [currentQuestion.id]: e.target.value };
                        setAnswers(newAnswers);
                      }}
                    />
                  )}
                  
                  {currentQuestion.type === 'select' && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleAnswer(currentQuestion.id, option.value)}
                          className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      onClick={handleSkip}
                      variant="outline"
                      className="text-gray-600"
                    >
                      Skip
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!answers[currentQuestion.id] || answers[currentQuestion.id].trim() === ''}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {/* Generating State */}
              {isGenerating && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating your custom template...</p>
                </div>
              )}
            </div>
          ) : (
            /* Template Preview */
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Template Generated Successfully!</h3>
                <p className="text-green-700">Your custom template is ready. Review the details below and click "Use This Template" to proceed.</p>
              </div>

              {generatedTemplate ? (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Template Preview</h4>
                  <div className="space-y-3 text-sm">
                    <div><strong>Name:</strong> {generatedTemplate.name || 'N/A'}</div>
                    <div><strong>Type:</strong> {generatedTemplate.template_type || 'N/A'}</div>
                    <div><strong>Goal:</strong> {generatedTemplate.survey_goal || 'N/A'}</div>
                    <div><strong>Outcome:</strong> {generatedTemplate.target_outcome || 'N/A'}</div>
                    <div><strong>AI Instructions:</strong> {generatedTemplate.ai_instructions || 'N/A'}</div>
                    <div><strong>Model:</strong> {generatedTemplate.model_name || 'N/A'}</div>
                    <div><strong>Max Questions:</strong> {generatedTemplate.max_questions || 'N/A'}</div>
                    <div><strong>Fatigue Threshold:</strong> {generatedTemplate.fatigue_threshold || 'N/A'}</div>
                    <div><strong>Coverage Requirement:</strong> {generatedTemplate.coverage_requirement || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-red-700">Error: Template data not available. Please try again.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          {isComplete && (
            <Button 
              onClick={handleComplete}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              Use This Template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UnifiedTemplatesTab;
