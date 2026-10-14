import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { APP_NAME } from "@/config/app";
import {
  Target,
  ShieldCheck,
  Calendar,
  MapPin,
  Mail,
  HelpCircle,
} from "lucide-react";

export default function AboutPage() {
  const FAQS = [
    {
      q: "Who is eligible to participate in Forté Arena?",
      a: "Forté Arena is open to all enrolled college and university students. Selected events also invite regional inter-varsity contingents.",
    },
    {
      q: "Can I register for multiple events across different categories?",
      a: "Yes! Students may enter multiple competitions provided the event schedules and stage timings do not conflict.",
    },
    {
      q: "How are team members verified?",
      a: "The team leader provides student roll numbers and details during registration. Organizers verify rosters before granting Approved status.",
    },
    {
      q: "When are certificates and prize awards distributed?",
      a: "Digital certificates are available directly on the platform immediately upon result publication. Trophies and cash prizes are presented at the Closing Ceremony.",
    },
  ];

  return (
    <PageShell
      title={`About ${APP_NAME}`}
      description="The premier collegiate festival celebrating technological innovation, sportsmanship, and creative expression."
    >
      <div className="space-y-16 pb-20">
        {/* Mission & Vision Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 space-y-4 bg-white border-navy-100 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-gold-100 text-gold-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-navy-950">
              Our Vision
            </h3>
            <p className="text-sm text-mist leading-relaxed">
              To cultivate an electrifying inter-collegiate ecosystem where students test their mettle, forge lifelong professional and creative bonds, and showcase world-class talent across computing, athletics, gaming, and the performing arts.
            </p>
          </Card>

          <Card className="p-8 space-y-4 bg-white border-navy-100 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-900 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-gold-500" />
            </div>
            <h3 className="font-heading text-xl font-bold text-navy-950">
              Integrity & Standards
            </h3>
            <p className="text-sm text-mist leading-relaxed">
              Every tournament in Forté Arena adheres to strict competitive guidelines, transparent judging criteria, verified participant rosters, and tamper-proof digital certificates recognized by academic boards and corporate sponsors.
            </p>
          </Card>
        </section>

        {/* Festival Pillars */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge variant="navy" size="sm">Excellence</Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950">
              Four Competitive Pillars
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Tech & Hackathons",
                desc: "Algorithmic showdowns, AI model building, web sprint battles, and hardware showcases.",
              },
              {
                title: "Esports & Gaming",
                desc: "High-octane PC and console brackets across Valorant, FIFA, Tekken, and mobile titles.",
              },
              {
                title: "Athletics & Sports",
                desc: "Indoor and outdoor tournaments including futsal, basketball, badminton, and table tennis.",
              },
              {
                title: "Cultural Arts",
                desc: "Battle of the bands, theatrical drama, photography exhibitions, and debate tournaments.",
              },
            ].map((p) => (
              <Card key={p.title} className="p-6 space-y-2.5 bg-white border-navy-100">
                <h4 className="font-heading text-base font-bold text-navy-950">
                  {p.title}
                </h4>
                <p className="text-xs text-mist leading-relaxed">
                  {p.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Festival Venue & Location */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-navy-950 to-navy-900 text-ivory space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gold-400 font-heading">
                Central Campus Grounds
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-ivory mt-1">
                Festival Grounds & Arena Complex
              </h3>
            </div>
            <Link href="/events">
              <Button variant="gold" size="sm">
                View Arena Map & Events
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm text-ivory/80">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gold-400 shrink-0" />
              <span>Main Campus Auditorium & Sports Complex</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gold-400 shrink-0" />
              <span>Festival Season: October 2026</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gold-400 shrink-0" />
              <span>support@forte-arena.edu</span>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge variant="gold" size="sm">Answers</Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-navy-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {FAQS.map((faq) => (
              <Card key={faq.q} className="p-6 space-y-2 bg-white border-navy-100">
                <div className="flex items-center gap-2 font-heading text-base font-bold text-navy-950">
                  <HelpCircle className="w-4 h-4 text-gold-500 shrink-0" />
                  <h4>{faq.q}</h4>
                </div>
                <p className="text-xs sm:text-sm text-mist pl-6 leading-relaxed">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
