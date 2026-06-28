使用说明

1. 启动服务
- 进入项目目录：
  cd C:\Users\renha\Desktop\arc
- 启动服务：
  node server.js
- 服务启动成功后，在浏览器中访问：
  http://localhost:3000

2. 上传图片
- 将图片文件放入项目目录下的 public 目录中，例如：
  public/your-image.png
- 在页面中使用图片时，路径应写为：
  /your-image.png
- 如果是上传到服务器的静态资源目录，确保文件名没有空格，并且文件后缀正确。

3. 上传干员信息
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
    "image": "/your-image.png"
  }

4. 重新加载页面
- 修改图片或干员数据后，刷新浏览器页面即可看到效果。

5. 如需停止服务
- 在终端中按 Ctrl + C 即可停止服务。
