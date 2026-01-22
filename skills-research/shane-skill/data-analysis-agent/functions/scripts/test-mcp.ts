import "dotenv/config";
import { executeSQL } from "../lib/mcp/client";

console.log("Testing MCP client...");
console.log("MCP_SERVER_URL:", process.env.MCP_SERVER_URL);

executeSQL<{ test: number }>("SELECT 1 as test")
  .then((result) => {
    console.log("Success:", result);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
