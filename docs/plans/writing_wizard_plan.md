# 开发目标
我们需要实现一个导引式的智能写作过程，帮助用户编写《临床研究方案》，整个过程分成三个阶段:
（1）填写方案编写指导的页面，通过填写表单信息，生成一个方案编写指导的 markdown 文件，填写完成之后点击完成按钮进入下一阶段
（2）编制方案目录的页面，进入 AiEditor 页面，自动填入我们已经有的一个目录模板，用户根据需要进行修改，填写完成之后点击完成按钮进入下一阶段
（3）方案生成页面，进入一个类似 /workspace/chats/new 的页面，但不需要欢迎词，有预置的内容，提交之后开始生成最终的报告，类似普通 Agent 聊天一样。

# 页面的具体功能描述
## 填写方案编写指导的页面的界面及交互功能设计
### 表单上方标题：填写方案编写指导
### 表单各项，分成以下区块，做好分割
1）研究关键词：输入组件为可多行编辑的长文本框，类似标签的编辑，
- 输入框开始单行显示，随着内容增多，可以多行显示
- 光标放入文本框后显示已有的关键词列表，
- 每输入一个字，根据已输入的关键词内容对于关键词列表进行模糊匹配筛选过滤，可以选择列表中的关键词，则一个关键词输入完成，进行高亮显示并旁边有个删除的 x 按钮
- 如果继续输入文字，回车之后则完成一个关键词输入，进行高亮显示并旁边有个删除的 x 按钮
- 如果前面已经输入相同的关键词，则回车无效，输入的文字不作为关键词保存
- 可以继续输入其他关键词，依照上面的规则即可
- 关键词需在一行完整显示，如果在一行中无法完整显示，则排到下一行进行显示

2）研究题目：
- 研究题目，后面是一个按钮“生成“，下面是输入组件为可多行编辑的长文本框
- 输入框开始单行显示，随着内容增多，可以多行显示
- 可以自己输入题目
- 也可以点击生成按钮，根据提供的关键词进行制订，依照行业惯例和规范给出题目
- 注意直接使用大模型，流式输出题目，不要利用 Agent
- 用大模型生成题目时首先清空已经输入的文字

3）方案编号
- 单行文本框，手动填写

4）版本号
- 单行文本框，手动填写，检测版本号，应该遵循版本号的一般规则

5）研究形式
- 单行文本框，默认文字为研究者发起的临床试验（IIT），可以手动修改

6）试验目的
- 同前面类似的输入组件为可多行编辑的长文本框，当前面的题目点击按钮生成后，马上根据题目通过调用大模型自动生成
- 例子为：评价自体NK细胞治疗MRD阳性急性髓系白血病的安全性及初步有效性评价
- 注意直接使用大模型，流式输出题目，不要利用 Agent
- 也可以手动输入

7）研究药物，分三个部分
- 试验用药: 手动输入
- 试验用药包装: 手动输入
- 生产企业：默认为北京荷塘生华医疗科技有限公司，也可以手动修改

8）受试者
- 同前面类似的输入组件为可多行编辑的长文本框，当前面的题目点击按钮生成后，马上根据题目通过调用大模型自动生成符合研究主题的受试者人群
- 例子：本研究针对膝骨关节炎患者、本研究针对经PD1/PDL1免疫抑制剂治疗后发生耐药的三阴性乳腺癌（TNBC）患者。

9）总体设计
- 同前面类似的输入组件为可多行编辑的长文本框
- 默认为“单臂、开放、多次给药、剂量递增的临床研究“，可以手动输入

10）治疗方案
- 界面显示
  - “自动生成“按钮
  - 方案内容：可多行编辑的输入框 textarea，直接显示为多行，也可手工输入

- 处理逻辑
如果点击自动生成，进行以下的逻辑进行生成，此时方案内容编辑框为 disable 状态
（1）尝试获取 clinicaltrials 的信息
1）在  https://clinicaltrials.gov 中利用 /docs/plans/ctg-oas-v2.yaml 中的说明，判断上面输入的关键词所属的类别（可以大模型的 API，不要用 Agent），调用clinicaltrials的 API 获得查询结果，得到查询结果第一条的nct_id
2）如nct_id为NCT04678856，则访问 https://clinicaltrials.gov/api/v2/studies/NCT04678856，得到 json，提取其中的 armsInterventionsModule 部分，填入方案内容输入框
3）nct_id 和 访问得到的 json 留在本次会话的数据里面，以供后面使用

（2）如果在 https://clinicaltrials  中没有找到合适的内容，则利用下面的提示词给 Agent 生成治疗方案，填入方案内容输入框
---
由于没有现成的内容，在文献网站和临床信息网站中利用上面输入的关键词查找相关的治疗方案
根据各大网站文献及临床案例报道，整合符合预期的临床案例、给药方案、评价内容及方式信息，形成类似下面范例的汇总并标明出处。
- 文献来源包括：
  - PubMed  https://pubmed.ncbi.nlm.nih.gov/
  - Cochrane Library https://www.cochranelibrary.com/
  - Google Scholar
  - 中国知网

- 临床信息网站包括：
  - https://clinicaltrials.gov/
  - https://www.chictr.org.cn/index.html
  - 中国临床肿瘤学会（CSCO）https://www.csco.org.cn/cn/index.aspx
  - 美国临床肿瘤学会（ASCO）https://www.asco.org/
  - 欧洲肿瘤内科学会（ESMO）https://www.esmo.org/

-- 范例
• 具体剂量递增方案原则：
本研究每个剂量组按照“3+3”剂量递增原则，从第1剂量组至第3剂量组依次进行，每个剂量组入组3-6例患者，样本量可根据试验实际情况进行调整，每个受试者只接受一个相应的剂量。具体剂量递增方案见下表：

• 剂量递增方案操作流程：
    ￮ 预设3个剂量组，剂量分别为1×10(9)个细胞/人/次、2×10(9)个细胞/人/次、3×10(9)个细胞/人/次，进行单次/多次给药的耐受性研究。
    ￮ 每个剂量组首先进行单次给药的安全性、耐受性研究，只接受一个相应的剂量，在受试者完成给药后7天进行安全性检查（包括症状、体格检查、生命体征、12-导联心电图、血常规、尿常规、血生化及凝血功能等）。
    ￮ 研究者将通过第7天安全性特征评价以决定已接受单次给药的受试者是否继续进行多次给药。如未进行多次给药，后续研究将继续以单次给药方式进行。
    ￮ 如安全性评价允许进行多次给药，则按治疗期1、8、15天分别输注一次同剂量自体NK细胞，在治疗期第28天进行骨髓评价，评价安全性及有效性。后续其它剂量组给药间隔同此次给药间隔时间。
    ￮ 三个剂量试验组结束，在安全性评价及有效性评价好的剂量组继续开展第2疗程治疗。后续给药间隔同上述给药间隔时间。

• MTD定义：
1. 新的剂量组开始后第一例受试者采用哨兵法入组，即首例受试者完成首次给药至末次给药7天后观察且无药物相关的DLT事件发生，则可以进行第2例受试者入组和给药；
2. 若某剂量组中的3例受试者在评价窗口期（末次给药后28天内）未观察到剂量限制性毒性（DLT，以NCI-CTCAE 5.0版进行毒性判定），则可以开始下一剂量组的试验；
3. 若某剂量组中有1例受试者出现DLT，则按照“3+3”原则，同一剂量组的需增加3例受试者。若补充的3例受试者未出现DLT，则可递增到下一剂量组；若有1例或以上再出现DLT，不再继续原计划的剂量递增，且前一个剂量组定为MTD。或由研究者决定是否需要在该剂量组与前一个剂量组之间取中间剂量作为新增剂量组进行评价；
4. 如果在同一剂量组2例或以上受试者中出现DLT，则终止爬坡，前一剂量组定为 MTD。
---
（3）自动生成治疗方案的操作为单起的新线程，不影响主线程和其他线程的操作，结束后编辑框为 enable 状态

11）诊断标准
多行输入框，填入默认文字：采用标准来源（如：中国 XX 指南 2023 版 / WHO 标准 / ICD-11）

12）受试者例数
多行输入框，填入默认文字：本研究每个剂量组按照“3+3”剂量递增原则，从第1剂量组至第3剂量组依次进行，每个剂量组入组3-6例患者，预估样本量9-18例。

13）试验设计
多行输入框，填入默认文字：单臂、开放、单次/多次用药、单中心临床试验设计

14）纳入标准
- 界面显示
  - “自动生成“按钮
  - 方案内容：可多行编辑的输入框 textarea，直接显示为多行，也可手工输入

- 处理逻辑
如果点击自动生成，进行以下的逻辑进行生成，此时纳入标准编辑框为 disable 状态
（1）尝试获取 clinicaltrials 的信息
如果之前已有 nct_id 和 访问得到的 json ，从 json 里面读取 eligibilityModule 的如下部分：
a）eligibilityCriteria中节点的Inclusion Criteria部分（从Inclusion Criteria开始直到Exclusion Criteria之前）
b）eligibilityModule的其他节点内容
填入编辑框

（2）如果没有得到数据，则尝试访问 https://www.chictr.org.cn/ 得到数据
a）调用下面的 API 进行查询，title 字段可以用上面的研究题目而进行检索
https://www.chictr.org.cn/searchproj.html?title=%E5%85%B3%E8%8A%82%E7%82%8E&officialname=&subjectid=&regstatus=&regno=&secondaryid=&applier=&studyleader=&createyear=&sponsor=&secsponsor=&sourceofspends=&studyailment=&studyailmentcode=&studytype=&studystage=&studydesign=&recruitmentstatus=&gender=&agreetosign=&measure=&country=&province=&city=&institution=&institutionlevel=&intercode=&ethicalcommitteesanction=&whetherpublic=&minstudyexecutetime=&maxstudyexecutetime=&btngo=btn

b）从检索得到的网页中得到类似这样的链接，进行访问
https://www.chictr.org.cn/showproj.html?proj=289249

c）从上面的网页得到 xml 的下载地址（如下的例子），下载 xml 文件
https://www.chictr.org.cn/bin/chictr/DownloadXml?path=QhimKK79hvgWjqGItfGImv70Xg+EQ/i7iGbcrS4THuh6M90D+SX+oNtGmO4/oJgfcABqztzvTJ95o9ZoeSi2zhT5kCXzWmOFprJv2f5pRHZIlCw5FfFgmATKqGxPniGqLp9Ub31PS3n1CKR4HiJYp260/InXQbibYBdlBH1Rxcc=

d）在xml得到纳入标准，即<criteria>节点的<inclusion_criteria>和除了<exclusion_criteria>的其他节点内容，将其填入编辑框

（3）自动生成治疗方案的操作为单起的新线程，不影响主线程和其他线程的操作，结束后编辑框为 enable 状态

15）排除标准
- 界面显示
  - “自动生成“按钮
  - 方案内容：可多行编辑的输入框 textarea，直接显示为多行，也可手工输入

- 处理逻辑
如果点击自动生成，进行以下的逻辑进行生成，此时排除标准编辑框为 disable 状态
（1）尝试获取 clinicaltrials 的信息
如果之前已有 nct_id 和 访问得到的 json ，从 json 里面读取 eligibilityModule 的eligibilityCriteria中节点的Exclusion Criteria部分（从Exclusion Criteria开始到结束） 填入编辑框

（2）如果没有得到数据，则尝试访问 https://www.chictr.org.cn/ 得到数据
a）调用下面的 API 进行查询，title 字段可以用上面的研究题目而进行检索
https://www.chictr.org.cn/searchproj.html?title=%E5%85%B3%E8%8A%82%E7%82%8E&officialname=&subjectid=&regstatus=&regno=&secondaryid=&applier=&studyleader=&createyear=&sponsor=&secsponsor=&sourceofspends=&studyailment=&studyailmentcode=&studytype=&studystage=&studydesign=&recruitmentstatus=&gender=&agreetosign=&measure=&country=&province=&city=&institution=&institutionlevel=&intercode=&ethicalcommitteesanction=&whetherpublic=&minstudyexecutetime=&maxstudyexecutetime=&btngo=btn

b）从检索得到的网页中得到类似这样的链接，进行访问
https://www.chictr.org.cn/showproj.html?proj=289249

c）从上面的网页得到 xml 的下载地址（如下的例子），下载 xml 文件
https://www.chictr.org.cn/bin/chictr/DownloadXml?path=QhimKK79hvgWjqGItfGImv70Xg+EQ/i7iGbcrS4THuh6M90D+SX+oNtGmO4/oJgfcABqztzvTJ95o9ZoeSi2zhT5kCXzWmOFprJv2f5pRHZIlCw5FfFgmATKqGxPniGqLp9Ub31PS3n1CKR4HiJYp260/InXQbibYBdlBH1Rxcc=

d）在xml得到排除标准，即<criteria>节点的的<exclusion_criteria>的节点内容，将其填入编辑框

（3）自动生成治疗方案的操作为单起的新线程，不影响主线程和其他线程的操作，结束后编辑框为 enable 状态

16）退出标准
多行输入框，填入默认文字：
1. 研究者决定的退出
受试者退出是指已经入选的受试者在试验过程中出现不宜继续进行试验的情况，研究者决定该病例退出试验。
（1）研究过程中受试者如出现病情加重，为了保护受试者，让该受试者完成安全性检查并退出试验，接受其他有效治疗；
（2）在临床试验中，受试者发生了某些并发症、并发症或特殊生理变化，不适宜继续接受试验者；
（3）使用禁止合用的其他治疗或药物等，影响有效性和安全性判定者；
（4）发生不良事件及严重不良事件，不适宜继续接受试验的受试者。
2. 受试者决定的退出
根据知情同意书的规定，受试者有权中途退出试验，或受试者虽未明确提出退出试验，但不再接受用药及检测而失访，也属于“退出”（或称“脱落”）。应尽可能了解其退出的原因，并加以记录。如：自觉疗效不佳；对某些不良反应感到难以耐受；有时不能继续接受临床研究；经济因素；或未说明原因而失访等。

 17）中止标准
多行输入框，填入默认文字：
受试者符合以下任何一项标准的，将提前中止试验：
1. 对研究药物过敏，以及发生严重不良事件需要给予其他医学干预；
2. 出现严重的不良事件，不能继续试验；
3. 试验中因出现其他疾病影响药效观察；
4. 研究者认为继续试验可能会对受试者造成伤害；
因任何其他原因，应研究者的要求中止试验。

18）中止/退出的处理程序
多行输入框，填入默认文字：
试验期间如果因以上原因中止/退出试验，中止/退出的原因必须记录到原始文件中，同时按照终止访视有关要求进行记录。
如果因不良事件退出，则需观察至不良事件解决，受试者状态恢复到用药前或基线状态，或者不良事件稳定，或者受试者失访。

19）研究终点
- 界面显示 ：“自动生成“按钮，下面分为两个部分

（1）研究目的
- 界面，多行输入框，支持填入
- 参考例子
研究目的：本研究为开放标签、单臂、回顾性+前瞻性临床研究，探讨抗血管生成靶向药物与 PD-1抑制剂联合放疗在肝癌合并门静脉癌栓新辅助治疗中的安全性和临床疗效。
- 自动生成逻辑：根据前面得到的研究题目、试验目的、总体设计、试验设计，以及模仿参考例子，自动生成填入编辑框

（2）测试标准
- 界面，多行输入框，支持填入
- 自动生成逻辑：
2.1 尝试获取 clinicaltrials 的信息
如果之前已有 nct_id 和 访问得到的 json ，从 json 里面读取 outcomesModule节点的内容 填入编辑框

2.2 如果没有得到数据，则尝试访问 https://www.chictr.org.cn/ 得到数据
a）调用下面的 API 进行查询，title 字段可以用上面的研究题目而进行检索
https://www.chictr.org.cn/searchproj.html?title=%E5%85%B3%E8%8A%82%E7%82%8E&officialname=&subjectid=&regstatus=&regno=&secondaryid=&applier=&studyleader=&createyear=&sponsor=&secsponsor=&sourceofspends=&studyailment=&studyailmentcode=&studytype=&studystage=&studydesign=&recruitmentstatus=&gender=&agreetosign=&measure=&country=&province=&city=&institution=&institutionlevel=&intercode=&ethicalcommitteesanction=&whetherpublic=&minstudyexecutetime=&maxstudyexecutetime=&btngo=btn

b）从检索得到的网页中得到类似这样的链接，进行访问
https://www.chictr.org.cn/showproj.html?proj=289249

c）从上面的网页得到 xml 的下载地址（如下的例子），下载 xml 文件
https://www.chictr.org.cn/bin/chictr/DownloadXml?path=QhimKK79hvgWjqGItfGImv70Xg+EQ/i7iGbcrS4THuh6M90D+SX+oNtGmO4/oJgfcABqztzvTJ95o9ZoeSi2zhT5kCXzWmOFprJv2f5pRHZIlCw5FfFgmATKqGxPniGqLp9Ub31PS3n1CKR4HiJYp260/InXQbibYBdlBH1Rxcc=

d）从 xml 读取    <primary_outcome> 和 <secondary_outcome> 的内容填入编辑框

（3）自动生成研究终点的操作为单起的新线程，不影响主线程和其他线程的操作，结束后编辑框为 enable 状态

 
20）统计分析
- 多行输入框，填入默认文字：
---
统计分析方法：安全性分析和疗效分析。
=================================================================================================
1、如有临床前数据需提前提供；
2、研究的主题、关键词、所用药物种类提前提供；
3、有关药物生产、制备、质控所需材料提前提供；
4、企业资质等材料为相对固定板块提前提供；
---

### 下方是生成按钮
当上面各块的内容都生成完毕，点击完成，生成 md 文件进入编制方案目录的页面

## 编制方案目录的页面的界面及交互功能设计
- 进入 AiEditor 页面，自动填入我们已经有的一个目录模板，用户根据需要进行修改
- 填写完成之后点击完成按钮进生成 md 文件进入方案生成页面

## 方案生成页面的界面及交互功能设计
进入一个类似 /workspace/chats/new 的页面，但不需要欢迎词，有预置的内容，提交之后开始生成最终的报告，类似普通 Agent 聊天一样。

# 输入组件说明
优先使用成熟的UI 组件框架完成上述的功能

# 持久化设计说明
用 psql 进行存储，设计相关的库表

# 自动生成报告的要求
- 抓取到的文字和生成的指导说明可能是英文，生成的研究报告的最终文字是中文

# 文献的要求
- 必须是万网，pubmed，google scholar 收录的文章，不得自己捏造
- 报告中要有对于文献的索引编号

# 其他说明
- 增加一个左侧导航栏的新入口
- 尽量新增页面和处理程序，不要修改原有的程序