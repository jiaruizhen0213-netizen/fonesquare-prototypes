# 自营阶梯报价配置原型

Goal: 实现文档 IRIHw6N4KiSiPOkyf8BcXN9cnbJ revision 10 的平台配置与交互演示。
Architecture: 独立 HTML/CSS/JS 和纯规则模型；平台菜单通过独立挂载脚本打开嵌入页，现有业务数据不改动。
Tech: Vanilla JS, Node tests, JSDOM, optional Playwright screenshot.
Scope: 单一真实自营主体，阶段报价可成交；模拟时钟和所有数据仅用于原型评审。

1. quote-config-core.js：配置校验、唯一启用、版本快照、计划执行、成交、失败重试及停止。
2. quote-config.html/css/js：配置列表与明细编辑；最高价授权与各档预览；单点地图、报价动态、卖家接受及进度演示。
3. platform-quote-config.js 与 platform.html：新增菜单及独立 iframe 入口，不修改已有报价、资金和质检模块。
4. tests/quote-config.test.cjs 与 DOM tests：阶梯节点、晚启动、幂等、接受并停止、版本隔离、失败无虚假记录、权限。
5. 校验差异和在线部署资源，返回独立原型链接。
