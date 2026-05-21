# 主体型 Agent 研究与开发规划

yunluostar 正在从 CLI-first agent 研究原型转型为多平台认知型 Agentic Bot 平台。认知核心（长期记忆、自我模型、用户模型、目标系统、反思、记忆巩固）保持不变，并成为 Bot 平台的产品差异化。

**产品方向：** 多平台认知型 Bot 平台，用户通过 WebChat、HTTP webhook、IM 适配器等 Bot 接口与 Agent 交互。CLI 保留为 admin/debug/developer 工具。

详见 `docs/goals/archive/pivot-to-cognitive-bot-platform.md`。

## 核心思想

> 不再把 Agent 设计成 `LLM + Prompt + Tools + RAG` 的任务执行器，而是设计成一个具有持续状态、经历记忆、自我更新和目标管理能力的认知系统。

## 文档目录

1. [00_研究目标与边界.md](./00_研究目标与边界.md)
2. [01_总体架构设计.md](./01_总体架构设计.md)
3. [02_Cognitive_RAG_认知记忆系统.md](./02_Cognitive_RAG_认知记忆系统.md)
4. [03_Working_Memory_工作记忆.md](./03_Working_Memory_工作记忆.md)
5. [04_Self_Model_自我模型.md](./04_Self_Model_自我模型.md)
6. [05_World_Model_世界模型.md](./05_World_Model_世界模型.md)
7. [06_Goal_Motivation_目标与动机系统.md](./06_Goal_Motivation_目标与动机系统.md)
8. [07_Planning_Action_规划与行动系统.md](./07_Planning_Action_规划与行动系统.md)
9. [08_Metacognition_元认知与反思.md](./08_Metacognition_元认知与反思.md)
10. [09_数据模型与数据库设计.md](./09_数据模型与数据库设计.md)
11. [10_技术栈与工程结构.md](./10_技术栈与工程结构.md)
12. [11_分阶段开发路线.md](./11_分阶段开发路线.md)
13. [12_MVP_开发任务清单.md](./12_MVP_开发任务清单.md)
14. [13_实验评估指标.md](./13_实验评估指标.md)
15. [14_安全边界与风险控制.md](./14_安全边界与风险控制.md)
16. [15_后续研究方向.md](./15_后续研究方向.md)

## 推荐阅读顺序

先读 `00 → 01 → 02 → 11 → 12`，快速理解目标、架构和开发路径。

之后再按模块阅读 `03 ~ 08`，最后看数据库、评估和安全设计。
