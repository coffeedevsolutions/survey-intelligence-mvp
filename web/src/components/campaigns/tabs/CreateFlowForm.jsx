import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { campaignDefaults } from '../../../utils/campaignsApi.js';
import { API_BASE_URL } from '../../../utils/api';

/**
 * Create flow form component
 */
export function CreateFlowForm({ onSubmit, onCancel, user, campaign }) {
  const [flowForm, setFlowForm] = useState({
    title: '',
    spec_json: null,
    use_ai: true,
    survey_template_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyTemplates, setSurveyTemplates] = useState([]);

  const fetchSurveyTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orgs/${user.orgId}/survey-templates`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSurveyTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching survey templates:', error);
    }
  }, [user.orgId]);

  // Fetch survey templates
  useEffect(() => {
    if (user?.orgId) {
      fetchSurveyTemplates();
    }
  }, [user?.orgId, fetchSurveyTemplates]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const flowData = {
        title: flowForm.title,
        spec_json: flowForm.spec_json || campaignDefaults.getDefaultFlowSpec(),
        use_ai: flowForm.use_ai,
        survey_template_id: flowForm.survey_template_id || null
      };
      
      const success = await onSubmit(flowData);
      if (success) {
        setFlowForm({ title: '', spec_json: null, use_ai: true, survey_template_id: '' });
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
      <div className="space-y-4">
        <FlowTitleInput 
          value={flowForm.title}
          onChange={(title) => setFlowForm({ ...flowForm, title })}
        />
        
        <AIToggle
          checked={flowForm.use_ai}
          onChange={(use_ai) => setFlowForm({ ...flowForm, use_ai })}
        />
        
        <SurveyTemplateSelect
          value={flowForm.survey_template_id}
          onChange={(survey_template_id) => setFlowForm({ ...flowForm, survey_template_id })}
          templates={surveyTemplates}
          campaign={campaign}
        />
        
        <FlowSpecInput
          value={flowForm.spec_json}
          onChange={handleSpecChange}
        />
        
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
 * Survey template selection component
 */
function SurveyTemplateSelect({ value, onChange, templates, campaign }) {
  const getCampaignTemplateName = () => {
    if (campaign?.survey_template_id) {
      const campaignTemplate = templates.find(t => t.id === campaign.survey_template_id);
      return campaignTemplate ? campaignTemplate.name : 'Campaign Template';
    }
    const defaultTemplate = templates.find(t => t.is_default);
    return defaultTemplate ? defaultTemplate.name : 'Organization Default';
  };

  return (
    <div>
      <label className="form-label-enhanced">Survey Template</label>
      <select
        className="form-input-enhanced"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          Inherit from campaign ({getCampaignTemplateName()})
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} {template.is_default && '(Default)'}
          </option>
        ))}
      </select>
      <p className="text-sm text-gray-500 mt-1">
        Override the campaign's survey template for this specific flow, or leave blank to inherit.
      </p>
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
