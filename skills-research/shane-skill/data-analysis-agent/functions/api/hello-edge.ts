// Edge Function 版本 - 更快，全球分布式
export const config = {
  runtime: "edge",
};

export default function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "World";

  return new Response(
    JSON.stringify({
      message: `Hello ${name}!`,
      timestamp: new Date().toISOString(),
      runtime: "edge",
    }),
    {
      headers: { "content-type": "application/json" },
    }
  );
}

