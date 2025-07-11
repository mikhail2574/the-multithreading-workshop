import fastify from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { isMainThread, parentPort, Worker } from "node:worker_threads";

function startWorker() {
  parentPort.on("message", ({ sharedArrayBuffer, id, type }) => {
    if (message?.type !== "request") {
      return;
    }
    const buffer = Buffer.from(sharedArrayBuffer, 4);

    const bytes = randomBytes(1e9);

    createHash("sha256").update(bytes).digest("hex").copy(buffer);

    const int32Array = new Int32Array(sharedArrayBuffer);
    int32Array[0] = 1;
    Atomics.notify(int32Array, 0);
  });
}

function startServer() {
  const app = fastify({ logger: process.env.VERBOSE === "true" });
  const workers = [];
  let nextWorker = 0;

  for (let i = 0; i < 5; i++) {
    workers.push(new Worker(import.meta.filename));
  }

  app.get("/fast", async () => {
    return { time: Date.now() };
  });

  app.get("/slow", async () => {
    const sharedArrayBuffer = new SharedArrayBuffer(SHA256_BYTE_LENGTH + 4);
    const int32Array = new Int32Array(sharedArrayBuffer);

    const currentWorker = nextWorker++ % workers.length;
    workers[currentWorker].postMessage({ type: "request", sharedArrayBuffer });
    await Atomics.waitAsync(int32Array, 0, 0).value;

    return {
      hash: Buffer.from(sharedArrayBuffer, 4).toString("hex"),
    };
  });

  app.listen({ port: 3000 }, () => {
    console.log(
      `The server is listening at http://127.0.0.1:${
        app.server.address().port
      } ...`
    );
  });
}

if (isMainThread) {
  startServer();
} else {
  startWorker();
}
