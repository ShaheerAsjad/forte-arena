"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition",
        className
      )}
    >
      Sign Out
    </button>
  );
}
