/**
 * 临床研究方案 - 智能写作向导数据类型
 */

export interface WritingGuideData {
  // 1) 研究关键词
  keywords: string[];

  // 2) 研究题目
  researchTitle: string;

  // 3) 方案编号
  protocolNumber: string;

  // 4) 版本号
  versionNumber: string;

  // 5) 研究形式
  studyForm: string;

  // 6) 试验目的
  trialObjective: string;

  // 7) 研究药物
  drugInfo: {
    trialDrug: string;
    drugPackaging: string;
    manufacturer: string;
  };

  // 8) 受试者
  subjects: string;

  // 9) 总体设计
  overallDesign: string;

  // 10) 治疗方案
  treatmentPlan: string;

  // 11) 诊断标准
  diagnosticCriteria: string;

  // 12) 受试者例数
  sampleSize: string;

  // 13) 试验设计
  trialDesign: string;

  // 14) 纳入标准
  inclusionCriteria: string;

  // 15) 排除标准
  exclusionCriteria: string;

  // 16) 退出标准
  withdrawalCriteria: string;

  // 17) 中止标准
  terminationCriteria: string;

  // 18) 中止/退出的处理程序
  withdrawalProcedure: string;

  // 19) 研究终点
  endpoints: {
    researchObjective: string;
    outcomeMeasures: string;
  };

  // 20) 统计分析
  statisticalAnalysis: string;

  // 从 clinicaltrials.gov 获取的会话数据
  clinicalTrialsData?: {
    nctId: string;
    studyJson: Record<string, unknown>;
  };
}

export interface WritingWizardSession {
  id: string;
  guideData: WritingGuideData;
  outlineMarkdown: string;
  currentStep: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
}
