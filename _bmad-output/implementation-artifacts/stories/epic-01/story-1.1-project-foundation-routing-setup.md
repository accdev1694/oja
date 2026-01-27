### Story 1.1: Project Foundation & Routing Setup

As a **developer**,
I want **a fully configured Expo project with TypeScript and file-based routing**,
So that **I have a solid foundation to build the app with type safety and modern navigation**.

**Acceptance Criteria:**

**Given** I have Node.js and npm installed
**When** I run `npx expo start`
**Then** the Expo development server starts successfully
**And** TypeScript compilation works without errors
**And** The file-based routing structure is in place (app/ directory)
**And** Path aliases (@/) work correctly
**And** All required dependencies are installed (Expo 55+, React Native Reanimated, etc.)

**Given** the app launches
**When** I navigate between screens
**Then** Expo Router handles navigation correctly
**And** TypeScript provides intellisense for all imports

**Technical Requirements:**
- Expo SDK 55+ with TypeScript strict mode
- `app/` directory structure for Expo Router
- Babel configured with Reanimated plugin
- Path aliases configured in tsconfig.json
- React Native Reanimated 3+ installed and configured

---

