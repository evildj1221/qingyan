// 环保与双碳行业的分类体系：类别、标签词表、机构（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（解读、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "policy", label: "政策法规", section: "政策与标准", guide: "党中央国务院、部委、省市发布的生态环境与双碳领域法律、行政法规、部门规章、规范性文件、规划、实施方案、征求意见稿，以及官方政策解读。只征求意见尚未发布的也归这里；技术标准（GB、HJ、地方标准、团体标准）的发布修订归“标准规范”。" },
  { key: "standard", label: "标准规范", section: "政策与标准", guide: "国家标准（GB）、生态环境行业标准（HJ）、地方标准（DB）、团体标准（T/）的发布、修订、废止、实施与征求意见公告，以及标准制订计划和立项。识别特征是标准号。标准内容的解读分析归“解读观点”。" },
  { key: "enforcement", label: "执法督察", section: "监管与执法", guide: "生态环境行政处罚通报与决定书、按日连续处罚、查封扣押、限产停产、移送拘留、环境公益诉讼与生态环境损害赔偿，中央和省级生态环境保护督察的进驻反馈问责，执法专项行动与典型案例。企业的环保表彰奖励不归这里。" },
  { key: "green-mfg", label: "绿色制造", section: "绿色与双碳", guide: "工信系统的绿色制造名单（绿色工厂、绿色园区、绿色供应链管理企业）与智能工厂、零碳工厂等评价的公示、名单发布、申报通知和评价指标，能效领跑者与能效标杆。通用双碳政策归“双碳与能源”。" },
  { key: "carbon", label: "双碳与能源", section: "绿色与双碳", guide: "碳达峰碳中和政策、全国碳市场（配额分配、履约、碳价）、CCER、能耗双控与碳排放双控、绿电绿证、ESG 与可持续信息披露、新能源政策（限与双碳、能源转型直接相关的）。具体企业的零碳工厂评价归“绿色制造”。" },
  { key: "ecology", label: "污染防治", section: "环境与应急", guide: "水、大气、土壤与地下水、固废与危废、噪声、新污染物等环境要素的污染防治与治理工程，生态保护修复、生物多样性、环境质量状况与监测数据发布。治理工程项目中标归“行业与市场”。" },
  { key: "emergency", label: "环境应急", section: "环境与应急", guide: "突发环境事件及处置进展、环境应急预案与演练、危化品和尾矿库事故的环境影响、汛期与重大风险源的环境预警。没有发生事故的日常应急管理培训宣传压低处理。" },
  { key: "industry", label: "行业动态", section: "行业与观点", guide: "环保企业与上市公司的经营、融资并购、人事、业绩，环保治理工程项目与中标，技术产品发布，市场数据与行业报告，产业园区动态。事实由企业发布不改变其新闻属性；产品营销和自我表扬会被评分压住。" },
  { key: "insight", label: "解读观点", section: "行业与观点", guide: "律所、咨询机构、行业媒体和研究者在政策、标准、执法事实之上给出的解读、合规建议、趋势判断和深度分析。有作者独立的观点或方法论；纯新闻事实的报道归对应事实类别。", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布：日报报头的“N 项新标准”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "standard", tag: "标准规范", unit: "项新标准" };

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = ["环保", "环境", "生态", "绿色", "双碳", "碳达峰", "碳中和", "碳市场", "污染", "排放", "esg", "ccer", "gb", "hj"];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["policy_release", "standard_release", "enforcement_action", "list_announcement", "incident_report", "industry_event", "data_report", "opinion_analysis"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = [
  "政策法规", "标准规范", "执法督察", "绿色制造", "双碳能源", "污染防治", "生态保护", "环境应急", "行业动态", "解读观点",
  "其他",
] as const;

/** 可选的主题标签。 */
export const TOPIC_TAGS = [
  "碳市场", "碳价", "CCER", "配额与履约", "能耗双控", "绿电绿证", "ESG", "环评", "排污许可", "环保督察", "环保税",
  "新污染物", "水污染治理", "大气治理", "土壤与地下水", "固废危废", "垃圾焚烧", "水务", "危废处置", "生态修复",
  "生物多样性", "环境监测", "环境质量", "绿色工厂", "绿色园区", "绿色供应链", "智能工厂", "零碳工厂", "能效", "循环经济",
  "环境应急", "名单公示", "环保装备",
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆",
] as const;

/** 可选的实体标签（机构、公司）。 */
export const ENTITY_TAGS = [
  "生态环境部", "国家发改委", "工信部", "市场监管总局", "应急管理部", "中国环境监测总站", "上海环交所", "中国环境报",
  "广东省生态环境厅", "湖南省生态环境厅", "湖北省生态环境厅", "江西省生态环境厅", "上海市生态环境局", "浙江省生态环境厅", "福建省生态环境厅",
  "光大环境", "北控水务", "首创环保", "瀚蓝环境", "伟明环保", "三峰环境", "盈峰环境", "龙净环保",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "北京市": "北京", "天津市": "天津", "河北省": "河北", "山西省": "山西", "内蒙古自治区": "内蒙古", "辽宁省": "辽宁", "吉林省": "吉林", "黑龙江省": "黑龙江", "上海市": "上海", "江苏省": "江苏", "浙江省": "浙江", "安徽省": "安徽", "福建省": "福建", "江西省": "江西", "山东省": "山东", "河南省": "河南", "湖北省": "湖北", "湖南省": "湖南", "广东省": "广东", "广西壮族自治区": "广西", "海南省": "海南", "重庆市": "重庆", "四川省": "四川", "贵州省": "贵州", "云南省": "云南", "西藏自治区": "西藏", "陕西省": "陕西", "甘肃省": "甘肃", "青海省": "青海", "宁夏回族自治区": "宁夏", "新疆维吾尔自治区": "新疆",
  "碳交易": "碳市场", "碳排放交易": "碳市场", "全国碳市场": "碳市场", "碳达峰碳中和": "双碳能源",
  "污水处理": "水污染治理", "废水治理": "水污染治理", "废水": "水污染治理", "污水": "水污染治理",
  "废气治理": "大气治理", "vocs": "大气治理", "挥发性有机物": "大气治理", "蓝天保卫战": "大气治理",
  "土壤修复": "土壤与地下水", "土壤污染": "土壤与地下水", "地下水污染防治": "土壤与地下水",
  "危废": "固废危废", "固废处理": "固废危废", "固体废物": "固废危废", "垃圾分类": "固废危废",
  "排污权": "排污许可", "环评审批": "环评", "环境影响评价": "环评",
  "环保检查": "环保督察", "中央环保督察": "环保督察", "中央生态环保督察": "环保督察", "督察": "环保督察",
  "监管": "执法督察", "处罚": "执法督察", "行政处罚": "执法督察", "执法": "执法督察",
  "法规": "政策法规", "政策": "政策法规", "监管政策": "政策法规",
  "标准": "标准规范", "国家标准": "标准规范", "行业标准": "标准规范", "标准发布": "标准规范",
  "绿色制造": "绿色工厂", "零碳园区": "绿色园区", "供应链": "绿色供应链",
  "碳中和": "双碳能源", "碳达峰": "双碳能源", "能源转型": "双碳能源", "新能源": "双碳能源",
  "生态": "生态保护", "生物多样性保护": "生物多样性", "监测": "环境监测", "应急": "环境应急",
  "名单": "名单公示", "公示": "名单公示", "行业": "行业动态", "企业动态": "行业动态", "市场": "行业动态",
  "观点": "解读观点", "解读": "解读观点", "分析": "解读观点", "评论": "解读观点",
};

// ── 机构与主体 ──────────────────────────────────────────────────────────────────────────

/**
 * 主体名录：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；otherNames 是机构自己的其他称呼（官方账号名、下属单位），
 * 把事实的主体对到发布方时也认它们。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; otherNames?: string[] }> = {
  mee: { name: "生态环境部", displayTag: null, aliases: ["生态环境部", "环境保护部", "生态环境部部长"], otherNames: ["生态环境部办公厅", "生态环境部新闻发言人"] },
  ndrc: { name: "国家发改委", displayTag: null, aliases: ["国家发改委", "国家发展改革委", "国家发展和改革委员会"] },
  miit: { name: "工信部", displayTag: null, aliases: ["工信部", "工业和信息化部"], otherNames: ["工信部节能与综合利用司"] },
  samr: { name: "市场监管总局", displayTag: null, aliases: ["市场监管总局", "国家市场监督管理总局", "国家标准委", "国家标准化管理委员会"] },
  mem: { name: "应急管理部", displayTag: null, aliases: ["应急管理部"] },
  cnemc: { name: "中国环境监测总站", displayTag: null, aliases: ["中国环境监测总站"] },
  cneeex: { name: "上海环交所", displayTag: null, aliases: ["上海环交所", "上海环境能源交易所"], otherNames: ["全国碳排放权交易市场"] },
  caepi: { name: "中国环保产业协会", displayTag: null, aliases: ["中国环保产业协会", "中国环境保护产业协会"] },
  cenenw: { name: "中国环境报", displayTag: null, aliases: ["中国环境报", "中国环境网"] },
  "gd-sthjt": { name: "广东省生态环境厅", displayTag: null, aliases: ["广东省生态环境厅", "广东省环境保护厅"] },
  "hun-sthjt": { name: "湖南省生态环境厅", displayTag: null, aliases: ["湖南省生态环境厅", "湖南省环境保护厅"] },
  "hubei-sthjt": { name: "湖北省生态环境厅", displayTag: null, aliases: ["湖北省生态环境厅", "湖北省环境保护厅"] },
  "jx-sthjt": { name: "江西省生态环境厅", displayTag: null, aliases: ["江西省生态环境厅", "江西省环境保护厅"] },
  "sh-sthj": { name: "上海市生态环境局", displayTag: null, aliases: ["上海市生态环境局", "上海市环境保护局"] },
  "zj-sthjt": { name: "浙江省生态环境厅", displayTag: null, aliases: ["浙江省生态环境厅", "浙江省环境保护厅"] },
  "fj-sthjt": { name: "福建省生态环境厅", displayTag: null, aliases: ["福建省生态环境厅", "福建省环境保护厅"] },
  "ceb-env": { name: "光大环境", displayTag: "光大环境", aliases: ["光大环境", "中国光大环境", "光大环保"], otherNames: ["中国光大环境（集团）"] },
  bewg: { name: "北控水务", displayTag: "北控水务", aliases: ["北控水务", "北控水务集团"] },
  "bc-ep": { name: "首创环保", displayTag: "首创环保", aliases: ["首创环保", "首创股份", "北京首创生态环保集团"] },
  hanlan: { name: "瀚蓝环境", displayTag: "瀚蓝环境", aliases: ["瀚蓝环境", "瀚蓝"] },
  weiming: { name: "伟明环保", displayTag: "伟明环保", aliases: ["伟明环保", "浙江伟明环保"] },
  sanfeng: { name: "三峰环境", displayTag: "三峰环境", aliases: ["三峰环境", "重庆三峰环境"] },
  yingfeng: { name: "盈峰环境", displayTag: "盈峰环境", aliases: ["盈峰环境", "盈峰中联"] },
  longking: { name: "龙净环保", displayTag: "龙净环保", aliases: ["龙净环保", "福建龙净环保"] },
};

/**
 * 身份词典：摘要和标题里出现的机构或公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "mee", name: "生态环境部", patterns: [/生态环境部|环境保护部/i] },
  { id: "ndrc", name: "国家发改委", patterns: [/国家发改(委|委)|发展改革委/i] },
  { id: "miit", name: "工信部", patterns: [/工信部|工业和信息化部/i] },
  { id: "samr", name: "市场监管总局", patterns: [/市场监管总局|市场监督管理总局|国家标准委/i] },
  { id: "cneeex", name: "上海环交所", patterns: [/上海环交所|上海环境能源交易所/i] },
  { id: "cnemc", name: "中国环境监测总站", patterns: [/中国环境监测总站/i] },
  { id: "gd-sthjt", name: "广东省生态环境厅", patterns: [/广东省生态环境厅|广东省环境保护厅/i] },
  { id: "hun-sthjt", name: "湖南省生态环境厅", patterns: [/湖南省生态环境厅|湖南省环境保护厅/i] },
  { id: "hubei-sthjt", name: "湖北省生态环境厅", patterns: [/湖北省生态环境厅|湖北省环境保护厅/i] },
  { id: "jx-sthjt", name: "江西省生态环境厅", patterns: [/江西省生态环境厅|江西省环境保护厅/i] },
  { id: "sh-sthj", name: "上海市生态环境局", patterns: [/上海市生态环境局|上海市环境保护局/i] },
  { id: "zj-sthjt", name: "浙江省生态环境厅", patterns: [/浙江省生态环境厅|浙江省环境保护厅/i] },
  { id: "fj-sthjt", name: "福建省生态环境厅", patterns: [/福建省生态环境厅|福建省环境保护厅/i] },
  { id: "ceb-env", name: "光大环境", patterns: [/光大环境|光大环保/i] },
  { id: "bewg", name: "北控水务", patterns: [/北控水务/i] },
  { id: "bc-ep", name: "首创环保", patterns: [/首创环保|首创股份/i] },
  { id: "hanlan", name: "瀚蓝环境", patterns: [/瀚蓝环境|瀚蓝/i] },
  { id: "weiming", name: "伟明环保", patterns: [/伟明环保/i] },
  { id: "sanfeng", name: "三峰环境", patterns: [/三峰环境/i] },
  { id: "yingfeng", name: "盈峰环境", patterns: [/盈峰环境|盈峰中联/i] },
  { id: "longking", name: "龙净环保", patterns: [/龙净环保/i] },
];

/** 这些域名上的文章，发布方就是对应的机构（托管平台不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "mee", domains: ["mee.gov.cn"] },
  { entityId: "gd-sthjt", domains: ["gdee.gd.gov.cn"] },
  { entityId: "hun-sthjt", domains: ["sthjt.hunan.gov.cn"] },
  { entityId: "hubei-sthjt", domains: ["sthjt.hubei.gov.cn"] },
  { entityId: "jx-sthjt", domains: ["sthjt.jiangxi.gov.cn"] },
  { entityId: "sh-sthj", domains: ["sthj.sh.gov.cn"] },
  { entityId: "zj-sthjt", domains: ["sthjt.zj.gov.cn"] },
  { entityId: "fj-sthjt", domains: ["sthjt.fujian.gov.cn"] },
  { entityId: "cnemc", domains: ["cnemc.cn"] },
  { entityId: "cneeex", domains: ["cneeex.com"] },
  { entityId: "caepi", domains: ["caepi.org.cn"] },
  { entityId: "cenenw", domains: ["cenews.com.cn"] },
  { entityId: "ndrc", domains: ["ndrc.gov.cn"] },
  { entityId: "miit", domains: ["miit.gov.cn"] },
];

/** 原文里的这些写法也算提到了对应机构。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
