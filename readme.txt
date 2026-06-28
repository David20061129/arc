使用说明

1. 启动服务
- 进入项目目录：
  cd C:\Users\renha\Desktop\arc
  注意最终以arc收尾
- 启动服务：
  node server.js
- 服务启动成功后，在浏览器中访问：
  http://localhost:3000

2. 下载干员头像（首次使用 / 克隆仓库后必做）
- 干员头像不纳入版本库（见 .gitignore），克隆后 public/image 目录为空，页面会显示彩色占位头像。
- 一键下载全部 420 张头像（从 PRTS Wiki，约 17MB）：
    npm run fetch-avatars
  或等价地：
    node scripts/fetch-avatars.js
- 脚本会自动：
  - 按干员名从 media.prts.wiki 抓取对应头像，保存到 public/image/干员名.png；
  - 把 data/operators.json 中每个干员的 image 字段改写为本地路径 /image/干员名.png；
  - 个别抓取失败的干员会删除其 image 字段，由服务器自动生成彩色占位头像。
- 下载完成后会打印统计，例如：完成: 成功 420, 失败 0, 共 16.9 MB。
- 想更新或重新下载时，随时再次运行该命令即可（会覆盖已有文件）。

3. 上传自定义图片
- 将图片文件放入项目目录下的 public 目录中的image目录下，例如：
  public/image/your-image.png
- 在页面中使用图片时，路径应写为：
  /image/your-image.png
- 如果是上传到服务器的静态资源目录，确保文件名没有空格，并且文件后缀正确。

4. 上传干员信息
- 干员数据保存在：
  data/operators.json
- 你可以直接编辑这个文件，添加或修改干员信息。
- 每个干员对象建议包含以下字段：
  - name：干员名称
  - branch：分支
  - subProfession：子职业
  - image：图片路径
- 示例：
  {
    "name": "某干员",
    "branch": "先锋",
    "subProfession": "近卫",
    "image": "/image/your-image.png"
  }

5. 重新加载页面
- 修改图片后刷新浏览器页面即可看到效果。
- 注意：修改 data/operators.json 后需要重启服务（Ctrl + C 后重新 node server.js），因为干员数据在启动时一次性读入内存。

6. 如需停止服务
- 在终端中按 Ctrl + C 即可停止服务。
