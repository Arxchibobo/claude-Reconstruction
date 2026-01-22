import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hello, type HelloInput } from "../lib/hello.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const input: HelloInput = {
    name: req.query.name as string | undefined,
    locale: req.query.locale as string | undefined,
  };

  const result = hello(input);
  return res.json(result);
}
