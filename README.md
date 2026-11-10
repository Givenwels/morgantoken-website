# morgantoken.fun

个人网站源码构建产物 —— 基于 Next.js + React + Tailwind CSS，静态导出部署于 GitHub Pages。

- 线上地址：http://morgantoken.fun/
- 板块：文字成图 / 动效 / Agent / Prompt 工程 / 开源作品集

## Morgan 视频 GSB

`/bench/video/` 提供公开可用的同屏视频 GSB，中文提示词、模型版本、参考图和来源链接可核对。入口在 `/bench/`。视频只引用原站链接，仓库不保存视频副本。

网页评分保存在当前浏览器，支持刷新续评和评分 JSON 导入／导出，不自动同步 GitHub 或汇总全站访客评分。统计按批次计算模型胜负、同好、同差与有效胜率，并按任务汇集备注和证据编号，可导出 Markdown 报告。

“AI 总结资料包”包含固定统计、已保存的人工备注和引用约束，可交给自己的 Agent。模型 API 尚未接入；后续应通过服务端接口持有密钥，按评分快照调用一次并缓存草稿，校验数值和证据引用后由人工确认发布。浏览器页面不放 API Key。

页面从本地视频评测工程的 `scripts/export-video-site.mjs --site-root <此仓库目录>` 导出。只复制页面、公开素材元数据和规则，不复制本机评分文件。出处见 [素材说明](bench/video/ATTRIBUTION.md)。

> 仓库为静态导出产物（含 `_next/`、`index.html` 等）。完整源码工程在本地开发目录，构建后导出至本仓库。
