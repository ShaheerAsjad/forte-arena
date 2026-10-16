import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ResultsRepository } from "@/features/results/repositories/results.repository";
import { formatEventDate } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import {
  Trophy,
  ArrowLeft,
  Download,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface CertificatePageProps {
  params: Promise<{
    slug: string;
    resultId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CertificatePageProps): Promise<Metadata> {
  const { slug, resultId } = await params;
  const cert = await ResultsRepository.getCertificateData(slug, resultId);

  if (!cert) {
    return {
      title: "Certificate Not Found | Forte Arena",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `Certificate of Achievement: ${cert.participantName} - ${cert.event.title} | Forte Arena`;
  const description = `Official certificate of achievement awarded to ${cert.participantName} for ${cert.award || `Position #${cert.position}`} in ${cert.event.title}.`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

async function CertificatePageContent({
  params,
}: CertificatePageProps) {
  const { slug, resultId } = await params;
  const cert = await ResultsRepository.getCertificateData(slug, resultId);

  if (!cert) {
    notFound();
  }

  const downloadUrl = `/results/${slug}/certificate/${resultId}/download`;

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/results/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-mist hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Event Results</span>
        </Link>
        <span className="text-xs text-mist font-medium flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Academic Record</span>
        </span>
      </div>

      {/* Header and Details */}
      <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-ivory border border-navy-800 shadow-xl space-y-4 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/20 text-gold-400 text-xs font-bold border border-gold-400/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>Official Certificate of Achievement</span>
        </div>

        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-ivory max-w-2xl mx-auto leading-tight">
          {cert.participantName}
        </h1>

        <p className="text-sm sm:text-base text-ivory/80 max-w-xl mx-auto leading-relaxed">
          Awarded for securing{" "}
          <strong className="text-gold-300 font-extrabold">
            Position #{cert.position}
            {cert.award ? ` (${cert.award})` : ""}
          </strong>{" "}
          in{" "}
          <strong className="text-white font-semibold">
            {cert.event.title}
          </strong>{" "}
          at Forte Arena on {formatEventDate(cert.event.startsAt)}.
        </p>

        {cert.teamName && (
          <p className="text-xs text-gold-300 font-semibold">
            Representing Team: {cert.teamName}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-white/10 text-xs text-ivory/70">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gold-400" />
            <span>{formatEventDate(cert.event.startsAt)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gold-400" />
            <span>{cert.event.venue}</span>
          </span>
          <span className="bg-navy-800/80 px-2.5 py-0.5 rounded-full border border-navy-700 font-medium">
            {cert.event.category}
          </span>
        </div>
      </div>

      {/* Center Framed Box */}
      <div className="max-w-4xl mx-auto">
        <div className="p-3 sm:p-5 rounded-3xl bg-gradient-to-b from-navy-100/70 to-navy-50/50 border-2 border-gold-400/40 shadow-lg">
          <div className="rounded-2xl border-2 border-dashed border-gold-300/60 bg-white p-4 sm:p-8 flex flex-col items-center justify-center min-h-[380px] shadow-inner text-center">
            {cert.certificateUrl ? (
              /* Image exists: framed display with download button */
              <div className="space-y-6 w-full flex flex-col items-center">
                <div className="relative w-full aspect-[1.414/1] max-w-2xl rounded-xl overflow-hidden border border-navy-200 shadow-md bg-slate-50">
                  <Image
                    src={cert.certificateUrl}
                    alt={`Certificate for ${cert.participantName} - ${cert.event.title}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <a href={downloadUrl}>
                    <Button variant="gold" size="lg" className="font-bold shadow-md">
                      <Download className="w-4 h-4 mr-2" />
                      <span>Download Certificate</span>
                    </Button>
                  </a>
                  <a
                    href={cert.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="font-semibold">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      <span>Open Full Image</span>
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              /* Image missing: friendly themed notice */
              <div className="py-12 px-4 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-inner">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="font-heading text-xl font-bold text-navy-950">
                  Certificate Pending
                </h3>
                <p className="text-sm text-mist leading-relaxed">
                  Your certificate has not been uploaded to the site yet. Please check back later or contact the organizing desk.
                </p>
                <div className="pt-2">
                  <Link href={`/results/${slug}`}>
                    <Button variant="primary" size="sm" className="font-semibold">
                      <ArrowLeft className="w-4 h-4 mr-1.5" />
                      <span>Back to Results</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificateSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-6 w-32 bg-navy-100 rounded-md" />
      <div className="h-56 bg-navy-900 rounded-3xl" />
      <div className="h-96 bg-navy-100 rounded-3xl" />
    </div>
  );
}

export default function CertificatePage({ params }: CertificatePageProps) {
  return (
    <div className="relative space-y-8 pb-20 max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {/* Ambient Backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.18),rgba(0,25,105,0.12),transparent_70%)] blur-3xl" />
      </div>

      <Suspense fallback={<CertificateSkeleton />}>
        <CertificatePageContent params={params} />
      </Suspense>
    </div>
  );
}
