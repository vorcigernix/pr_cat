"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { IconBrandGithub } from "@tabler/icons-react";

export function GitHubSignInButton({ callbackUrl = "/dashboard" }) {
  return (
    <Button
      className="w-full flex items-center justify-center gap-2"
      onClick={() => signIn("github", { callbackUrl })}
    >
      <IconBrandGithub size={20} />
      Continue with GitHub
    </Button>
  );
} 