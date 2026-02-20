export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  pdfUrl: string;
  arxivUrl: string;
  categories: string[];
  primaryCategory: string;
}

export interface SummaryResult {
  title: string;
  keyPoints: string[];
  methodology: string;
  findings: string;
  implications: string;
  overallSummary: string;
}

export interface SearchFilters {
  category: string;
  sortBy: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
  sortOrder: 'ascending' | 'descending';
  maxResults: number;
}
