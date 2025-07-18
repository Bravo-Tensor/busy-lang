
import { useState } from 'react';
import FormField from './FormField';

interface HumanTaskFormProps {
  task: any;
  onComplete: (outputData: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function HumanTaskForm({ task, onComplete, isLoading }: HumanTaskFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    // TODO: Implement proper validation based on task schema
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete(formData);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Generate form fields based on task configuration
  const renderFormFields = () => {
    // TODO: Generate fields based on task.outputs schema
    return (
      <div className="space-y-4">
        <FormField
          name="notes"
          label="Notes"
          type="textarea"
          value={formData.notes || ''}
          onChange={(value) => handleFieldChange('notes', value)}
          placeholder="Add any notes about this step..."
        />
        <FormField
          name="completed"
          label="Mark as Complete"
          type="checkbox"
          value={formData.completed || false}
          onChange={(value) => handleFieldChange('completed', value)}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderFormFields()}
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Complete Step'}
        </button>
      </div>
    </form>
  );
}
