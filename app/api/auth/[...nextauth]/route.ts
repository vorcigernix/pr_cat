
import { handlers } from "@/auth"

export const { GET, POST } = handlers

// Ensure this route doesn't execute in Edge Runtime
export const runtime = 'nodejs';
