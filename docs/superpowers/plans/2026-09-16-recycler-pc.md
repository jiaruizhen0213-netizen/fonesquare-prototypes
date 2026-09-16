# 回收商 PC 报价工作台

Goal: 基于文档 P0K6dyjnHoErXYxWmCJcFUYdnGe revision 508 最后模块，新增独立交互原型。
Architecture: 独立页面、样式、纯业务模型、页面交互；本地演示数据与其他端隔离。
Tech stack: 原生 HTML/CSS/JavaScript，Node test，JSDOM，Playwright。
Scope: 不修改已有平台端或回收商移动端，不修改飞书需求文档。仅自营商家可进入。所有接口行为为演示。

1. recycler-pc-core.js：模型有效选项、必填联动、双币参考价、草稿版本、报告确认、报价快照；tests/recycler-pc.test.cjs 验证。
2. recycler-pc.html/css/js：任务筛选、只读证据与报告弹窗、属性对照、即时取价、确认报告3、手动报价和历史记录。异常任务与恢复操作。
3. index.html：仅补充独立 PC 入口。
4. tests/recycler-pc.dom.cjs：权限、任务跳转、联动修改、过期计算、失败取价仍可报价、报告与出价分离；截图检查和 git diff --check。
5. 局部提交、发布 GitHub Pages，核验在线资源与本地一致。
