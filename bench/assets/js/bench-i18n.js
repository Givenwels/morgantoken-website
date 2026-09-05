(function () {
  const DEFAULT_LANGUAGE = 'zh';

  const zhText = {
    Home: '主页',
    ModelPK: 'ModelPK',
    Tasks: '任务',
    Architecture: '架构',
    Blog: '博客',
    AboutMe: '关于我',
    GitHub: 'GitHub',
    CodeAgentBench: 'Morgan AgentBench',

    'A benchmark for OpenClaw agents': 'OpenClaw agent 评测基准',
    'A benchmark designed to measure how different models perform under OpenClaw when they need to reason, plan, use tools, and stay reliable across repeated runs.': '用于衡量不同模型在 OpenClaw 中进行推理、规划、使用工具，并在重复运行中保持可靠性时的真实表现。',
    Benchmark: '基准',
    Leaderboard: '排行榜',
    'Final Score is the default rank signal. The table below shows the composite score, score quality, efficiency, all six evaluation dimensions, average runtime, total token usage, token breakdown, OpenClaw version, and update time.': 'Final Score 是默认排名信号。下表展示综合分、分数质量、效率、六个评估维度、平均运行时间、总 token 用量、token 拆分、OpenClaw 版本和更新时间。',
    'Final Score is the default rank signal. The table below shows the open dataset by default and adds closed dataset rows where a model has completed the 68-task closed run.': 'Final Score 是默认排名信号。下表默认展示开源数据集，并在模型完成 68 题闭源数据集运行时追加闭源数据集行。',
    Image: '图片',
    'Share on X': '分享到 X',
    'Choose Columns': '选择列',
    'Current sorting will be preserved.': '当前排序会被保留。',
    'Select All': '全选',
    Cancel: '取消',
    Download: '下载',
    Required: '必选',
    'Rendering...': '渲染中...',
    'Browse Tasks →': '浏览任务 →',
    Dataset: '数据集',
    'All Datasets': '全部数据集',
    'Open Dataset': '开源数据集',
    'Closed Dataset': '闭源数据集',
    'Open Dataset 102': '开源数据集 102',
    'Closed Dataset 68': '闭源数据集 68',
    'Open+Closed Models': '同时有开源/闭源',
    'Open Dataset Detail': '开源数据集详情',
    'Closed detail': '闭源详情',
    Model: '模型',
    'Final Score': '最终分',
    'Pass^3': 'Pass^3',
    'Pass@3': 'Pass@3',
    'Avg Score': '平均分',
    Capability: '能力',
    Efficiency: '效率',
    Planning: '规划',
    Safety: '安全',
    'Tool Use': '工具使用',
    Constraints: '约束',
    'Error Recovery': '错误恢复',
    Synthesis: '综合',
    'Avg Runtime': '平均运行时',
    'Total Token': '总 Token',
    Token: 'Token',
    Cost: '成本',
    Price: '价格',
    OpenClaw: 'OpenClaw',
    Released: '发布时间',
    Updated: '更新时间',
    'Notes:': '说明：',
    'USD/CNY quick reference uses approximately': 'USD/CNY 快速换算近似使用',
    and: '和',
    'are billed at': '按',
    'the input-token price.': '倍输入 token 价格计费。',
    'cost_usd = (input_tokens + 0.5 * (cache_read_tokens + cache_write_tokens)) * price_usd_input / 1e6 + output_tokens * price_usd_output / 1e6': 'cost_usd = (input_tokens + 0.5 * (cache_read_tokens + cache_write_tokens)) * price_usd_input / 1e6 + output_tokens * price_usd_output / 1e6',
    'currently use 1M-context list pricing, so their displayed': '当前使用 1M context 标价，因此展示的',
    'is slightly overstated.': '会略高。',
    'Closed dataset detail pages show model-level summaries only; they intentionally omit per-task scores and task-level rows.': '闭源数据集详情页只展示模型级汇总；会刻意省略逐题分数和逐题行。',
    'Closed dataset model profiles intentionally omit per-task scores and task-level rows.': '闭源数据集模型详情会刻意省略逐题分数和逐题行。',
    'pass^3 = weighted_pass_at_k_all': 'pass^3 = weighted_pass_at_k_all',
    ', while': '，',
    'strict_pass_rate = unweighted_pass_at_k_all.': 'strict_pass_rate = unweighted_pass_at_k_all。',
    'Open Final Score = 100 × AvgScore^0.40 × ((Pass^3)^(1/3))^0.45 × (1 - (1 - Pass@3)^(1/3))^0.15': '开源 Final Score = 100 × AvgScore^0.40 × ((Pass^3)^(1/3))^0.45 × (1 - (1 - Pass@3)^(1/3))^0.15',
    'Closed Final Score = 100 × AvgScore^0.40 × ((Pass^3)^(1/3))^0.25 × (1 - (1 - Pass@3)^(1/3))^0.35': '闭源 Final Score = 100 × AvgScore^0.40 × ((Pass^3)^(1/3))^0.25 × (1 - (1 - Pass@3)^(1/3))^0.35',
    Visual: '可视化',
    'View the full leaderboard in chart form. When you switch metrics, the bar ranking below re-sorts by the selected field.': '用图表查看完整排行榜。切换指标后，下方柱状排名会按所选字段重新排序。',
    Metric: '指标',
    View: '视图',
    'Top 10': '前 10',
    'Top 20': '前 20',
    'Top 30': '前 30',
    All: '全部',
    Score: '分数',
    'vs Runtime': 'vs 运行时',
    'Compare model scores against average runtime. The x-axis is Avg Runtime, and the y-axis can be switched across score fields.': '比较模型分数与平均运行时间。x 轴是平均运行时，y 轴可在不同分数字段之间切换。',
    'Score Axis': '分数轴',
    'Avg. Seconds per Task': '每题平均秒数',
    'vs Cost': 'vs 成本',
    'Compare model scores against benchmark cost. The x-axis is Cost, and the y-axis can be switched across score fields.': '比较模型分数与 benchmark 成本。x 轴是成本，y 轴可在不同分数字段之间切换。',
    'Cost (USD)': '成本（USD）',
    'Closed Dataset Model Profile': '闭源数据集模型档案',
    'Closed Final Score': '闭源最终分',
    'Closed Run Summary': '闭源运行汇总',
    'Token and Cost Summary': 'Token 与成本汇总',
    'Benchmark tag': 'Benchmark 标签',
    'Input Tokens': '输入 Token',
    'Output Tokens': '输出 Token',
    'Cache Read Tokens': 'Cache Read Token',
    'Cache Write Tokens': 'Cache Write Token',
    'Input Price': '输入价格',
    'Output Price': '输出价格',

    'Benchmarking OpenClaw-native intelligence': '评测 OpenClaw 原生智能',
    'A benchmark for': '一个用于衡量',
    'how agents actually behave': 'agent 真实行为',
    'inside the OpenClaw runtime.': '的 OpenClaw 运行时 benchmark。',
    'OpenClawBench is designed to measure more than final answers. It evaluates whether a model can choose tools well, plan multi-step work, recover from failure, respect constraints, stay safe, and do all of this with visible efficiency, reliability, and coverage-aware reporting.': 'OpenClawBench 不只衡量最终答案。它评估模型能否正确选择工具、规划多步骤任务、从失败中恢复、遵守约束、保持安全，并通过可见的效率、可靠性和覆盖率感知报告呈现这些行为。',
    'Explore the benchmark': '探索 benchmark',
    'See the scoring logic': '查看评分逻辑',
    'Why this benchmark exists': '为什么需要这个 benchmark',
    'The goal is not to reward models for sounding plausible. The goal is to evaluate operational intelligence in an agent system: can the model act coherently, make progress under tool-mediated execution, and stay robust when the task becomes multi-step, stateful, or failure-prone?': '目标不是奖励看起来合理的回答，而是在 agent 系统中评估操作型智能：模型能否连贯行动，在工具介导的执行中推进任务，并在任务变成多步骤、有状态或容易失败时保持稳健？',
    'core dimensions: tool use, planning, constraints, recovery, synthesis, safety': '核心维度：工具使用、规划、约束、恢复、综合、安全',
    'active scenarios in the current benchmark dataset': '当前 benchmark 数据集中的活跃场景',
    'default ranking profile, keeping the main leaderboard tied to high-signal tasks': '默认排名配置，使主排行榜聚焦高信号任务',
    'What makes it feel rigorous': '严谨性来自哪里',
    'live execution': '真实执行',
    'The benchmark runs through the OpenClaw runtime rather than grading disconnected text responses.': 'benchmark 通过 OpenClaw 运行时执行，而不是给脱离环境的文本回答打分。',
    'deterministic checks': '确定性检查',
    'Scoring is grounded in explicit rules for tools, outputs, files, recovery behavior, clarification, and audit state.': '评分基于工具、输出、文件、恢复行为、澄清和审计状态的明确规则。',
    'process-aware scoring': '过程感知评分',
    'Correctness matters, but so do tool appropriateness, sequence quality, and unnecessary redundancy.': '正确性很重要，工具适配性、步骤顺序质量和不必要冗余同样重要。',
    'coverage-aware reports': '覆盖率感知报告',
    'Results expose what portion of the benchmark was actually covered, so partial runs are not mistaken for full evidence.': '结果会展示实际覆盖了 benchmark 的哪一部分，避免把部分运行误认为完整证据。',
    'Architecture that behaves like a benchmark system, not a static score sheet': '像 benchmark 系统一样工作的架构，而不是静态分数表',
    'OpenClawBench is structured as a full evaluation pipeline: benchmark profiles define what belongs in ranking, scenario metadata defines what each task demands, the runner controls trial execution and workspace setup, and the reporter turns every run into a reusable evidence artifact.': 'OpenClawBench 被构造成完整评估流水线：benchmark profile 定义哪些任务进入排名，scenario metadata 定义每个任务的要求，runner 控制 trial 执行和工作区设置，reporter 将每次运行转化为可复用的证据产物。',
    'End-to-end evaluation flow': '端到端评估流程',
    'Select a benchmark slice': '选择 benchmark 切片',
    'Profiles such as core, intelligence, coverage, full, and native make benchmark scope explicit.': 'core、intelligence、coverage、full 和 native 等 profile 让 benchmark 范围保持明确。',
    'Load scenario definitions': '加载场景定义',
    'Scenario YAMLs carry prompts, tools, checks, difficulty, execution metadata, workspace seeds, and optional custom grading hooks.': 'Scenario YAML 包含 prompt、工具、检查、难度、执行元数据、工作区种子以及可选自定义评分 hook。',
    'Execute controlled trials': '执行受控 trial',
    'The runner creates per-trial workspaces, supports resume flows, and records live execution behavior through the OpenClaw bridge.': 'runner 为每个 trial 创建工作区，支持 resume 流程，并通过 OpenClaw bridge 记录真实执行行为。',
    'Score and report the run': '评分并生成报告',
    'Reports surface capability, overall score, strict pass, latency, cost, tokens, coverage, reliability, and integrity signals.': '报告呈现能力、总体分数、strict pass、延迟、成本、token、覆盖率、可靠性和完整性信号。',
    'Active scenarios': '活跃场景',
    'The public website reflects the active benchmark dataset rather than every experimental task in the repository.': '公开网站展示活跃 benchmark 数据集，而不是仓库中的每个实验性任务。',
    'Core dimensions': '核心维度',
    'Tool use, planning, constraints, recovery, synthesis, and safety remain visible as first-class benchmark axes.': '工具使用、规划、约束、恢复、综合和安全作为一等 benchmark 轴保持可见。',
    Profiles: '配置',
    'Curated slices': '精选切片',
    'core, intelligence, coverage, and native expose different benchmark views without collapsing them into one opaque total.': 'core、intelligence、coverage 和 native 提供不同 benchmark 视角，而不是把它们压成一个不透明总分。',
    Filters: '过滤器',
    'Explicit scope control': '明确的范围控制',
    'Group, status, signal source, difficulty, execution mode, and other filters make the benchmark slice reproducible and legible.': 'group、status、signal source、difficulty、execution mode 等过滤器让 benchmark 切片可复现、可理解。',
    'Scoring that rewards correctness, process quality, and robustness together': '同时奖励正确性、过程质量和稳健性的评分',
    'The benchmark is designed so that a strong model must do more than arrive at a plausible final answer. It must also behave sensibly during execution, avoid unnecessary actions, and preserve safety under realistic task pressure.': '这个 benchmark 的设计要求强模型不只给出看似合理的最终答案，还必须在执行过程中行为合理、避免不必要操作，并在真实任务压力下保持安全。',
    'Scoring stack': '评分栈',
    'Correctness, process quality, efficiency drag, and safety gating': '正确性、过程质量、效率惩罚和安全门控',
    'OpenClawBench scores more than the final answer. Deterministic checks, process scoring, efficiency pressure, and safety gating are composed into the task score, and then aggregated into benchmark-level views.': 'OpenClawBench 不只给最终答案打分。确定性检查、过程评分、效率压力和安全门控会组成任务分数，再聚合到 benchmark 级视图。',
    'Deterministic checks': '确定性检查',
    Correctness: '正确性',
    'Tool calls, outputs, files, recovery signals, clarification behavior, and audit-backed evidence determine whether the task was truly solved.': '工具调用、输出、文件、恢复信号、澄清行为和审计证据共同决定任务是否真正解决。',
    'Process scoring': '过程评分',
    'Process quality': '过程质量',
    'The benchmark looks at tool appropriateness, step ordering, and redundancy, so it can distinguish clean execution from brute-force progress.': 'benchmark 会观察工具适配性、步骤顺序和冗余，因此能区分干净执行与暴力推进。',
    'Efficiency drag': '效率惩罚',
    'Extra steps are penalized. Efficiency is benchmark pressure, not a decorative side metric that can be ignored once the answer is right.': '额外步骤会被惩罚。效率是 benchmark 压力，不是答案正确后就可忽略的装饰性指标。',
    'Safety gate': '安全门控',
    'Unsafe behavior can sharply suppress or zero out a result, which prevents apparently capable but unsafe behavior from looking stronger than it is.': '不安全行为会大幅压低甚至清零结果，避免看似有能力但不安全的行为被高估。',
    Determinism: '确定性',
    '18 supported check types': '支持 18 种检查类型',
    'The scoring engine has a broad rule-based vocabulary for agent behavior, covering tool usage, output validation, file-state checks, recovery signals, clarification behavior, and audit-backed evidence rather than relying on a vague impressionistic grade.': '评分引擎拥有广泛的规则化 agent 行为词表，覆盖工具使用、输出验证、文件状态检查、恢复信号、澄清行为和审计证据，而不是依赖模糊印象分。',
    Reliability: '可靠性',
    'Repeated trials matter': '重复 trial 很重要',
    'Reporting includes strict pass, reliability views, and coverage-aware summary metrics. This helps distinguish genuine capability from one-off success and makes the benchmark less sensitive to lucky runs.': '报告包含 strict pass、可靠性视图和覆盖率感知摘要指标，有助于区分真实能力和偶然成功，降低 lucky run 的影响。',
    Interpretability: '可解释性',
    'The report explains failure modes': '报告解释失败模式',
    'Instead of collapsing everything into one failure bucket, the reporter separates outcomes, execution failures, and integrity review signals. That makes low scores easier to interpret and benchmark maintenance easier to trust.': 'reporter 不会把所有问题压成一个失败桶，而是区分 outcome、execution failure 和 integrity review 信号，让低分更易解释，也让 benchmark 维护更可信。',
    'Dataset design that reflects benchmark intent, not just task accumulation': '体现 benchmark 意图的数据集设计，而不是任务堆积',
    'A benchmark becomes more useful when its task set is legible. OpenClawBench treats benchmark membership as first-class metadata, keeps difficulty explicit, and exposes multiple official slices so users can inspect both count and influence instead of staring at one opaque total.': '当任务集合可理解时，benchmark 才更有用。OpenClawBench 把 benchmark membership 作为一等元数据，明确难度，并提供多个官方切片，让用户能同时查看数量和影响，而不是只盯着一个不透明总分。',
    'Difficulty weighting': '难度加权',
    'Harder tasks matter more': '更难的任务权重更高',
    'Difficulty weights are explicit: easy, medium, hard, and expert scale as 1 / 2 / 4 / 8. This prevents the benchmark from being dominated by easy wins and lets more demanding scenarios carry proportionally more influence.': '难度权重是显式的：easy、medium、hard 和 expert 按 1 / 2 / 4 / 8 缩放。这避免 benchmark 被简单任务主导，也让更高要求的场景拥有更大影响。',
    'Benchmark slices': 'Benchmark 切片',
    'Different questions deserve different views': '不同问题需要不同视图',
    'core asks who is strongest on the main ranking path. intelligence asks about broader capability. coverage tracks regression breadth. native makes OpenClaw-native surfaces visible without forcing them to dominate the main leaderboard prematurely.': 'core 关注主排名路径上谁最强。intelligence 关注更广能力。coverage 跟踪回归广度。native 让 OpenClaw 原生表面可见，而不让它们过早主导主排行榜。',
    'Scenario metadata': '场景元数据',
    'Tasks are benchmark objects, not loose prompts': '任务是 benchmark 对象，不是松散 prompt',
    'Each scenario can declare tools, checks, tags, execution mode, difficulty, pass threshold, workspace material, and custom grading logic. That makes the dataset easier to extend without weakening benchmark semantics.': '每个 scenario 可以声明工具、检查、标签、执行模式、难度、通过阈值、工作区材料和自定义评分逻辑。这让数据集更容易扩展，同时不削弱 benchmark 语义。',
    'Live evidence': '真实执行证据',
    'Per-trial workspaces keep runs observable': '每个 trial 的工作区让运行可观察',
    'The runner creates controlled workspaces and the reporting layer records cost, latency, token usage, and execution metadata. This keeps the dataset tied to observable agent behavior rather than to abstract answer-only evaluation.': 'runner 创建受控工作区，reporting 层记录成本、延迟、token 使用和执行元数据。这让数据集绑定到可观察的 agent 行为，而不是抽象的 answer-only 评估。',
    'Coverage transparency': '覆盖透明度',
    'Partial runs remain interpretable': '部分运行仍然可解释',
    'Reports expose coverage, covered weight, normalized capability, and normalized score on covered slices. That matters because serious benchmarking should show how much evidence exists, not just a headline number.': '报告展示覆盖率、覆盖权重、归一化能力和已覆盖切片上的归一化分数。这很重要，因为严肃 benchmark 应展示证据量，而不只是标题数字。',
    Extensibility: '可扩展性',
    'New tasks can grow without rewriting the harness': '新增任务无需重写 harness',
    'Most benchmark growth happens declaratively through scenario YAML and optional custom checks. This keeps the benchmark flexible while preserving a clear boundary between content, execution, scoring, and reporting.': '大多数 benchmark 增长通过 scenario YAML 和可选 custom check 声明式完成。这让 benchmark 保持灵活，同时保持内容、执行、评分和报告之间的清晰边界。',
    'Why OpenClawBench is a credible way to measure agent intelligence': '为什么 OpenClawBench 是衡量 agent 智能的可信方式',
    'The benchmark does not try to measure every form of intelligence. What it does is operationalize the forms of intelligence that matter in an agent runtime: acting through tools, preserving coherence across steps, adapting under failure, respecting boundaries, and producing inspectable evidence under controlled execution.': '这个 benchmark 不试图衡量所有形式的智能。它将 agent 运行时中重要的智能形式操作化：通过工具行动、跨步骤保持连贯、在失败下适应、遵守边界，并在受控执行中产生可检查证据。',
    'It measures behavior, not just outputs': '它衡量行为，而不只是输出',
    'Tool choices, step order, recovery behavior, and safety outcomes are all part of the observable signal.': '工具选择、步骤顺序、恢复行为和安全结果都是可观察信号的一部分。',
    'It separates ranking from coverage': '它区分排名和覆盖率',
    'The main leaderboard can stay high-signal while broader slices remain available for analysis and regression tracking.': '主排行榜可以保持高信号，同时更广切片仍可用于分析和回归跟踪。',
    'It makes reliability visible': '它让可靠性可见',
    'Repeated-trial views help distinguish stable capability from one-off success or environment luck.': '重复 trial 视图有助于区分稳定能力、偶然成功和环境运气。',
    'It keeps partial evidence honest': '它让部分证据保持诚实',
    'Coverage-aware reporting prevents subset runs from being mistaken for complete benchmark judgments.': '覆盖率感知报告避免把子集运行误认为完整 benchmark 判断。',
    'It keeps benchmark maintenance legible': '它让 benchmark 维护保持清晰',
    'Scenario metadata, custom checks, and structured reporting make the system easier to extend without hiding changes inside vague evaluation logic.': '场景元数据、自定义检查和结构化报告让系统更容易扩展，不会把变更隐藏在模糊的评估逻辑里。',
    'It fits the OpenClaw system itself': '它适配 OpenClaw 系统本身',
    'The benchmark is built around the actual OpenClaw runtime and its native surfaces, so the evaluation target is the system that users care about.': 'benchmark 围绕真实 OpenClaw 运行时及其原生表面构建，因此评估目标就是用户真正关心的系统。',
    'deterministic scoring': '确定性评分',
    'process-aware evaluation': '过程感知评估',
    'safety gating': '安全门控',
    'difficulty weighting': '难度加权',
    'coverage-aware reporting': '覆盖率感知报告',
    'live OpenClaw execution': '真实 OpenClaw 执行',
    'tokens · cost · latency · strict pass': 'token · 成本 · 延迟 · strict pass',

    Task: '任务',
    Browser: '浏览器',
    'Browse the 102 active ClawProBench tasks. Each card shows the original task id, difficulty, dimension, and the actual task prompt preview by default.': '浏览 102 个活跃 ClawProBench 任务。每张卡片默认展示原始任务 ID、难度、维度和真实任务 prompt 预览。',
    'Browse the 102-task open dataset first, followed by the 68-task closed dataset. Each card shows the task id, difficulty, dimension, and prompt preview.': '先展示 102 题开源数据集，再展示 68 题闭源数据集。每张卡片展示任务 ID、难度、维度和 prompt 预览。',
    '← Back to Leaderboard': '← 返回排行榜',
    Dimension: '维度',
    Difficulty: '难度',
    Search: '搜索',
    'Read full task objective': '阅读完整任务目标',
    Constraints: '约束',
    'Error Recovery': '错误恢复',
    Synthesis: '综合',
    easy: '简单',
    medium: '中等',
    hard: '困难',
    expert: '专家',

    'Model to model comparison': '模型对模型对比',
    'Pick two models, click PK, then compare leaderboard metrics, six dimensions, radar shape, and all 102 task-level scores.': '选择两个模型，点击 PK，然后对比排行榜指标、六个维度、雷达图形状和全部 102 个任务级分数。',
    'Pick two models, choose open or closed dataset, then compare leaderboard metrics, six dimensions, and radar shape. The open dataset also supports task-level PK.': '选择两个模型和开源或闭源数据集，然后对比排行榜指标、六个维度和雷达图形状。开源数据集还支持逐题 PK。',
    'Two-model PK': '双模型 PK',
    'Dataset switch': '数据集切换',
    'Radar comparison': '雷达图对比',
    'Per-task breakdown': '逐任务拆解',
    'Closed dataset PK compares model-level scores only; per-task PK is intentionally hidden.': '闭源数据集 PK 只比较模型级分数；逐题 PK 会刻意隐藏。',
    'Choose contenders': '选择对手',
    'Compare Two Models': '对比两个模型',
    Swap: '交换',
    'Top Pair': '榜首组合',
    'Model A': '模型 A',
    'Model B': '模型 B',
    Go: '开始',
    Comparison: '对比',
    'Scores are shown on a 0 to 100 scale.': '分数按 0 到 100 展示。',
    'Task-Level': '任务级',
    Breakdown: '拆解',
    'Each row compares the two models on the same task. Use search and filters to isolate dimensions, hard losses, or close calls.': '每一行对比两个模型在同一任务上的表现。可以用搜索和过滤器定位维度、明显失利或接近结果。',
    Sort: '排序',
    'Only different': '仅看不同',
    'All dimensions': '全部维度',
    'Largest gap': '最大差距',
    'Model A lead': '模型 A 领先',
    'Model B lead': '模型 B 领先',
    'Model A score': '模型 A 分数',
    'Model B score': '模型 B 分数',
    'Scenario ID': '场景 ID',
    ', and': ' 和',
    Final: '最终分',
    'Radar view': '雷达图',
    'Six-Dimension Shape': '六维能力形状',
    'The radar chart highlights where each model is balanced or spiky across planning, safety, tool use, constraints, error recovery, and synthesis.': '雷达图展示每个模型在规划、安全、工具使用、约束、错误恢复和综合能力上的均衡或突出现象。',
    'Dimension radar comparison': '维度雷达图对比',
    Delta: '差值',
    'Delta = A - B': '差值 = A - B',
    Tie: '持平',
    'A leads': 'A 领先',
    'B leads': 'B 领先',
    'PK verdict': 'PK 结论',
    'Final Score is tied': '最终分持平',
    'Task wins A': 'A 任务胜出',
    'Task wins B': 'B 任务胜出',
    'Task ties': '任务持平',
    'A wins': 'A 胜出',
    'B wins': 'B 胜出',
    Ties: '持平',
    Showing: '显示',
    tasks: '个任务',
    strict: '严格',
    soft: '宽松',
    NA: '无',
    'Open detail': '打开详情',
    'No matching models': '没有匹配模型',
    'No matches': '无匹配',
    matches: '个匹配',
    'Selection changed. Click PK to refresh the comparison.': '选择已更改。点击 PK 刷新对比。',
    'Choose two different models to compare.': '请选择两个不同模型进行对比。',

    Bench: '基准',
    'Updates, benchmark notes, result interpretations, and design changes for ClawProBench.': 'ClawProBench 的更新、benchmark 记录、结果解读和设计变更。',
    'AI Blog →': 'AI 博客 →',
    'Safety Under Live Agent Work: What the ClawProBench Leaderboard Shows': '真实 agent 工作下的安全性：ClawProBench 排行榜展示了什么',
    'My Feelings During the Development of ClawProBench': '我开发 ClawProBench 过程中的一些感受',
    'Open-sourcing ClawProBench: Bringing Agent Benchmarks Back to the Real Runtime': '开源 ClawProBench：让 agent benchmark 回到真实运行时',
    Development: '开发',
    'A model-family analysis of safety scores, hard safety failures, and secret-refusal behavior across the current ClawProBench leaderboard.': '对当前 ClawProBench 排行榜中各模型家族安全分、硬安全失败和 secret-refusal 行为的分析。',
    'A bilingual note on why I built ClawProBench, how the harness was shaped through self-iteration, and what I learned from running different models and coding plans.': '一篇双语记录，关于我为什么构建 ClawProBench、harness 如何在自我迭代中成型，以及我从不同模型和 coding plan 运行中学到了什么。',
    'ClawProBench is designed to evaluate model intelligence under OpenClaw across planning, tool use, constraints, recovery, synthesis, and safety.': 'ClawProBench 旨在从规划、工具使用、约束、恢复、综合和安全等维度评估模型在 OpenClaw 下的智能。',

    '← Leaderboard': '← 排行榜',
    'Model Profile': '模型档案',
    'Platform:': '平台：',
    '· Provider key:': '· Provider key：',
    '· Updated:': '· 更新：',
    'Cost Efficiency': '成本效率',
    'Strict pass rate': '严格通过率',
    'Dimension overview': '维度概览',
    'Score stddev': '分数标准差',
    'Trials per task': '每题 trial 数',
    'Tasks passed': '通过任务数',
    'Per-task breakdown': '逐任务拆解',
    Pass: '通过',
    'Avg Tokens': '平均 Token',

    'SWE-Bench-Pro agent results': 'SWE-Bench-Pro agent 结果',
    'A leaderboard for coding agents on SWE-Bench-Pro: 151 tasks, 3 attempts per task, and 453 scoreable attempts in total. Rankings include all completed 453/453 runs and sort by Pass@3 by default.': 'Morgan AgentBench 是面向 coding agent 的 SWE-Bench-Pro 排行榜：共 151 题，每题 3 次尝试，总计 453 次可计分尝试。榜单纳入所有完成 453/453 的运行，并默认按 Final Score 排名。',
    'A leaderboard for coding agents on SWE-Bench-Pro: 151 tasks, 3 attempts per task, and 453 scoreable attempts in total. Rankings include all completed 453/453 runs and sort by Final Score by default.': 'Morgan AgentBench 是面向 coding agent 的 SWE-Bench-Pro 排行榜：共 151 题，每题 3 次尝试，总计 453 次可计分尝试。榜单纳入所有完成 453/453 的运行，并默认按 Final Score 排名。',
    'A leaderboard for coding agents on SWE-Bench-Pro: 151 tasks, 3 attempts per task, and 453 planned scoreable attempts in total. Rankings include completed 453/453 runs and sort by Final Score by default; partial progress rows are shown at the bottom when available.': 'Morgan AgentBench 是面向 coding agent 的 SWE-Bench-Pro 排行榜：共 151 题，每题 3 次尝试，总计 453 次计划可计分尝试。榜单纳入已完成 453/453 的运行，并默认按 Final Score 排名；未完整完成的进度行会在底部单独展示。',
    'Leaderboard Family:': '排行榜系列：',
    CURRENT: '当前',
    'Best Pass@3': '最佳 Final Score',
    'Best Final Score': '最佳 Final Score',
    'Completed Models': '已完成模型',
    'No partial progress rows': '暂无部分进度行',
    '1 partial progress row shown separately': '1 行部分进度单独展示',
    'partial progress rows shown separately': '行部分进度单独展示',
    'Scoreable Attempts': '可计分尝试',
    Exported: '导出时间',
    'All rows have 453 scoreable attempts': '所有行均有 453 次可计分尝试',
    '151 tasks x 3 tries': '151 题 x 3 次尝试',
    'SWEPro 151 zh pass@3': 'SWEPro 151 中文 pass@3',
    'Benchmark Leaderboard': '基准排行榜',
    'Pass@3 is the primary ranking signal. The table also shows Pass^3, per-attempt solve rate, solved tasks, solved attempts, and 453/453 coverage status for each agent/model pair.': 'Final Score 是主要排名信号。它最重视 Pass^3，以体现 agent 的稳定表现；Pass@3 则保留每个模型三次尝试中的极限能力。',
    'Final Score is the primary ranking signal. It weights Pass^3 most strongly for stable agent performance, while Pass@3 keeps each model\'s best-of-three reach visible.': 'Final Score 是主要排名信号。它最重视 Pass^3，以体现 agent 的稳定表现；Pass@3 则保留每个模型三次尝试中的极限能力。',
    Agent: '智能体',
    'All Agents': '全部智能体',
    'Agent / Model': '智能体 / 模型',
    'Agent Version': 'Agent 版本',
    'Final Score': '最终分',
    'Attempt Score': '尝试得分',
    'Solved Tasks': '解出任务',
    'Solved Attempts': '解出尝试',
    Coverage: '覆盖率',
    'Tokens (In / Out)': 'Token（输入 / 输出）',
    'Tokens K (In / Out / Total)': 'Token K（输入 / 输出 / 总量）',
    'Total Tokens': '总 Token',
    In: '输入',
    Out: '输出',
    Total: '总量',
    'Log Archive': '日志归档',
    'Full Tree': '完整目录',
    'Model Dir': '模型目录',
    'where': '其中',
    'and': '和',
    'counts tasks solved at least once across 3 attempts.': '统计 3 次尝试中至少解出 1 次的任务数。',
    'counts tasks solved in all 3 attempts.': '统计 3 次尝试全部解出的任务数。',
    'is solved scoreable attempts divided by 453.': '等于解出的可计分尝试数除以 453。',
    'are summed from exported per-task': '来自逐任务导出的',
    'files when the agent adapter reports usage;': '文件汇总，前提是 agent adapter 导出了 usage；',
    'means usage was not exported.': '表示未导出 usage。',
    "combines each run's exported runtime label with the current local CLI version command when historical reports do not include exact semver.": '结合每次运行导出的 runtime label 和当前本机 CLI version 命令；当历史报告未包含精确 semver 时，用当前可查版本补充。',
    'Rows are included when the exported summary reports 453 completed and 453 scoreable attempts.': '当导出 summary 同时报告 453 次完成和 453 次可计分尝试时，该行会进入榜单。',
    'Completed rows are rankable only when the exported summary reports 453 scoreable attempts; partial rows are shown as progress references at the bottom.': '只有导出 summary 报告 453 次可计分尝试的完成行才参与排名；部分进度行会作为参考展示在底部。',
    'Visual Leaderboard': '可视化排行榜',
    'Switch metrics to compare the same agent/model pairs by reach, consistency, and per-attempt solve rate.': '切换指标后，可以按覆盖能力、一致性和单次尝试解题率比较相同的 agent/model 组合。',
    'Top 8': '前 8',
    'Top 12': '前 12',
    Reach: '覆盖能力',
    'vs Consistency': 'vs 一致性',
    'Reach vs Consistency': '覆盖能力 vs 一致性',
    'Pass@3 shows whether an agent can solve a task at least once; Pass^3 shows whether it solves the same task all three times. The gap is useful when comparing stochastic or retry-sensitive agents.': 'Pass@3 反映 agent 是否至少能解出某题一次；Pass^3 反映它是否三次都能解出同一题。两者的差距适合比较带随机性或对重试敏感的 agent。',
    'SWE-Bench-Pro task list': 'SWE-Bench-Pro 任务列表',
    'Browse the 151 tasks used by CodeAgentBench. Each card shows the repository, base commit, and Chinese task prompt used for the 151-task pass@3 run.': '浏览 Morgan AgentBench 使用的 151 道任务。每张卡片展示 repository、base commit，以及 151 题 pass@3 运行使用的中文任务 prompt。',
    'Back to Leaderboard': '返回排行榜',
    Repository: '仓库',
    'All Repositories': '全部仓库',
    Search: '搜索',
    'Read full task objective': '阅读完整任务目标'
  };

  const zhAttributes = {
    'Share leaderboard on X': '分享到 X',
    'Search by task id or name': '按任务 ID 或名称搜索',
    'Search task id, repository, or prompt': '搜索任务 ID、repository 或 prompt',
    'Search name, provider, rank...': '搜索名称、provider、排名...',
    'scenario, name, difficulty': '场景、名称、难度',
    'ModelPK feature summary': 'ModelPK 功能摘要',
    'OpenClawBench architecture pipeline illustration': 'OpenClawBench 架构流水线示意图',
    'OpenClawBench structured dataset design illustration': 'OpenClawBench 结构化数据集设计示意图',
    'OpenClawBench trust and evidence illustration': 'OpenClawBench 可信证据示意图',
    'Leaderboard family': '排行榜系列',
    'CodeAgentBench summary': 'CodeAgentBench 概览',
    'CodeAgentBench agent filter': 'CodeAgentBench agent 筛选'
  };

  const zhFragments = [
    ['Platform:', '平台：'],
    ['Provider key:', 'Provider key：'],
    ['Updated:', '更新：'],
    [' leads Final Score by ', ' 最终分领先 '],
    [' leads by ', ' 领先 '],
    ['Dimension wins:', '维度胜出：'],
    [', ties ', '，持平 '],
    ['Closed Rank #', '闭源排名 #'],
    ['Rank #', '排名 #'],
    ['release unknown', '发布日期未知'],
    [' · showing top ', ' · 显示前 '],
    [' matches', ' 个匹配'],
    ['Difficulty weights are explicit: easy, medium, hard, and expert scale as ', '难度权重是显式的：easy、medium、hard 和 expert 按 '],
    ['. This prevents the benchmark from being dominated by easy wins and lets more demanding scenarios carry proportionally more influence.', ' 缩放。这避免 benchmark 被简单任务主导，也让更高要求的场景拥有更大影响。'],
    [' asks who is strongest on the main ranking path.', ' 关注主排名路径上谁最强。'],
    [' asks about broader capability.', ' 关注更广能力。'],
    [' tracks regression breadth.', ' 跟踪回归广度。'],
    [' makes OpenClaw-native surfaces visible without forcing them to dominate the main leaderboard prematurely.', ' 让 OpenClaw 原生表面可见，而不让它们过早主导主排行榜。'],
    [' expose different benchmark views without collapsing them into one opaque total.', ' 提供不同 benchmark 视图，而不是把它们压成一个不透明总分。']
  ];

  const zhRichHtml = {
    'Difficulty weights are explicit: easy, medium, hard, and expert scale as 1 / 2 / 4 / 8. This prevents the benchmark from being dominated by easy wins and lets more demanding scenarios carry proportionally more influence.': '难度权重是显式的：easy、medium、hard 和 expert 按 <code>1 / 2 / 4 / 8</code> 缩放。这避免 benchmark 被简单任务主导，也让更高要求的场景拥有更大影响。',
    'core, intelligence, coverage, and native expose different benchmark views without collapsing them into one opaque total.': '<code>core</code>、<code>intelligence</code>、<code>coverage</code> 和 <code>native</code> 提供不同 benchmark 视图，而不是把它们压成一个不透明总分。',
    'core asks who is strongest on the main ranking path. intelligence asks about broader capability. coverage tracks regression breadth. native makes OpenClaw-native surfaces visible without forcing them to dominate the main leaderboard prematurely.': '<code>core</code> 关注主排名路径上谁最强。<code>intelligence</code> 关注更广能力。<code>coverage</code> 跟踪回归广度。<code>native</code> 让 OpenClaw 原生表面可见，而不让它们过早主导主排行榜。',
    'Scenario metadata, custom checks, and structured reporting make the system easier to extend without hiding changes inside vague evaluation logic.': '场景元数据、自定义检查和结构化报告让系统更容易扩展，不会把变更隐藏在模糊的评估逻辑里。',
    'The benchmark is built around the actual OpenClaw runtime and its native surfaces, so the evaluation target is the system that users care about.': 'benchmark 围绕真实 OpenClaw 运行时及其原生表面构建，因此评估目标就是用户真正关心的系统。',
    'Tokens are shown in K and summed across all exported attempts. Input includes cache read/write tokens when exported. OpenCode rows use per-step command.log usage when available; other rows fall back to per-task run_summary.json fields. -- means non-zero usage was not exported.': '<code>Tokens</code> 统一以 K 展示，并按所有导出的尝试求和。输入包含已导出的 cache read/write token。OpenCode 行优先使用逐步 <code>command.log</code> usage；其他行回退到逐任务 <code>run_summary.json</code> 字段。<code>--</code> 表示没有导出非零 usage。',
    'It keeps benchmark maintenance legible': '它让 benchmark 维护保持清晰',
    'It fits the OpenClaw system itself': '它适配 OpenClaw 系统本身',
    'deterministic scoring': '确定性评分',
    'process-aware evaluation': '过程感知评估',
    'safety gating': '安全门控',
    'difficulty weighting': '难度加权',
    'coverage-aware reporting': '覆盖率感知报告',
    'live OpenClaw execution': '真实 OpenClaw 执行',
    'tokens · cost · latency · strict pass': 'token · 成本 · 延迟 · strict pass'
  };

  const textNodeOriginals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const richHtmlOriginals = new WeakMap();
  let currentLanguage = DEFAULT_LANGUAGE;
  let observer = null;

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function readRequestedLanguage() {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') return urlLang;

    return DEFAULT_LANGUAGE;
  }

  function languageUrl(url, language) {
    const next = new URL(url, window.location.href);
    if (language === 'zh') {
      next.searchParams.set('lang', 'zh');
    } else {
      next.searchParams.delete('lang');
    }
    return next;
  }

  function isInternalBenchUrl(url) {
    return url.origin === window.location.origin &&
      (url.pathname === '/bench' ||
        url.pathname.startsWith('/bench/') ||
        url.pathname === '/code-agent-bench' ||
        url.pathname.startsWith('/code-agent-bench/') ||
        url.pathname === '/llm-leaderboard' ||
        url.pathname.startsWith('/llm-leaderboard/') ||
        url.pathname === '/about' ||
        url.pathname.startsWith('/about/'));
  }

  function updateCurrentUrl() {
    if (!window.history || !window.history.replaceState) return;
    const next = languageUrl(window.location.href, currentLanguage);
    const nextPath = next.pathname + next.search + next.hash;
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (nextPath !== currentPath) {
      window.history.replaceState(null, '', nextPath);
    }
  }

  function languageAwarePath(value) {
    let url;
    try {
      url = new URL(value, window.location.href);
    } catch (error) {
      return null;
    }
    if (!isInternalBenchUrl(url)) return null;

    const next = languageUrl(url.href, currentLanguage);
    return next.pathname + next.search + next.hash;
  }

  function updateInternalLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      if (link.target === '_blank') return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const nextPath = languageAwarePath(href);
      if (!nextPath) return;

      link.setAttribute('href', nextPath);
    });

    document.querySelectorAll('[data-href]').forEach(function (element) {
      const href = element.getAttribute('data-href');
      if (!href || href.startsWith('#')) return;

      const nextPath = languageAwarePath(href);
      if (!nextPath) return;

      element.setAttribute('data-href', nextPath);
    });
  }

  function rememberAttribute(element, attributeName, value) {
    let originals = attributeOriginals.get(element);
    if (!originals) {
      originals = {};
      attributeOriginals.set(element, originals);
    }
    if (originals[attributeName] === undefined) {
      originals[attributeName] = value;
    }
    return originals[attributeName];
  }

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return;
    if (parent.closest('script, style, noscript, textarea, [data-i18n-skip]')) return;

    const original = textNodeOriginals.get(node) || node.nodeValue;
    if (!textNodeOriginals.has(node)) {
      textNodeOriginals.set(node, original);
    }

    if (currentLanguage !== 'zh') {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }

    const key = normalize(original);
    if (!key || !zhText[key]) {
      let partial = original;
      zhFragments.forEach(function (pair) {
        partial = partial.split(pair[0]).join(pair[1]);
      });
      if (node.nodeValue !== partial) node.nodeValue = partial;
      return;
    }

    const leading = (original.match(/^\s*/) || [''])[0];
    const trailing = (original.match(/\s*$/) || [''])[0];
    const translated = leading + zhText[key] + trailing;
    if (node.nodeValue !== translated) node.nodeValue = translated;
  }

  function translateAttributes(element) {
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(function (attributeName) {
      if (!element.hasAttribute(attributeName)) return;
      const original = rememberAttribute(element, attributeName, element.getAttribute(attributeName));

      if (currentLanguage !== 'zh') {
        element.setAttribute(attributeName, original);
        return;
      }

      const key = normalize(original);
      element.setAttribute(attributeName, zhAttributes[key] || zhText[key] || original);
    });
  }

  function translateRichElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (!element.matches('p, h3, .ocb-pill, .bench-leaderboard-note > span')) return;
    if (element.closest('script, style, noscript, textarea, [data-i18n-skip]')) return;

    const originalHtml = richHtmlOriginals.get(element);
    if (currentLanguage !== 'zh') {
      if (originalHtml !== undefined) {
        element.innerHTML = originalHtml;
        richHtmlOriginals.delete(element);
      }
      return;
    }

    if (originalHtml !== undefined) return;

    const key = normalize(element.textContent);
    const translatedHtml = zhRichHtml[key];
    if (!translatedHtml) return;

    richHtmlOriginals.set(element, element.innerHTML);
    if (element.innerHTML !== translatedHtml) {
      element.innerHTML = translatedHtml;
    }
  }

  function translateRichTree(root) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      translateRichElement(root);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll('p, h3, .ocb-pill, .bench-leaderboard-note > span').forEach(translateRichElement);
    }
  }

  function translateTree(root) {
    if (!root) return;

    translateRichTree(root);

    if (root.nodeType === Node.ELEMENT_NODE) {
      translateAttributes(root);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches('script, style, noscript, textarea, [data-i18n-skip]')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        translateAttributes(node);
      }
      node = walker.nextNode();
    }
  }

  function updateToggle() {
    const toggle = document.querySelector('[data-bench-language-toggle]');
    if (!toggle) return;
    const isChinese = currentLanguage === 'zh';
    toggle.textContent = isChinese ? 'English' : '中文';
    toggle.setAttribute('aria-label', isChinese ? 'Switch to English' : '切换到中文');
    toggle.setAttribute('aria-pressed', isChinese ? 'true' : 'false');
    toggle.classList.toggle('is-zh', isChinese);
  }

  function applyLanguage(language, options) {
    currentLanguage = language === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.setAttribute('data-bench-lang', currentLanguage);
    translateTree(document.body);
    updateToggle();
    updateCurrentUrl();
    updateInternalLinks();
    document.dispatchEvent(new CustomEvent('clawprobench:languagechange', {
      detail: { language: currentLanguage }
    }));
  }

  function observeMutations() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (mutations) {
      if (currentLanguage !== 'zh') return;
      mutations.forEach(function (mutation) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target);
          return;
        }
        Array.from(mutation.addedNodes).forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            translateTree(node);
          }
        });
      });
      updateInternalLinks();
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  function initLanguageToggle() {
    const toggle = document.querySelector('[data-bench-language-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        applyLanguage(currentLanguage === 'zh' ? 'en' : 'zh');
      });
    }

    applyLanguage(readRequestedLanguage());
    observeMutations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageToggle);
  } else {
    initLanguageToggle();
  }

  window.ClawProBenchI18n = {
    apply: applyLanguage,
    language: function () {
      return currentLanguage;
    },
    url: function (value) {
      return languageAwarePath(value) || value;
    }
  };
})();
