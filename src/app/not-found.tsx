import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-white border border-navy-100 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-navy-100 text-navy-900 mx-auto flex items-center justify-center">
          <Compass className="w-8 h-8 text-gold-500" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gold-500">
            404 Error
          </span>
          <h2 className="text-2xl font-bold font-heading text-navy-950">
            Page Not Found
          </h2>
          <p className="text-sm text-mist">
            The event or page you are looking for doesn&apos;t exist or has moved.
          </p>
        </div>
        <Link href="/">
          <Button variant="primary" className="w-full">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
