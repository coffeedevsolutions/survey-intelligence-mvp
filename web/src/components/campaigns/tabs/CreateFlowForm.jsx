import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { campaignDefaults } from '../../../utils/campaignsApi.js';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Create flow form component - Updated for Unified Template System
 */
export function CreateFlowForm({ onSubmit, onCancel, user, campaign }) {
  const [flowForm, setFlowForm] = useState({
    title: '',
    spec_json: null,
    use_ai: true,
    // Remove survey_template_id - flows now inherit from campaign's unified template
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unifiedTemplate, setUnifiedTemplate] = useState(null);

  const fetchUnifiedTemplate = useCallback(async () => {
    try {
      if (campaign?.unified_template_id) {
        const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/unified-templates/${campaign.unified_template_id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUnifiedTemplate(data.template);
          
          // Auto-configure flow based on template type
          const isAITemplate = ['ai_dynamic', 'hybrid'].includes(data.template.template_type);
          setFlowForm(prev => ({ 
            ...prev, 
            use_ai: isAITemplate,
            title: prev.title || `${data.template.name} Flow v${Date.now().toString().slice(-4)}`
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching unified template:', error);
    }
  }, [user.orgId, campaign?.unified_template_id]);

  // Fetch unified template when campaign loads
  useEffect(() => {
    if (user?.orgId && campaign?.unified_template_id) {
      fetchUnifiedTemplate();
    }
  }, [user?.orgId, campaign?.unified_template_id, fetchUnifiedTemplate]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const flowData = {
        title: flowForm.title,
        // For unified templates, we use a minimal spec - the AI handles question generation
        spec_json: unifiedTemplate && ['ai_dynamic', 'hybrid'].includes(unifiedTemplate.template_type) 
          ? { questions: [], ai_powered: true, unified_template_id: campaign.unified_template_id }
          : (flowForm.spec_json || campaignDefaults.getDefaultFlowSpec()),
        use_ai: flowForm.use_ai,
        // No longer pass survey_template_id - flows inherit from campaign's unified template
      };
      
      const success = await onSubmit(flowData);
      if (success) {
        setFlowForm({ title: '', spec_json: null, use_ai: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpecChange = (value) => {
    try {
      const parsed = JSON.parse(value);
      setFlowForm({ ...flowForm, spec_json: parsed });
    } catch {
      // Invalid JSON, ignore
    }
  };

  return (
    <div className="surface card-pad mb-6">
      <h4 className="text-lg font-semibold mb-4">Create Survey Flow</h4>
      
      {/* Unified Template Info */}
      {unifiedTemplate && (
        <UnifiedTemplateInfo template={unifiedTemplate} />
      )}
      
      <div className="space-y-4">
        <FlowTitleInput 
          value={flowForm.title}
          onChange={(title) => setFlowForm({ ...flowForm, title })}
        />
        
        {/* Only show manual controls for static templates or when no unified template */}
        {(!unifiedTemplate || unifiedTemplate.template_type === 'static') && (
          <>
            <AIToggle
              checked={flowForm.use_ai}
              onChange={(use_ai) => setFlowForm({ ...flowForm, use_ai })}
            />
            
            <FlowSpecInput
              value={flowForm.spec_json}
              onChange={handleSpecChange}
            />
          </>
        )}
        
        <FormActions
          onSubmit={handleSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          canSubmit={!!flowForm.title}
        />
      </div>
    </div>
  );
}

/**
 * Unified Template Info Display
 */
function UnifiedTemplateInfo({ template }) {
  const getTemplateTypeIcon = (type) => {
    const icons = {
      'ai_dynamic': '🤖',
      'hybrid': '🎯', 
      'static': '📋'
    };
    return icons[type] || '📄';
  };

  const getTemplateTypeLabel = (type) => {
    const labels = {
      'ai_dynamic': 'AI Dynamic Survey',
      'hybrid': 'Hybrid Survey',
      'static': 'Static Survey'
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h5 className="font-medium text-blue-900 mb-2">✨ Using Unified Template</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-blue-700">
            <strong>Template:</strong> {getTemplateTypeIcon(template.template_type)} {template.name}
          </p>
          <p className="text-sm text-blue-700">
            <strong>Type:</strong> {getTemplateTypeLabel(template.template_type)}
          </p>
        </div>
        <div>
          <p className="text-sm text-blue-700">
            <strong>Features:</strong> {template.template_type === 'static' 
              ? 'Predefined questions' 
              : 'AI-powered with semantic deduplication, fatigue detection, and smart completion'}
          </p>
        </div>
      </div>
      {template.description && (
        <p className="text-sm text-blue-600 mt-2 italic">{template.description}</p>
      )}
    </div>
  );
}

/**
 * Flow title input component
 */
function FlowTitleInput({ value, onChange }) {
  return (
    <div>
      <label className="form-label-enhanced">Flow Title</label>
      <input
        className="form-input-enhanced"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Default v1"
      />
    </div>
  );
}

/**
 * AI toggle component
 */
function AIToggle({ checked, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id="use_ai"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-ring"
      />
      <label htmlFor="use_ai" className="text-sm">Enable AI-enhanced questioning</label>
    </div>
  );
}

/**
 * Flow specification input component
 */
function FlowSpecInput({ value, onChange }) {
  const displayValue = value ? JSON.stringify(value, null, 2) : '';
  const placeholder = JSON.stringify(campaignDefaults.getDefaultFlowSpec(), null, 2);

  return (
    <div>
      <label className="form-label-enhanced">Flow Specification (JSON)</label>
      <p className="text-sm text-gray-600 mb-2">
        ⚠️ <strong>Manual Configuration:</strong> Only needed for static templates or advanced customization. 
        AI templates handle question generation automatically.
      </p>
      <textarea
        className="form-textarea-enhanced"
        rows={10}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}
      />
    </div>
  );
}



/**
 * Form actions component
 */
function FormActions({ onSubmit, onCancel, isSubmitting, canSubmit }) {
  return (
    <div className="flex gap-3">
      <Button 
        onClick={onSubmit} 
        disabled={!canSubmit || isSubmitting}
        className="rounded-xl"
      >
        {isSubmitting ? 'Creating...' : 'Create Flow'}
      </Button>
      <Button 
        variant="outline" 
        onClick={onCancel} 
        disabled={isSubmitting}
        className="rounded-xl"
      >
        Cancel
      </Button>
    </div>
  );
}
