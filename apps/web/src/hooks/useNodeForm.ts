import { useState, useEffect } from 'react';
import { GraphNode, NodeType, UnlockCondition, ExerciseType } from '../types';

interface NodeFormData {
  label: string;
  type: NodeType;
  xp: number;
  group: string;
  galaxy: string; // Legacy
  constellation: string; // New
  parentStar: string; // New
  orbitRing: number; // Cercle orbital (0 = étoile centrale, 1+ = cercles concentriques)
  unlockCondition: UnlockCondition;
  description: string;
  minimumScore: number;
  courseContent: string;
  exerciseType: ExerciseType;
  exerciseData: string;
  visualConfig?: any;
  validationType: 'auto' | 'peer' | 'teacher';
  peerValidationConfig: string;
}

const INITIAL_STATE: NodeFormData = {
  label: '',
  type: 'planet',
  xp: 100,
  group: '',
  galaxy: '',
  constellation: '',
  parentStar: '',
  orbitRing: 1, // Par défaut cercle 1 (autour de l'étoile centrale)
  unlockCondition: 'AND',
  description: '',
  minimumScore: 80,
  courseContent: '',
  exerciseType: 'none',
  exerciseData: '',
  validationType: 'auto',
  peerValidationConfig: ''
};

export function useNodeForm(initialData?: Partial<GraphNode>) {
  const [formData, setFormData] = useState<NodeFormData>(INITIAL_STATE);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or Load data only when selecting a DIFFERENT node (by ID)
  // This prevents resetting isDirty when we update the current node's data
  useEffect(() => {
    if (initialData) {
      setFormData({
        label: initialData.label || '',
        type: initialData.type || 'planet',
        xp: initialData.xp || 100,
        group: initialData.group || '',
        galaxy: initialData.galaxy || '',
        constellation: initialData.constellation || initialData.galaxy || '',
        parentStar: initialData.parentStar || initialData.group || '',
        orbitRing: initialData.orbitRing ?? 1,
        unlockCondition: initialData.unlockCondition || 'AND',
        description: initialData.exerciseDescription || '',
        minimumScore: initialData.minimumScore || 80,
        courseContent: initialData.courseContent || '',
        exerciseType: initialData.exerciseType || 'none',
        exerciseData: initialData.exerciseData || '',
        visualConfig: initialData.visualConfig || {},
        validationType: (initialData as any).validationType || 'auto',
        peerValidationConfig: initialData.peerValidationConfig || ''
      });
      setIsDirty(false);
    } else {
      setFormData(INITIAL_STATE);
      setIsDirty(false);
    }
  }, [initialData?.id]); // Only trigger when node ID changes, not on every data update

  const handleChange = (field: keyof NodeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear error if exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Update multiple fields at once and mark as dirty
  const updateFormData = (updates: Partial<NodeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  // Mark form as clean (after successful save)
  const markClean = () => {
    setIsDirty(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.label.trim()) newErrors.label = 'Le nom est requis';
    if (!formData.constellation.trim() && !formData.galaxy.trim()) newErrors.constellation = 'La constellation est requise';
    if (!formData.parentStar.trim() && !formData.group.trim()) newErrors.parentStar = 'L\'étoile parente est requise';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSubmissionData = () => {
    const { description, ...rest } = formData;
    return {
      ...rest,
      exerciseDescription: description,
      // Ensure compatibility / migration
      galaxy: formData.constellation || formData.galaxy,
      group: formData.parentStar || formData.group,
    };
  };

  return {
    formData,
    handleChange,
    updateFormData,
    validate,
    getSubmissionData,
    isDirty,
    markClean,
    reset: () => { setFormData(INITIAL_STATE); setIsDirty(false); },
    errors,
    setFormData // Exposed for complex updates (like exercise builder)
  };
}
