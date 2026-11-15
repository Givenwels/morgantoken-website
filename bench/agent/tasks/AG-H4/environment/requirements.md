# 报表生成需求（初始版 v0）

生成区域销售报表的输出配置 config.json，字段：
- group_by: 汇总维度（当前：week，按周汇总）
- fields: 包含字段（当前：channel 销量 amount）
- sort_by: 排序字段（当前：amount），sort_order: desc
- output_file: 输出文件名（当前：weekly_report.json）
- filters: 过滤条件（当前：无）
- extras: 附加字段（当前：无）
