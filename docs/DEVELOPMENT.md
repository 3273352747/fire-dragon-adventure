# 火龙探险开发与发布说明

[返回项目首页](../README.md)

## 1. 文档范围

本仓库保存可运行的 WebGL 产物与发布层文件。以下 C# 模块对应原 Unity 工程的 `Assets/Main/Scripts/`，用于说明开发设计；本仓库不能直接导入 Unity 后重新编辑关卡。

原工程使用 Unity 2022.3.62f3c1。功能说明依据原工程及网页构建工作副本整理；具体预制体参数以对应发布版本为准。

## 2. 模块职责与调用关系

| 模块 | 职责 |
| --- | --- |
| PlayerController2D | 输入、刚体移动、朝向、动画参数、火球和奔跑特效生成 |
| Fireball2D | 火球方向、速度、存活时间与命中处理 |
| BirdEnemy2D | 范围巡逻、帧动画、接触伤害、死亡与击杀加分 |
| Hazard2D / MovingBallHazard2D | 炸弹、掉落区域及往返球体伤害 |
| LevelManager2D | 生命、分数、检查点、重生、暂停和通关 |
| Checkpoint2D / Goal2D / CollectibleCoin | 将触发事件转换为关卡规则调用 |
| CameraFollow2D | LateUpdate 中的横向平滑跟随 |
| AudioManager2D | 背景音乐、跳跃、金币、受伤、胜利音效及静音 |
| MainMenuController / TextColorCycle | 主菜单操作与标题颜色变化 |

```text
输入 -> PlayerController2D -> Rigidbody2D + Animator
攻击 -> Fireball2D -> BirdEnemy2D.TakeHit -> 加分与死亡反馈
伤害 / 金币 / 旗子 -> LevelManager2D -> UI + 音频 + 流程切换
角色位置 -> CameraFollow2D -> 横向镜头跟随
```

这是一套适合小型 Demo 的组件分工，不是已经完备的商业客户端框架。

## 3. 开发过程中的关键处理

### 动画与控制脚本对齐

先列出待机、跑步、跳跃、攻击和受伤需要的状态与参数，再核对参数名、类型和过渡条件。排查时分开观察刚体位置与 Animator 当前状态：运动未执行查输入和控制逻辑，运动已执行但表现错误则查动画条件。

初始化阶段缓存参数存在性和类型检查结果，降低配置缺失造成的连续报错。接地状态由脚底检测点与地面层掩码提供，不能把碰到墙或特效触发器都当成落地。

### 特效已生成但不可见

按“对象是否存在 -> Sprite是否绑定 -> 世界位置 -> 缩放 -> 渲染层与Order -> 生命周期”排查。为火球和奔跑特效分别设置出生点和偏移，角色翻转时同步发射方向。

网页构建还需要检查资源引用是否被序列化到场景或预制体。仅依赖 Editor 下的 AssetDatabase 查找，不能保证构建后资源仍然存在。

### 伤害与重生

伤害来源传入伤害值，关卡管理器统一修改生命并刷新血条。重生入口设置进行中标记，处理控制锁定、位置恢复和速度清零，防止多次受伤同时启动重生流程。

继续改进时，应分别管理提示协程与重生协程，避免 StopAllCoroutines 误停无关业务。普通受伤的冷却规则也应与重生保护明确区分。

### 火球与重复结算

将发射、飞行、命中、敌人死亡分开处理；敌人死亡标记先于延迟销毁设置。当前出生保护与高速Trigger仍有进一步完善空间，因此贴身攻击和低帧率命中列入回归清单，不把“用了Continuous”当作所有漏碰撞问题都已解决。

## 4. 原工程构建步骤

1. 在 Unity Hub 中使用匹配版本打开完整原工程，安装该版本的 WebGL Build Support。
2. 确认 Console 无编译错误；检查角色、火球、音效及特效的 Inspector 引用。
3. 检查 Build Settings 场景顺序：`Assets/Main/Scenes/MainMenu.unity`，然后 `Assets/Main/Scenes/GameLevel.unity`。
4. 切换 WebGL 平台，输出到独立发布目录，不覆盖原工程目录。
5. 当前仓库的火龙构建为未压缩文件：`.data`、`.framework.js`、`.wasm` 和 `.loader.js`。
6. 通过 HTTP 预览，先验证加载，再验证进入关卡、攻击、扣血、检查点和通关。

本次仓库整理不重新编译游戏，不改动原 Unity 工程，也不修改现有构建二进制文件。

## 5. 更新这个发布仓库

1. 把同一次 Unity 构建生成的四个关联文件作为完整一组更新到 `Build/`，不要混用不同版本。
2. 若文件名变化，修改 `web/build-config.json` 中的 `loaderUrl`、`dataUrl`、`frameworkUrl` 和 `codeUrl`。
3. 保留根目录 `index.html` 与 `.nojekyll`，保持原 GitHub Pages 入口地址。
4. 网页显示名称在 `index.html` 的标题、canvas标签和页脚中修改。配置中的 companyName / productName 保留原构建标识，改动前应评估本地数据兼容性，不能用它替代重编译。
5. 运行 `node tools/check-site.mjs` 和 `node --check web/boot.js`。
6. 运行 `node tools/serve.mjs 8080`，按 [测试清单](TESTING.md) 做浏览器回归。
7. 检查 git diff 后提交并推送；等待 Pages 发布完成，再访问线上根地址复查。README修改本身不需要Unity重编译。

不自动删除旧构建或资源。需要清理时，先核对引用、回滚需求与授权，再逐个确认。

## 6. 页面文件的边界

- `index.html`：DOM结构与页面标题。
- `web/build-config.json`：构建文件位置和Unity运行参数。
- `web/boot.js`：读配置、加载Unity、更新进度和显示失败信息。
- `TemplateData/`：保留Unity导出的样式与图片。
- `tools/`：只用于发布前检查与本地预览，不参与游戏内部逻辑。

不需要前端构建器或 npm 依赖，克隆仓库即可通过本地HTTP服务运行。

## 7. 排查网页加载失败

| 表现 | 优先检查 |
| --- | --- |
| 页面能开，配置失败 | web/build-config.json 是否发布、JSON是否有效 |
| 加载器下载失败 | loaderUrl大小写、文件名及网络请求状态 |
| WASM编译或解压错误 | 构建文件是否成套、MIME、压缩格式与响应头 |
| 资源下载成功但画面异常 | 浏览器Console、内存、Unity资源引用、相机与UI |
| 更新后仍看到旧页面 | Pages发布状态、入口缓存，必要时强制刷新 |
| 没有声音或键盘没反应 | 点击画面获取焦点和音频授权，再检查静音状态 |
