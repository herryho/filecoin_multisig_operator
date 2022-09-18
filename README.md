# 如何使用：

## 说明：使用前，先配置好项目根目录下的.env 文件。

1. ### 创建多签账户。创建后的文件会存在本项目根目录下的 accounts.json 文件里。
   【命令】： yarn create-multi-account
2. ### 创建并发出转账多签。第一个参数为转给谁，第二个参数为转多少钱。多签信息会存在 multisig.json 文件里。
   【命令】：yarn init-multi-transfer f2kemhdxzy6lc2zt2c7gzr6h5d3mlurcbllabcd 200000
3. ### 对别人已创建好的转账多签进行签名并广播。第一个参数为转给谁，第二个参数为转多少钱，第三个参数为创建多签的创建地址。
   【命令】：yarn approve-multi-transfer f2kemhdxzy6lc2zt2c7gzr6h5d3mlurcbllabcd 200000 f1aaaaaaaaaaaaaaaaa
4. ### 取消正在签名中的多签消息。第一个参数为转给谁，第二个参数为转多少钱，第三个参数为创建多签的创建地址。
   【命令】：yarn cancel-multi-transfer f2kemhdxzy6lc2zt2c7gzr6h5d3mlurcbllabcd 200000 f1aaaaaaaaaaaaaaaaa
