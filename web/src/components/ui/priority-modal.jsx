import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { PriorityInput } from './priority-input';
import { getFramework, validatePriorityValues } from '../../utils/prioritizationFrameworks';

/**
 * Priority Setting Modal
 * Used for setting complex priorities (ICE, RICE, etc.) that need detailed input
 */
export function PriorityModal({
  isOpen,
  onClose,
  onSave,
  frameworkId = 'simple',
  currentValue = null,
  briefTitle = 'Brief',
  className = ''
}) {
  const [priorityValue, setPriorityValue] = useState(currentValue || {});
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const framework = getFramework(frameworkId);

  useEffect(() => {
    setPriorityValue(currentValue || {});
  }, [currentValue, isOpen]);

  const handlePriorityChange = (newValue, valid) => {
    setPriorityValue(newValue);
    setIsValid(valid);
  };

  const handleSave = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      await onSave(priorityValue);
      onClose();
    } catch (error) {
      console.error('Error saving priority:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPriorityValue(currentValue || {});
    onClose();
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <Button 
        variant="outline" 
        onClick={handleCancel}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSave}
        disabled={!isValid || loading}
        className="min-w-[100px]"
      >
        {loading ? 'Saving...' : 'Set Priority'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Set Priority: ${briefTitle}`}
      description={`Use ${framework.name} to prioritize this brief`}
      footer={footer}
      className={className}
    >
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">{framework.name}</h4>
          <p className="text-sm text-blue-700">{framework.description}</p>
        </div>

        <PriorityInput
          frameworkId={frameworkId}
          value={priorityValue}
          onChange={handlePriorityChange}
          showLabel={false}
          compact={false}
        />

        {/* Tips for specific frameworks */}
        {frameworkId === 'ice' && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Tip:</strong> Score each factor from 1-10:</p>
            <ul className="list-disc list-inside text-xs ml-2 space-y-1">
              <li><strong>Impact:</strong> How much will this move the needle?</li>
              <li><strong>Confidence:</strong> How sure are we this will work?</li>
              <li><strong>Ease:</strong> How easy is this to implement?</li>
            </ul>
          </div>
        )}

        {frameworkId === 'rice' && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Tip:</strong> RICE helps prioritize based on reach and impact vs effort:</p>
            <ul className="list-disc list-inside text-xs ml-2 space-y-1">
              <li><strong>Reach:</strong> How many people/customers affected per time period?</li>
              <li><strong>Impact:</strong> How much impact per person? (0.25x to 3x)</li>
              <li><strong>Confidence:</strong> How confident are we? (% from 10-100%)</li>
              <li><strong>Effort:</strong> How much work? (person-weeks)</li>
            </ul>
          </div>
        )}

        {frameworkId === 'value_effort' && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Tip:</strong> Plot this initiative on the Value vs Effort matrix:</p>
            <ul className="list-disc list-inside text-xs ml-2 space-y-1">
              <li><strong>High Value + Low Effort:</strong> Quick wins (do first)</li>
              <li><strong>High Value + High Effort:</strong> Major projects (plan carefully)</li>
              <li><strong>Low Value + Low Effort:</strong> Fill-ins (do when time permits)</li>
              <li><strong>Low Value + High Effort:</strong> Thankless tasks (avoid)</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
