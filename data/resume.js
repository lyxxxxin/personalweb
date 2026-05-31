// Single source of truth for all resume data

const RESUME = {
  basic: {
    name: '龙雨欣', nameEn: 'Long Yuxin', title: '后端开发工程师',
    experience: '2年', email: 'lyx8210@gmail.com', phone: '18452480832',
    status: '正在寻找后端开发 / AI Agent 相关岗位',
  },
  education: [
    { school: '四川大学', degree: '硕士', major: '计算机技术', period: '2021-2024',
      honors: ['GPA 3.4/4.0', '二等奖学金（前 10%）', '优秀助教'] },
    { school: '江苏大学', degree: '本科', major: '高分子材料与工程', period: '2016-2020',
      honors: ['三等奖学金', '优秀团干部'] },
  ],
  experience: [{
    company: '美团', dept: '搜索推荐技术部', role: '软件开发工程师', period: '2024.08—至今',
    highlights: [
      '主 R 闪购搜索产品需求，独立承担技术方案设计',
      '在兜底容灾、索引优化等方向有实质性贡献',
      '推动兜底降级机制落地，提升大促高压场景下服务可用性',
    ],
    techs: ['Java', 'Elasticsearch', 'Redis', 'Thrift', 'Kafka', '向量检索'],
  }],
  projects: {
    es_vector_search: {
      name: 'ES 向量搜索引擎性能优化',
      overview: '外卖搜索对数千万 POI/SPU 文档进行向量相似度召回，叠加 LBS 限制与业务属性过滤，主导全链路性能优化。',
      highlights: [
        '将 IVF-PQ + Refine 两阶段检索下沉至数据节点串联执行，消除跨节点 RTT，端到端平均延迟从 28ms 降至 18ms（↓36%）',
        '绕过 Lucene 解码路径，通过 mmap 直接定位堆外原始向量，配合 Faiss AVX2 SIMD 加速距离计算；索引构建按地理层级物理排序提升 Cache Line 命中率',
        '实现 CacheTermsQuery 替代原生 terms 查询，分级缓存策略（大 segment 异步预构建位图索引、小 segment HashMap O(1) 寻址），综合查询延迟降低约 50%',
      ],
      metrics: { latency: '28ms → 18ms (↓36%)', queryOpt: '综合查询延迟 ↓50%' },
      techs: ['IVF-PQ', 'Faiss', 'SIMD', 'mmap', 'ES Plugin', 'CacheTermsQuery'],
    },
    suggest_stability: {
      name: '搜索 Suggest 稳定性建设',
      highlights: [
        'Redis 缓存 + FST 离线索引兜底，基于 Lucene 构建，兼顾性能与内存',
        '多级兜底：API 层前置分流，服务层场景化缓存与 FST 离线索引',
        '滑动窗口监控空结果率，分业务动态阈值 + 精准自动降级',
        '覆盖主搜、闪购、医药等全业务场景',
      ],
      metrics: { qps: '2000+ 单机极限 QPS', latency: '平均 3.2ms', tp999: 'TP999 7ms' },
      techs: ['FST', 'Lucene', 'Redis', '多级降级', '滑动窗口'],
    },
    hot_list: {
      name: '闪购热榜建设',
      highlights: [
        '多热源架构，接入 Hyper 多数据源，强化实时热点挖掘',
        '跨数据源聚合融合 + 敏感词过滤 + 商品供给动态拦截',
        'Redis 按城市缓存热度快照，解决热度展示不一致问题',
        '运营实时干预模块，支持灵活调整榜单内容',
      ],
      techs: ['Redis', '多源召回', '排序融合', '实时计算'],
    },
    memory_agent: {
      name: '长期记忆 Agent 状态化记忆管理系统',
      overview: '面向长期交互型 Agent 场景，传统向量检索方案依赖语义相似度，难以区分最新状态与过时偏好。独立设计并实现覆盖结构化状态建模、时间感知召回与完整评测闭环的长期记忆管理系统。',
      highlights: [
        '将非结构化对话记忆转化为"实体-状态值-事件类型"结构化状态轨迹，接入 DeepSeek API 实现自动状态抽取，设计实体归一化与状态修复流程，状态链构造 F1 从 0.817 提升至 0.952',
        '实现时间感知记忆评分机制，在语义相关性之外引入历史状态权重，解决传统方案中过时记忆干扰最新状态召回的问题',
        '构建含 50 场景、230 条记忆、175 个查询的评测集；过时记忆压力测试中时间感知机制 ACC 0.817，相比纯语义检索提升约 52%，相比仅用最新记忆策略提升约 13%',
      ],
      metrics: { f1: '状态链 F1 从 0.817 → 0.952', acc: '压力测试 ACC 0.817', improvement: 'vs 纯语义检索 ↑52%' },
      techs: ['LLM Agent', 'RAG', 'DeepSeek API', '结构化状态建模', '时间感知召回', '评测体系'],
    },
  },
  skills: {
    backend: ['Java', '微服务', 'Thrift/RPC', '多线程', 'JVM', 'Spring Boot'],
    storage: ['Redis（持久化、高可用）', 'MySQL（InnoDB、索引、事务）', 'Kafka'],
    search: ['Elasticsearch', '向量检索', 'IVF/IVF-PQ', 'Lucene/FST', '离线索引构建'],
    ai: ['Python', 'PyTorch', 'LLM / Tool Use', 'Agent 架构', 'RAG / 向量召回', '记忆系统设计', 'DeepSeek API'],
  },
};

// ── Chunks for RAG ──────────────────────────────────────────
// Each chunk has an id, category tags, and text for search
const CHUNKS = [
  {
    id: 'work_overview',
    tags: ['工作', '美团', '经历', '搜索推荐', '职责'],
    text: '龙雨欣目前在美团搜索推荐技术部担任软件开发工程师（2024年8月至今），主R闪购搜索产品需求，' +
          '深入理解业务场景与用户诉求，保质保量完成需求迭代。对搜索离线及在线链路有系统性理解，' +
          '能独立承担技术方案设计。积极参与组内技术建设，在兜底容灾、索引优化等方向有实质性贡献。' +
          '主动关注线上告警，推动兜底降级机制落地，提升大促高压场景下的服务可用性。',
  },
  {
    id: 'proj_es_vector',
    tags: ['向量', 'ES', 'Elasticsearch', 'IVF-PQ', 'Faiss', 'SIMD', 'mmap', '性能', '优化', '延迟', '检索', 'CacheTermsQuery'],
    text: 'ES向量搜索引擎性能优化项目：外卖搜索对数千万POI/SPU文档进行向量相似度召回，叠加LBS限制与业务属性过滤，' +
          '主导全链路性能优化。将IVF-PQ+Refine两阶段检索下沉至数据节点串联执行，消除跨节点RTT，' +
          '端到端平均延迟从28ms降至18ms（降幅36%）。绕过Lucene解码路径，通过mmap直接定位堆外原始向量，' +
          '配合Faiss AVX2 SIMD加速距离计算；索引构建阶段按地理层级物理排序提升Cache Line命中率。' +
          '实现CacheTermsQuery替代原生terms查询，分级缓存策略（大segment异步预构建位图索引、小segment HashMap O(1)寻址），' +
          '综合查询延迟降低约50%。',
  },
  {
    id: 'proj_suggest',
    tags: ['Suggest', '兜底', 'FST', 'Lucene', 'Redis', '稳定性', 'QPS', '延迟', '性能指标', '降级'],
    text: '搜索Suggest稳定性建设项目：从零搭建全场景兜底保障体系，确定Redis缓存+FST离线索引兜底方案，' +
          '基于Lucene框架实现索引构建，兼顾查询性能与内存占用。' +
          '设计多级兜底方案：API层前置干预分流，服务层场景化兜底缓存与多维度检索FST离线索引，支持索引热更新、缓存智能写入。' +
          '基于滑动窗口监控空结果率，实现分业务动态阈值配置与精准自动降级。' +
          '项目收益：兜底链路单机极限QPS达2000+，平均耗时3.2ms，TP999仅7ms。覆盖主搜、闪购、医药等全业务场景。',
  },
  {
    id: 'proj_hotlist',
    tags: ['热榜', '闪购', '召回', '排序', '融合', '运营', 'Redis'],
    text: '闪购热榜建设项目：负责热榜搜索链路整体方案设计与落地，将原有单一词库召回迭代为多热源架构，' +
          '接入Hyper多数据源强化实时热点挖掘；实现同数据源内部打分排序、跨数据源聚合融合，' +
          '叠加敏感词过滤与商品供给动态拦截；通过Redis按城市维度缓存热度快照保障热度值展示一致性；' +
          '在流量调控后台新增热榜干预模块，支持运营实时调整榜单内容与上下线管控。',
  },
  {
    id: 'skills_backend',
    tags: ['技能', 'Java', 'JVM', '多线程', '微服务', 'RPC', 'Spring'],
    text: '后端开发技能：熟悉Java基础、多线程与JVM基本原理；熟悉微服务架构，熟练使用Thrift等RPC协议；熟悉Spring Boot框架。',
  },
  {
    id: 'skills_storage',
    tags: ['技能', 'Redis', 'MySQL', 'Kafka', '存储', '中间件', '消息队列'],
    text: '存储与中间件技能：熟练使用MySQL（InnoDB、索引优化、事务机制）、Redis（持久化、高可用架构）、Kafka消息中间件。',
  },
  {
    id: 'skills_search',
    tags: ['技能', '搜索', 'Elasticsearch', '向量检索', 'Lucene', 'FST', '索引'],
    text: '搜索领域技能：熟悉搜索业务架构及离线索引构建全流程，具备检索系统相关实践经验，' +
          '熟悉Elasticsearch、向量检索（IVF/IVF-PQ）、Lucene/FST等技术。',
  },
  {
    id: 'skills_ai',
    tags: ['技能', 'AI', 'Python', 'PyTorch', 'LLM', 'Agent', 'RAG', '记忆系统', 'DeepSeek', '机器学习'],
    text: 'AI Agent技能：熟悉Python、PyTorch框架；具备LLM工具调用（Tool Use）、Agent架构设计实战经验；' +
          '熟悉RAG（检索增强生成）与向量召回方案；设计并实现了结构化记忆管理系统；接入DeepSeek API完成自动状态抽取。',
  },
  {
    id: 'proj_memory_agent',
    tags: ['记忆', 'Agent', 'LLM', 'RAG', 'DeepSeek', '状态', '时间感知', '评测', 'F1', 'ACC'],
    text: '长期记忆Agent状态化记忆管理系统：面向长期交互型Agent场景，传统向量检索难以区分最新状态与过时偏好。' +
          '独立设计并实现覆盖结构化状态建模、时间感知召回与完整评测闭环的记忆管理系统。' +
          '将非结构化对话记忆转化为"实体-状态值-事件类型"结构化状态轨迹，接入DeepSeek API实现自动状态抽取，' +
          '设计实体归一化与状态修复流程，状态链构造F1从0.817提升至0.952。' +
          '实现时间感知记忆评分机制，引入历史状态权重，解决过时记忆干扰最新状态召回的问题。' +
          '构建含50场景、230条记忆、175个查询的评测集；压力测试中时间感知机制ACC达0.817，' +
          '相比纯语义检索提升约52%，相比仅用最新记忆策略提升约13%。',
  },
  {
    id: 'education',
    tags: ['教育', '学历', '大学', '四川大学', 'GPA', '硕士', '本科'],
    text: '教育背景：四川大学计算机技术硕士研究生（2021-2024），GPA 3.4/4.0，二等奖学金（前10%），优秀助教。' +
          '江苏大学高分子材料与工程本科（2016-2020），三等奖学金，优秀共青团干部。',
  },
  {
    id: 'contact',
    tags: ['联系', '邮箱', '电话', '求职', '招聘'],
    text: '联系方式：邮箱 lyx8210@gmail.com，电话 18452480832。目前正在寻找后端开发或AI Agent相关岗位。',
  },
];

module.exports = { RESUME, CHUNKS };
