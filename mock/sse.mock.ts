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

    // 定期发送在线人数（模拟）
    const timer = setInterval(() => {
      res.write(
        "event: online-count\ndata: " +
          JSON.stringify({ count: Math.floor(Math.random() * 100) + 1 }) +
          "\n\n"
      );
    }, 30000);

    // 客户端断开时清理
    req.on("close", () => {
      clearInterval(timer);
    });
  },
});
