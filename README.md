# 教务课表同步助手（Chrome 扩展）README

## 1. 项目简介

本扩展运行于：

```
https://jwxt.szpu.edu.cn/jwapp/*
```

主要功能：

* 在教务系统页面注入悬浮按钮
* 通过已登录状态调用课表接口
* 获取课表 JSON 数据
* 本地下载为 `.json` 文件

当前版本定位：

> 一个稳定的“课表接口抓取 + 本地导出”工具，后续可扩展为多接口数据抓取框架。

---

## 2. 技术架构

当前结构采用简单分层设计：

```
UIManager            // 页面 UI（悬浮按钮 + 自定义输入面板 + 日志区）
TimetableService     // 仅负责发起请求
ExportController     // 协调 UI 和 Service
downloadJson()       // 下载工具函数
```

### 2.1 分层职责

| 模块               | 职责             | 是否处理数据 |
| ---------------- | -------------- | ------ |
| UIManager        | 展示按钮 / 面板 / 日志 | 否      |
| TimetableService | 向教务系统发请求       | 否      |
| ExportController | 组织流程 + 下载      | 是      |
| downloadJson     | 生成 Blob 并下载    | 是      |

当前设计特点：

* UI 与业务逻辑分离
* Service 不解析响应体
* Controller 决定如何处理返回数据
* 使用 `credentials: "include"` 保证携带登录 Cookie

---

## 3. 当前实现流程

执行逻辑如下：

```
用户点击悬浮按钮
    ↓
打开自定义输入面板
    ↓
填写 XNXQDM 与 学号
    ↓
发送 POST 请求到：
/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do
    ↓
检查响应类型
    ↓
若为 JSON → 下载为文件
    ↓
若为 HTML → 判断为未登录或异常
```

---

## 4. 接口说明

### 请求地址

```
POST
https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do
```

### 请求方式

```
Content-Type: application/x-www-form-urlencoded
```

### 请求体

```json
requestParamStr = {
  "*order": "+SKXQ,+KSJC,+JSJC",
  "XNXQDM": "2024-2025-1",
  "XH": "你的学号"
}
```

---

## 5. 关键实现细节

### 5.1 为什么必须使用：

```js
credentials: "include"
```

原因：

* 扩展 content script 的 fetch 并不等同于页面内 fetch
* `same-origin` 在扩展环境下通常不会自动带 JSESSIONID
* 不带 Cookie 会返回登录页 HTML

---

### 5.2 如何判断登录失效

通过：

```js
resp.headers.get("content-type")
```

如果返回：

```
text/html
```

通常说明：

* 未登录
* Session 过期
* 被重定向到登录页

---

### 5.3 下载实现方式

```js
Blob + URL.createObjectURL + a.click()
```

注意：

* 下载完成后延迟 revokeObjectURL
* 避免某些浏览器出现空文件问题

---

## 6. 当前版本能力范围

✔ 可抓取当前学期或指定学期课表
✔ 自动携带登录状态
✔ 可导出 JSON
✔ 有基础错误日志展示
✔ 可扩展

不支持：

* 自动识别所有接口
* 批量抓取多个学期
* 数据结构标准化
* 自动同步到后端
* 并发控制

---

## 7. 目录建议（当前为单文件结构）

```
content.js
```

建议未来结构：

```
/services
  timetableService.js
  scoreService.js
/core
  jwxtClient.js
/export
  jsonExporter.js
  csvExporter.js
/ui
  uiManager.js
content.js
```

---

## 8. 扩展方向建议

未来可扩展模块：

* 成绩导出
* 考试安排导出
* 培养方案抓取
* 空教室查询
* 课表导出为 ICS
* 批量学期导出
* 自动同步至后端

建议未来引入：

* 统一 JwxtClient（封装登录检测）
* 请求队列控制
* 标准化数据模型
* Exporter 抽象层

---

## 9. 使用方法

1. 登录教务系统
2. 打开任意 `/jwapp/` 页面
3. 点击右下角“导出课表”
4. 填写学期与学号
5. 下载 JSON 文件

---

## 10. 安全说明

* 本扩展仅在教务系统域名下运行
* 不主动上传任何数据
* 所有数据下载至本地
* 若未来启用后端同步，应妥善保护 Token

---

## 11. 已知风险

* 教务系统接口结构变动会导致失败
* Session 过期时需要重新登录
* 学校可能存在请求频率限制
* 不同教务版本 DOM 结构可能不同

---

## 12. 当前版本状态

稳定度：★★★☆☆
可拓展性：★★★★☆
架构清晰度：★★★☆☆
