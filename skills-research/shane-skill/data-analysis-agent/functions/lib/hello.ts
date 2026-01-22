// 核心业务逻辑 - 纯函数，不依赖任何 HTTP 框架

export interface HelloInput {
  name?: string;
  locale?: string;
}

export interface HelloOutput {
  message: string;
  timestamp: string;
  locale: string;
}

export function hello(input: HelloInput): HelloOutput {
  const { name = "World", locale = "en" } = input;

  const greetings: Record<string, string> = {
    en: `Hello ${name}!`,
    zh: `你好 ${name}！`,
    ja: `こんにちは ${name}！`,
  };

  return {
    message: greetings[locale] ?? greetings.en,
    timestamp: new Date().toISOString(),
    locale,
  };
}

// npm run lib lib/hello.ts -- '{"name":"Shane","locale":"zh"}'
if (import.meta.url === `file://${process.argv[1]}`) {
  const input: HelloInput = JSON.parse(process.argv[2] || "{}");
  console.log(hello(input));
}

