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
    vector_index: {
      name: '向量索引稳定性建设与召回性能优化',
      highlights: [
        '新增 Thrift 协议支持，减少序列化开销',
        '定制 ES 插件将 IVF-PQ+REFINE 下沉服务端，消除跨机房往返损耗',
        '搭建 IVF-PQ 全生命周期保障体系：预热、多维质量校验、异常自动回滚',
        '商品正排数据迁移至 Redis，缓解集群内存竞争',
      ],
      techs: ['IVF-PQ', 'Elasticsearch', 'Thrift', 'Redis', 'ES Plugin'],
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
  },
  skills: {
    backend: ['Java', '微服务', 'Thrift/RPC', '多线程', 'JVM', 'Spring Boot'],
    storage: ['Redis（持久化、高可用）', 'MySQL（InnoDB、索引、事务）', 'Kafka'],
    search: ['Elasticsearch', '向量检索', 'IVF/IVF-PQ', 'Lucene/FST', '离线索引构建'],
    ai: ['Python', 'PyTorch', 'LLM 原理', 'Agent 范式'],
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
    id: 'proj_vector',
    tags: ['向量', '索引', 'IVF', 'IVF-PQ', 'Thrift', 'ES', 'Elasticsearch', '性能', '优化', '召回'],
    text: '向量索引稳定性建设与召回性能优化项目：新增Thrift协议调用支持减少序列化开销；' +
          '定制ES服务端插件将IVF-PQ+REFINE两阶段检索逻辑下沉服务端执行，消除跨机房重复网络往返与序列化损耗；' +
          '搭建IVF-PQ向量索引全生命周期保障体系，落地索引预热、多维质量校验、异常自动回滚能力；' +
          '商品正排数据迁移至Redis，统一收拢业务过滤排序逻辑，缓解集群内存资源竞争。',
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
    tags: ['技能', 'AI', 'Python', 'PyTorch', 'LLM', 'Agent', '机器学习'],
    text: 'AI技术：熟悉Python、PyTorch框架，了解LLM与Agent基本技术原理和常见范式。',
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
