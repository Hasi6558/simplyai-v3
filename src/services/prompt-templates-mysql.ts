// MySQL-based prompt templates service that calls the backend API instead of Supabase
import { API_BASE_URL } from '@/config/api';

export interface PromptTemplate {
  id: string;
  plan_id: string;
  questionnaire_id: string;
  title: string;
  content: string;
  system_prompt: string;
  variables: any[];
  sequence_index: number;
  sections_data?: any;
  report_template?: string;
  reference_questionnaires?: any;
  created_at: string;
  updated_at: string;
}

export interface PromptVariable {
  id: string;
  name: string;
  description?: string;
  type: string;
  default_value?: string;
}

// ChartConfig type for chart settings
export interface ChartConfig {
  width?: string | number;
  height?: number;
  colors?: string[];
  title?: {
    text?: string;
    align?: 'left' | 'center' | 'right';
    style?: {
      fontSize?: string;
      fontWeight?: string | number;
      color?: string;
    };
  };
  subtitle?: {
    text?: string;
    align?: 'left' | 'center' | 'right';
    style?: {
      fontSize?: string;
      fontWeight?: string | number;
      color?: string;
    };
  };
  xaxis?: {
    title?: string;
    categories?: string[];
    labels?: {
      rotate?: number;
      style?: {
        fontSize?: string;
        colors?: string | string[];
      };
    };
  };
  yaxis?: {
    title?: string;
    labels?: {
      style?: {
        fontSize?: string;
        colors?: string | string[];
      };
    };
  };
  legend?: {
    show?: boolean;
    position?: 'top' | 'right' | 'bottom' | 'left';
    horizontalAlign?: 'left' | 'center' | 'right';
    floating?: boolean;
    fontSize?: string;
  };
  tooltip?: {
    enabled?: boolean;
    style?: {
      fontSize?: string;
    };
  };
  dataLabels?: {
    enabled?: boolean;
    style?: {
      fontSize?: string;
      colors?: string[];
    };
  };
  stroke?: {
    width?: number;
    curve?: 'smooth' | 'straight' | 'stepline';
  };
  grid?: {
    show?: boolean;
    borderColor?: string;
    row?: {
      colors?: string[];
    };
  };
  animations?: {
    enabled?: boolean;
    speed?: number;
  };
  theme?: {
    mode?: 'light' | 'dark';
    palette?: string;
  };
  series?: any[];
}

// Tipo per le sezioni dei report con prompt specifici
export interface ReportSectionWithPrompt {
  id: string;
  title: string;
  shortcode: string;
  prompt?: string;
  type?: string;
  chartType?: string;
  tableType?: string;
  config?: ChartConfig | { headers?: string[]; sortable?: boolean; } | any;
}

// Struttura per i dati delle sezioni
export interface SectionsData {
  text: ReportSectionWithPrompt[];
  charts: ReportSectionWithPrompt[];
  tables: ReportSectionWithPrompt[];
}

// Interface per i prompt template con sezioni
export interface PromptTemplateWithSections extends PromptTemplate {
  reportTemplate?: string;
  sections?: SectionsData;
}

// Fetch all prompt templates for a specific plan
export const fetchPlanPromptTemplates = async (planId: string): Promise<PromptTemplate[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prompt-templates/plan/${planId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch prompt templates');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch prompt templates');
    }
    
    return result.data as PromptTemplate[] || [];
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    return [];
  }
};

// Fetch specific prompt template
export const fetchPromptTemplate = async (promptId: string): Promise<PromptTemplateWithSections | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prompt-templates/${promptId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch prompt template');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch prompt template');
    }
    
    const template = result.data as PromptTemplate;
    
    // Convert to PromptTemplateWithSections format
    const sectionsData = template.sections_data ? {
      text: template.sections_data.text || [],
      charts: template.sections_data.charts || [],
      tables: template.sections_data.tables || []
    } : {
      text: [],
      charts: [],
      tables: []
    };

    return {
      ...template,
      reportTemplate: template.report_template || '',
      sections: sectionsData
    } as PromptTemplateWithSections;
  } catch (error) {
    console.error('Error fetching prompt template:', error);
    return null;
  }
};

// Fetch prompt template for a specific plan and questionnaire
export const fetchPromptForQuestionnaire = async (
  planId: string, 
  questionnaireId: string,
  sequenceIndex: number = 0
): Promise<PromptTemplate | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prompt-templates/plan/${planId}/questionnaire/${questionnaireId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch prompt template');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch prompt template');
    }
    
    const templates = result.data as PromptTemplate[];
    const template = templates.find(t => t.sequence_index === sequenceIndex) || templates[0];
    
    return template || null;
  } catch (error) {
    console.error('Error fetching prompt template:', error);
    return null;
  }
};

// Fetch all prompts for a specific questionnaire
export const fetchPromptsForQuestionnaire = async (
  questionnaireId: string
): Promise<PromptTemplate[]> => {
  try {
    // This would need a new endpoint in the backend
    // For now, we'll return empty array
    console.warn('fetchPromptsForQuestionnaire not yet implemented for MySQL backend');
    return [];
  } catch (error) {
    console.error('Error fetching questionnaire prompts:', error);
    return [];
  }
};

// Fetch prompts for all questionnaires in a plan
export const fetchPromptsForPlanQuestionnaires = async (
  planId: string,
  questionnaireIds: string[]
): Promise<Record<string, PromptTemplate[]>> => {
  try {
    const promptsByQuestionnaire: Record<string, PromptTemplate[]> = {};
    
    // Fetch all prompts for the plan (now includes both prompt_templates and report_generation_settings)
    const allPrompts = await fetchPlanPromptTemplates(planId);
    
    // Group prompts by questionnaire_id
    allPrompts.forEach(prompt => {
      if (questionnaireIds.includes(prompt.questionnaire_id)) {
        if (!promptsByQuestionnaire[prompt.questionnaire_id]) {
          promptsByQuestionnaire[prompt.questionnaire_id] = [];
        }
        promptsByQuestionnaire[prompt.questionnaire_id].push(prompt);
      }
    });
    
    // Ensure all questionnaire IDs are represented (even if empty)
    questionnaireIds.forEach(questionnaireId => {
      if (!promptsByQuestionnaire[questionnaireId]) {
        promptsByQuestionnaire[questionnaireId] = [];
      }
    });
    
    return promptsByQuestionnaire;
  } catch (error) {
    console.error('Error fetching plan questionnaire prompts:', error);
    return {};
  }
};

// Save prompt template
export const savePromptTemplate = async (
  template: Partial<PromptTemplateWithSections>
): Promise<PromptTemplate | null> => {
  try {
    const isUpdate = !!template.id;
    const url = isUpdate ? `${API_BASE_URL}/prompt-templates/${template.id}` : `${API_BASE_URL}/prompt-templates`;
    const method = isUpdate ? 'PUT' : 'POST';
    
    // Convert PromptTemplateWithSections to the backend format for report_generation_settings
    const { sections, reportTemplate, system_prompt, content, reference_questionnaires, ...baseTemplate } = template;
    
    const templateToSave = {
      ...baseTemplate,
      sections_data: sections,
      template_structure: reportTemplate, // Map to template_structure column
      system_prompt: system_prompt, // Map to system_prompt column
      prompt_principale: content, // Map to prompt_principale column
      reference_questionnaires: reference_questionnaires // Map to reference_questionnaires column
    };
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateToSave)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save prompt template');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to save prompt template');
    }
    
    if (isUpdate) {
      // For updates, return the template with updated data
      return { 
        ...templateToSave, 
        updated_at: new Date().toISOString(),
        sections_data: sections,
        template_structure: reportTemplate,
        content: content || '',
        reference_questionnaires: reference_questionnaires
      } as PromptTemplate;
    } else {
      // For creates, return the template with the new ID
      return { 
        ...templateToSave, 
        id: result.data.id, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        sections_data: sections,
        template_structure: reportTemplate,
        content: content || '',
        reference_questionnaires: reference_questionnaires
      } as PromptTemplate;
    }
  } catch (error) {
    console.error('Error saving prompt template:', error);
    return null;
  }
};

export const deletePromptTemplate = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prompt-templates/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete prompt template');
    }
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting prompt template:', error);
    return false;
  }
};
