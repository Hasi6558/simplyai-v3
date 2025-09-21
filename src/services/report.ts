
import { API_BASE_URL } from '@/config/api';


export type UserReport = {
  id: string;
  questionnaire_id: string;
  created_at: string;
  title: string;
  pdf_url: string | null;
  user_id: string;
  content: ReportData;
};

export type ReportData = {
  title?: string;
  date?: string;
  sections?: {
    title: string;
    content: string;
    type: 'text' | 'bar-chart' | 'pie-chart';
    chartData?: any[];
  }[];
  textSections?: Record<string, string>;
  chartSections?: Record<string, any>;
  tableSections?: Record<string, any>;
  ai_response?: string;
  questionnaire_id?: string; // Added questionnaire_id property
};

export const fetchReportsByUser = async (userId: string): Promise<UserReport[]> => {
  try {

    const response = await fetch(`${API_BASE_URL}/reports/user/${userId}`);



    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch reports');
    }
    
    return data.reports as UserReport[] || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

export const fetchReportById = async (reportId: string): Promise<ReportData | null> => {
  try {

    console.log('fetchReportById - Making request to:', `${API_BASE_URL}/reports/${reportId}`);
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}`);

    console.log('fetchReportById - Response status:', response.status);
    
    const data = await response.json();
    console.log('fetchReportById - Raw response data:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch report');
    }
    
    // Return the full report object instead of just content
    console.log('fetchReportById - Returning full report:', data.report);
    return data.report as ReportData;
  } catch (error) {
    console.error('Error fetching report:', error);
    return null;
  }
};

export const saveReportTemplate = async (template: { title: string; content: string; description?: string }): Promise<boolean> => {
  try {
    // For now, we'll just return true as template saving is not implemented in backend yet
    console.log('Save report template not implemented yet', template);
    return true;
  } catch (error) {
    console.error('Error saving report template:', error);
    return false;
  }
};

export const fetchLatestReportTemplate = async (): Promise<string | null> => {
  try {
    // For now, we'll just return null as template fetching is not implemented in backend yet
    console.log('Fetch latest report template not implemented yet');
    return null;
  } catch (error) {
    console.error('Error fetching report template:', error);
    return null;
  }
};
