import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function Logo({
  className,
  showText = true,
  size = "md",
  href = "/",
}: LogoProps) {
  const sizeMap = {
    sm: { container: "w-8 h-8", text: "text-base", img: 32 },
    md: { container: "w-10 h-10", text: "text-xl", img: 40 },
    lg: { container: "w-14 h-14", text: "text-2xl", img: 56 },
  };

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
      {/* Plain container for transparent-background circular brand logo */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center",
          sizeMap[size].container
        )}
      >
        <Image
          src="/brand/forte-logo.png"
          alt={APP_NAME}
          width={120}
          height={120}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {showText && (
        <span
          className={cn(
            "font-extrabold tracking-tight font-heading text-navy-950 group-hover:text-navy-700 transition-colors",
            sizeMap[size].text
          )}
        >
          {APP_NAME}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
