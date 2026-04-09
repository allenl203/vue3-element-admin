import { defineMock } from "./base";

export default defineMock({
  url: "sse/connect",
  method: ["GET"],
  response(req, res) {
    // 设置 SSE 响应头
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // 发送初始连接成功消息
    res.write("event: connected\ndata: {}\n\n");

    // 立即发送一次在线人数，之后每 30 秒更新
    function sendOnlineCount() {
      const count = Math.floor(Math.random() * 100) + 1;
      // useOnlineCount 的 handleOnlineCountMessage 期望直接收到数字
      res.write(`event: online-count\ndata: ${count}\n\n`);
    }

    sendOnlineCount();
    const timer = setInterval(sendOnlineCount, 30000);

    // 客户端断开时清理
    req.on("close", () => {
      clearInterval(timer);
    });
  },
});
