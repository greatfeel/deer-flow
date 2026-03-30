import { type WritingGuideData, type WritingWizardSession } from "./types";

const STORAGE_KEY = "writing-wizard-session";

export const DEFAULT_GUIDE_DATA: WritingGuideData = {
  keywords: [],
  researchTitle: "",
  protocolNumber: "",
  versionNumber: "",
  studyForm: "研究者发起的临床试验（IIT）",
  trialObjective: "",
  drugInfo: {
    trialDrug: "",
    drugPackaging: "",
    manufacturer: "北京荷塘生华医疗科技有限公司",
  },
  subjects: "",
  overallDesign: "单臂、开放、多次给药、剂量递增的临床研究",
  treatmentPlan: "",
  diagnosticCriteria:
    "采用标准来源（如：中国 XX 指南 2023 版 / WHO 标准 / ICD-11）",
  sampleSize:
    `本研究每个剂量组按照"3+3"剂量递增原则，从第1剂量组至第3剂量组依次进行，每个剂量组入组3-6例患者，预估样本量9-18例。`,
  trialDesign: "单臂、开放、单次/多次用药、单中心临床试验设计",
  inclusionCriteria: "",
  exclusionCriteria: "",
  withdrawalCriteria: `1. 研究者决定的退出
受试者退出是指已经入选的受试者在试验过程中出现不宜继续进行试验的情况，研究者决定该病例退出试验。
（1）研究过程中受试者如出现病情加重，为了保护受试者，让该受试者完成安全性检查并退出试验，接受其他有效治疗；
（2）在临床试验中，受试者发生了某些并发症、并发症或特殊生理变化，不适宜继续接受试验者；
（3）使用禁止合用的其他治疗或药物等，影响有效性和安全性判定者；
（4）发生不良事件及严重不良事件，不适宜继续接受试验的受试者。
2. 受试者决定的退出
根据知情同意书的规定，受试者有权中途退出试验，或受试者虽未明确提出退出试验，但不再接受用药及检测而失访，也属于"退出"（或称"脱落"）。应尽可能了解其退出的原因，并加以记录。如：自觉疗效不佳；对某些不良反应感到难以耐受；有时不能继续接受临床研究；经济因素；或未说明原因而失访等。`,
  terminationCriteria: `受试者符合以下任何一项标准的，将提前中止试验：
1. 对研究药物过敏，以及发生严重不良事件需要给予其他医学干预；
2. 出现严重的不良事件，不能继续试验；
3. 试验中因出现其他疾病影响药效观察；
4. 研究者认为继续试验可能会对受试者造成伤害；
因任何其他原因，应研究者的要求中止试验。`,
  withdrawalProcedure:
    "试验期间如果因以上原因中止/退出试验，中止/退出的原因必须记录到原始文件中，同时按照终止访视有关要求进行记录。\n如果因不良事件退出，则需观察至不良事件解决，受试者状态恢复到用药前或基线状态，或者不良事件稳定，或者受试者失访。",
  endpoints: {
    researchObjective: "",
    outcomeMeasures: "",
  },
  statisticalAnalysis: `统计分析方法：安全性分析和疗效分析。
=================================================================================================
1、如有临床前数据需提前提供；
2、研究的主题、关键词、所用药物种类提前提供；
3、有关药物生产、制备、质控所需材料提前提供；
4、企业资质等材料为相对固定板块提前提供；`,
};

function generateId(): string {
  return `ww-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getSession(): WritingWizardSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WritingWizardSession;
  } catch {
    return null;
  }
}

export function saveSession(session: WritingWizardSession): void {
  session.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function createSession(): WritingWizardSession {
  const session: WritingWizardSession = {
    id: generateId(),
    guideData: { ...DEFAULT_GUIDE_DATA, drugInfo: { ...DEFAULT_GUIDE_DATA.drugInfo }, endpoints: { ...DEFAULT_GUIDE_DATA.endpoints } },
    outlineMarkdown: "",
    currentStep: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export function getOrCreateSession(): WritingWizardSession {
  return getSession() ?? createSession();
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
