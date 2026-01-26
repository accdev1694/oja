// Clerk authentication configuration for Convex
// See: https://docs.convex.dev/auth/clerk

const authConfig = {
  providers: [
    {
      // Clerk JWT issuer domain - set in Convex Dashboard
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
