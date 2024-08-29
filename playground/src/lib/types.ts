export type AnalysisResult = {
  errors: PolicyError[];
  handled_errors: PolicyError[];
}

export type PolicyError = {
  error: string;
  ranges: string[];
}