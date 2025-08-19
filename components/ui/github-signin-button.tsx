"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { IconBrandGithub, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";

export function GitHubSignInButton({ callbackUrl = "/dashboard" }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("github", { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
    }
    // Note: We don't set loading to false here because the page will redirect
  };

  return (
    <Button
      className="w-full flex items-center justify-center gap-2"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <IconLoader2 size={20} className="animate-spin" />
      ) : (
        <IconBrandGithub size={20} />
      )}
      {isLoading ? "Signing in..." : "Continue with GitHub"}
    </Button>
  );
} 