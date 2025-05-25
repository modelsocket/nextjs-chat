import { GenChunk, ModelSocket } from "modelsocket";
import { z } from "zod";

const SYSTEM_PROMPT = "You are a helpful assistant.";

// Define Zod schema for a single message
const MessageSchema = z.object({
  role: z.string(),
  text: z.string(),
});

// Define Zod schema for the request body
const ChatRequestBodySchema = z.object({
  params: z.object({
    messages: z.array(MessageSchema),
  }),
});

interface ChatRequestBody {
  params: {
    messages: { role: string; text: string }[];
  };
}

async function validateBody(request: Request): Promise<ChatRequestBody> {
  let bodyJson;

  try {
    bodyJson = await request.json();
  } catch (error) {
    throw new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
    });
  }

  const validationResult = ChatRequestBodySchema.safeParse(bodyJson);

  if (!validationResult.success) {
    throw new Response(
      JSON.stringify({
        error: "invalid request body",
        details: validationResult.error.errors,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return validationResult.data;
}

const LLAMA_8B = "meta/llama3.1-8b-instruct-free";
const LLAMA_70B = "meta/llama3.3-70b-instruct";

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = await validateBody(request);
  } catch (errorResponse: any) {
    return errorResponse;
  }

  const socket = await ModelSocket.connect(
    process.env.MODELSOCKET_URL || "wss://models.mixlayer.ai/ws"
  );
  const llama = await socket.open(LLAMA_8B);

  await llama.append(SYSTEM_PROMPT, { role: "system" });

  for (const message of body.params.messages) {
    await llama.append(message.text, { role: message.role });
  }

  let stream: ReadableStream<GenChunk> = llama
    .gen({ role: "assistant" })
    .stream();

  const sseStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      const encoder = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (value.hidden) {
            continue;
          }

          // Assuming GenChunk has a 'text' property
          const sseFormattedChunk = `data: ${JSON.stringify({
            type: "text",
            text: value.text,
          })}\n\n`;

          controller.enqueue(encoder.encode(sseFormattedChunk));
        }

        const sseEnd = `data: ${JSON.stringify({
          done: true,
        })}\n\n`;

        controller.enqueue(encoder.encode(sseEnd));
      } catch (error) {
        const sseError = `data: ${JSON.stringify({
          type: "error",
          text: `${error}`,
        })}\n\n`;
        controller.enqueue(encoder.encode(sseError));
        controller.error(error);
      } finally {
        reader.releaseLock();
        controller.close();
        socket.close();
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      "X-Accel-Buffering": "no",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
