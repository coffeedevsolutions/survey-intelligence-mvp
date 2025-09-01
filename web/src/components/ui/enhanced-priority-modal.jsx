import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Badge } from './badge';
import { PriorityInput } from './priority-input';
import { getFramework, validatePriorityValues, getAllFrameworks } from '../../utils/prioritizationFrameworks';

/**
 * Enhanced Priority Setting Modal
 * Allows framework selection and priority setting in one interface
 */
export function EnhancedPriorityModal({
  isOpen,
  onClose,
  onSave,
  enabledFrameworks = ['simple'],
  defaultFramework = 'simple',
  currentValue = null,
  currentFramework = null,
  briefTitle = 'Brief',
  className = ''
}) {
  const [selectedFramework, setSelectedFramework] = useState(currentFramework || defaultFramework);
  const [priorityValue, setPriorityValue] = useState(currentValue || {});
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const framework = getFramework(selectedFramework);
  const availableFrameworks = getAllFrameworks().filter(f => enabledFrameworks.includes(f.id));

  useEffect(() => {
    setSelectedFramework(currentFramework || defaultFramework);
    setPriorityValue(currentValue || {});
  }, [currentFramework, currentValue, defaultFramework, isOpen]);

  useEffect(() => {
    // Reset priority value when framework changes
    setPriorityValue({});
    setIsValid(false);
  }, [selectedFramework]);

  const handlePriorityChange = (newValue, valid) => {
    setPriorityValue(newValue);
    setIsValid(valid);
  };

  const handleSave = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      await onSave(priorityValue, selectedFramework);
      onClose();
    } catch (error) {
      console.error('Error saving priority:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFramework(currentFramework || defaultFramework);
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
      description="Choose a prioritization framework and set the priority"
      footer={footer}
      className={`max-w-3xl ${className}`}
    >
      <div className="space-y-6">
        {/* Framework Selection */}
        {availableFrameworks.length > 1 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Choose Prioritization Method</h4>
            <div className="grid gap-2">
              {availableFrameworks.map((fw) => (
                <div
                  key={fw.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedFramework === fw.id 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedFramework(fw.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{fw.name}</h5>
                        {fw.id === defaultFramework && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{fw.description}</p>
                    </div>
                    <input
                      type="radio"
                      name="framework"
                      checked={selectedFramework === fw.id}
                      onChange={() => setSelectedFramework(fw.id)}
                      className="w-4 h-4 text-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Framework Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-blue-900">{framework.name}</h4>
            <Badge variant="outline" className="text-xs bg-white">
              {framework.type}
            </Badge>
          </div>
          <p className="text-sm text-blue-700">{framework.description}</p>
        </div>

        {/* Priority Input */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Set Priority</h4>
          <PriorityInput
            frameworkId={selectedFramework}
            value={priorityValue}
            onChange={handlePriorityChange}
            showLabel={false}
            compact={false}
          />
        </div>

        {/* Framework-specific tips */}
        {selectedFramework === 'ice' && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">ICE Scoring Tips:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>Impact:</strong> How much will this move the needle? (1=minimal, 10=transformative)</li>
              <li><strong>Confidence:</strong> How sure are we this will work? (1=hypothesis, 10=proven)</li>
              <li><strong>Ease:</strong> How easy is this to implement? (1=very hard, 10=very easy)</li>
            </ul>
          </div>
        )}

        {selectedFramework === 'rice' && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">RICE Scoring Guide:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>Reach:</strong> How many people affected per time period?</li>
              <li><strong>Impact:</strong> How much impact per person? (0.25x to 3x multiplier)</li>
              <li><strong>Confidence:</strong> How confident are we? (10-100%)</li>
              <li><strong>Effort:</strong> How much work in person-weeks?</li>
            </ul>
          </div>
        )}

        {selectedFramework === 'moscow' && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">MoSCoW Categories:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>Must Have:</strong> Critical requirements that must be delivered</li>
              <li><strong>Should Have:</strong> Important but not critical for this release</li>
              <li><strong>Could Have:</strong> Nice to have if time permits</li>
              <li><strong>Won't Have:</strong> Not planned for this iteration</li>
            </ul>
          </div>
        )}

        {selectedFramework === 'value_effort' && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">Value vs Effort Matrix:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>High Value + Low Effort:</strong> Quick wins (prioritize first)</li>
              <li><strong>High Value + High Effort:</strong> Major projects (plan carefully)</li>
              <li><strong>Low Value + Low Effort:</strong> Fill-ins (when time permits)</li>
              <li><strong>Low Value + High Effort:</strong> Avoid these</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
