import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Trophy, Medal, Award, ExternalLink, Users } from "lucide-react";
import type { RankedResultItem } from "@/features/results/repositories/results.repository";

interface ResultsPodiumProps {
  results: RankedResultItem[];
}

export function ResultsPodium({ results }: ResultsPodiumProps) {
  const first = results.find((r) => r.position === 1);
  const second = results.find((r) => r.position === 2);
  const third = results.find((r) => r.position === 3);
  const others = results.filter((r) => r.position > 3);

  return (
    <div className="space-y-12">
      {/* Top 3 Podium */}
      <div className="pt-8 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto items-end">
          {/* 2nd Place (Silver) */}
          <div className="order-2 md:order-1 flex flex-col items-center">
            {second ? (
              <Card className="w-full text-center p-6 bg-gradient-to-b from-slate-50 to-slate-100/80 border-slate-200 shadow-md flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center shadow-inner">
                  <Medal className="w-8 h-8 text-slate-600" />
                </div>
                <div className="space-y-1">
                  <Badge variant="navy" size="sm">2nd Place (Runner-Up)</Badge>
                  <h4 className="font-heading text-lg font-bold text-navy-950 pt-1">
                    {second.winnerName}
                  </h4>
                  {second.teamName && (
                    <p className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {second.teamName}
                    </p>
                  )}
                  {second.department && (
                    <p className="text-xs text-mist">{second.department}</p>
                  )}
                </div>
                {second.award && (
                  <p className="text-xs font-bold text-navy-800 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200">
                    {second.award}
                  </p>
                )}
                {second.certificateUrl && (
                  <Link
                    href={second.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy-700 hover:text-navy-900 font-semibold underline underline-offset-2 pt-1"
                  >
                    <span>View Certificate</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </Card>
            ) : (
              <div className="hidden md:block w-full h-32 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200" />
            )}
            <div className="hidden md:flex w-full h-20 bg-slate-200/90 rounded-b-2xl items-center justify-center font-black font-heading text-2xl text-slate-500 shadow-inner">
              2
            </div>
          </div>

          {/* 1st Place (Gold Champion) */}
          <div className="order-1 md:order-2 flex flex-col items-center -translate-y-2">
            {first ? (
              <Card className="w-full text-center p-7 bg-gradient-to-b from-amber-50 to-gold-50/90 border-gold-300 shadow-xl flex flex-col items-center space-y-3 ring-2 ring-gold-400/50">
                <div className="w-16 h-16 rounded-full bg-gold-400 border-2 border-gold-200 flex items-center justify-center shadow-md">
                  <Trophy className="w-9 h-9 text-navy-950" />
                </div>
                <div className="space-y-1">
                  <Badge variant="gold" size="sm">Champion (1st Place)</Badge>
                  <h4 className="font-heading text-xl font-extrabold text-navy-950 pt-1">
                    {first.winnerName}
                  </h4>
                  {first.teamName && (
                    <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {first.teamName}
                    </p>
                  )}
                  {first.department && (
                    <p className="text-xs text-mist">{first.department}</p>
                  )}
                </div>
                {first.award && (
                  <p className="text-xs font-bold text-navy-950 bg-white/90 px-3 py-1 rounded-full border border-gold-200 shadow-xs">
                    {first.award}
                  </p>
                )}
                {first.certificateUrl && (
                  <Link
                    href={first.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy-900 hover:text-navy-700 font-bold underline underline-offset-2 pt-1"
                  >
                    <span>View Certificate</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gold-600" />
                  </Link>
                )}
              </Card>
            ) : null}
            <div className="hidden md:flex w-full h-32 bg-gold-400/90 rounded-b-2xl items-center justify-center font-black font-heading text-4xl text-navy-950 shadow-inner">
              1
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="order-3 flex flex-col items-center">
            {third ? (
              <Card className="w-full text-center p-6 bg-gradient-to-b from-amber-50/60 to-amber-100/40 border-amber-200 shadow-md flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-200 border-2 border-amber-300 flex items-center justify-center shadow-inner">
                  <Award className="w-8 h-8 text-amber-800" />
                </div>
                <div className="space-y-1">
                  <Badge variant="warning" size="sm">3rd Place</Badge>
                  <h4 className="font-heading text-lg font-bold text-navy-950 pt-1">
                    {third.winnerName}
                  </h4>
                  {third.teamName && (
                    <p className="text-xs font-semibold text-amber-800 flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {third.teamName}
                    </p>
                  )}
                  {third.department && (
                    <p className="text-xs text-mist">{third.department}</p>
                  )}
                </div>
                {third.award && (
                  <p className="text-xs font-bold text-navy-800 bg-white/80 px-2.5 py-1 rounded-full border border-amber-200">
                    {third.award}
                  </p>
                )}
                {third.certificateUrl && (
                  <Link
                    href={third.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy-700 hover:text-navy-900 font-semibold underline underline-offset-2 pt-1"
                  >
                    <span>View Certificate</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </Card>
            ) : (
              <div className="hidden md:block w-full h-24 rounded-2xl bg-amber-50/40 border border-dashed border-amber-200" />
            )}
            <div className="hidden md:flex w-full h-14 bg-amber-200/80 rounded-b-2xl items-center justify-center font-black font-heading text-xl text-amber-900 shadow-inner">
              3
            </div>
          </div>
        </div>
      </div>

      {/* Ranked List for Remaining Positions */}
      {others.length > 0 && (
        <div className="space-y-4 pt-6">
          <h3 className="font-heading text-lg font-bold text-navy-950 border-b border-navy-100 pb-2">
            Honorable Mentions & Full Standings
          </h3>
          <div className="divide-y divide-navy-100 bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
            {others.map((r) => (
              <div
                key={r.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-navy-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-900 font-bold text-sm flex items-center justify-center shrink-0">
                    #{r.position}
                  </div>
                  <div>
                    <h5 className="font-heading text-sm font-bold text-navy-950">
                      {r.winnerName}
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-mist">
                      {r.teamName && (
                        <span className="flex items-center gap-1 text-ink/70">
                          <Users className="w-3 h-3" />
                          {r.teamName}
                        </span>
                      )}
                      {r.department && <span>• {r.department}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {r.award && (
                    <Badge variant="outline" size="sm">
                      {r.award}
                    </Badge>
                  )}
                  {r.certificateUrl && (
                    <Link
                      href={r.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-navy-50 hover:bg-navy-100 text-navy-900 transition-colors"
                    >
                      <span>Certificate</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
