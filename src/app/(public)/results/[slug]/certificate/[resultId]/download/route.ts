import { prisma } from "@/lib/prisma";
import { buildContentDispositionHeader } from "@/features/results/certificates.utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; resultId: string }> }
) {
  const { slug, resultId } = await params;

  // 1. Fetch result and verify it belongs to event and results are published
  const result = await prisma.result.findUnique({
    where: { id: resultId },
    select: {
      id: true,
      position: true,
      award: true,
      certificateUrl: true,
      customParticipantName: true,
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          resultsPublished: true,
        },
      },
      registration: {
        select: {
          user: { select: { name: true } },
          team: { select: { name: true } },
        },
      },
    },
  });

  if (
    !result ||
    result.event.slug !== slug ||
    !result.event.resultsPublished ||
    !result.certificateUrl
  ) {
    return new Response("Certificate not found or not published", { status: 404 });
  }

  // 2. Validate that the certificate URL host matches the Supabase host configured in env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return new Response("Storage host configuration is missing", { status: 500 });
  }

  let expectedHostname: string;
  try {
    expectedHostname = new URL(supabaseUrl).hostname;
  } catch {
    return new Response("Invalid Supabase storage URL configured", { status: 500 });
  }

  let certHostname: string;
  try {
    certHostname = new URL(result.certificateUrl).hostname;
  } catch {
    return new Response("Invalid certificate storage URL", { status: 400 });
  }

  // Accept only the exact configured Supabase host or .supabase.co subdomains
  if (certHostname !== expectedHostname && !certHostname.endsWith(".supabase.co")) {
    return new Response("Forbidden storage host", { status: 403 });
  }

  // 3. Fetch image server-side
  const upstreamResponse = await fetch(result.certificateUrl);
  if (!upstreamResponse.ok) {
    return new Response("Failed to fetch certificate image from storage", { status: 502 });
  }

  const contentType = upstreamResponse.headers.get("content-type") || "image/png";
  const arrayBuffer = await upstreamResponse.arrayBuffer();

  // 4. Determine clean file name and build safe Content-Disposition
  const participant =
    result.registration?.team?.name ||
    result.registration?.user?.name ||
    result.customParticipantName ||
    "participant";

  let ext = "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    ext = "jpg";
  } else if (contentType.includes("webp")) {
    ext = "webp";
  } else {
    const match = result.certificateUrl.match(/\.(png|jpg|jpeg|webp)(?:\?.*)?$/i);
    if (match?.[1]) {
      ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    }
  }

  const rawFilename = `certificate-${slug}-${participant.trim()}.${ext}`;
  const contentDisposition = buildContentDispositionHeader(rawFilename);

  // 5. Return same-origin attachment response
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Content-Length": arrayBuffer.byteLength.toString(),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
