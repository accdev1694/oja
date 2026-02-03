import { clerkSetup } from "@clerk/testing/playwright";
import dotenv from "dotenv";
import path from "path";

// Load e2e env vars
dotenv.config({ path: path.resolve(__dirname, ".env.e2e") });

async function globalSetup() {
  await clerkSetup();
}

export default globalSetup;
