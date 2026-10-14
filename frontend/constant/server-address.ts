// Set NEXT_PUBLIC_BACKEND_URL in .env.local to point at a local backend,
// e.g. NEXT_PUBLIC_BACKEND_URL=https://localhost:7204
const BackendServer =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "https://ai-recruitment-12dg.onrender.com";

export default BackendServer;
