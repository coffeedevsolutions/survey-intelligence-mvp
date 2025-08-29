import { useState } from 'react';
import { Button } from '../../ui/button';
import { campaignDefaults } from '../../../utils/campaignsApi.js';

/**
 * Create flow form component
 */
export function CreateFlowForm({ onSubmit, onCancel }) {
  const [flowForm, setFlowForm] = useState({
    title: '',
    spec_json: null,
    use_ai: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const flowData = {
        title: flowForm.title,
        spec_json: flowForm.spec_json || campaignDefaults.getDefaultFlowSpec(),
        use_ai: flowForm.use_ai
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
      <div className="space-y-4">
        <FlowTitleInput 
          value={flowForm.title}
          onChange={(title) => setFlowForm({ ...flowForm, title })}
        />
        
        <AIToggle
          checked={flowForm.use_ai}
          onChange={(use_ai) => setFlowForm({ ...flowForm, use_ai })}
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
