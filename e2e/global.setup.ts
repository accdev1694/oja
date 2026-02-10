// Note: @clerk/testing/playwright is not currently installed
// import { clerkSetup } from "@clerk/testing/playwright";
import dotenv from "dotenv";
import path from "path";

// Load e2e env vars
dotenv.config({ path: path.resolve(__dirname, ".env.e2e") });

async function globalSetup() {
  // Clerk testing setup is disabled - package not installed
  // await clerkSetup();
}

export default globalSetup;
