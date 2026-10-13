"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/shared/Logo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CountdownChip } from "@/components/shared/CountdownChip";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { CountUp } from "@/components/motion/CountUp";
import { FloatingShapes } from "@/components/motion/FloatingShapes";
import { AdminTopNav } from "@/components/layout/AdminTopNav";
import { Inbox } from "lucide-react";

const SAMPLE_TARGET_DATE = "2026-10-25T18:00:00.000Z";

export default function DesignShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  return (
    <PageShell
      title="Design System & Component Showcase"
      description="Visual verification of Forté Arena design tokens, motion components, and UI system."
    >
      <div className="relative space-y-16 pb-20">
        <FloatingShapes className="opacity-60" />

        {/* 1. Brand & Logo */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            1. Brand Logo (1.36× Circular Crop Container)
          </h2>
          <Card className="flex flex-wrap items-center gap-10">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-mist">Small (Header/Mobile)</span>
              <div><Logo size="sm" /></div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-mist">Medium (Standard)</span>
              <div><Logo size="md" /></div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-mist">Large (Hero/Footer)</span>
              <div><Logo size="lg" /></div>
            </div>
          </Card>
        </section>

        {/* 2. Motion Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            2. Motion & Micro-interactions (Motion / React)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal>
              <Card hoverable className="text-center p-8 bg-gradient-to-b from-navy-900 to-navy-950 text-ivory">
                <span className="text-xs font-bold text-gold-400 uppercase tracking-widest">
                  Reveal Animation
                </span>
                <p className="mt-2 text-sm text-ivory/80">
                  Fades and rises 24px on scroll, honoring prefers-reduced-motion.
                </p>
              </Card>
            </Reveal>

            <Card hoverable className="text-center p-8">
              <span className="text-xs font-bold text-mist uppercase tracking-widest">
                CountUp Stats
              </span>
              <div className="text-4xl font-extrabold font-heading text-navy-900 mt-2">
                <CountUp to={2500} suffix="+" />
              </div>
              <p className="text-xs text-mist mt-1">Registrations this season</p>
            </Card>

            <Card hoverable className="text-center p-8">
              <span className="text-xs font-bold text-mist uppercase tracking-widest">
                Hydration-Safe Countdown
              </span>
              <div className="mt-3">
                <CountdownChip targetDate={SAMPLE_TARGET_DATE} />
              </div>
              <p className="text-xs text-mist mt-2">Auto-updates every second</p>
            </Card>
          </div>

          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StaggerItem>
              <Card className="p-4 bg-navy-50/60 text-center text-sm font-semibold text-navy-900">
                Stagger Item #1
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="p-4 bg-navy-50/60 text-center text-sm font-semibold text-navy-900">
                Stagger Item #2
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="p-4 bg-navy-50/60 text-center text-sm font-semibold text-navy-900">
                Stagger Item #3
              </Card>
            </StaggerItem>
          </Stagger>
        </section>

        {/* 3. Buttons & CTAs */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            3. Buttons & Variants
          </h2>
          <Card className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary (Navy)</Button>
              <Button variant="gold">Gold Accent</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-navy-100/60">
              <Button size="sm" variant="primary">Small</Button>
              <Button size="md" variant="primary">Medium</Button>
              <Button size="lg" variant="gold">Large CTA</Button>
              <Button loading variant="primary">Loading...</Button>
            </div>
          </Card>
        </section>

        {/* 4. Badges & Status Indicators */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            4. Badges & Status Indicators
          </h2>
          <div className="space-y-4">
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-mist uppercase tracking-wider">UI Badges</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="gold">Gold</Badge>
                <Badge variant="navy">Navy</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </Card>

            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-mist uppercase tracking-wider">Domain Status Badges</h3>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status="APPROVED" />
                <StatusBadge status="PENDING" />
                <StatusBadge status="REJECTED" />
                <StatusBadge status="WITHDRAWN" />
                <StatusBadge status="PUBLISHED" />
                <StatusBadge status="COMPLETED" />
                <StatusBadge status="CLOSED" />
              </div>
            </Card>
          </div>
        </section>

        {/* 5. Form Elements */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            5. Form Inputs & Selects
          </h2>
          <Card className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Event Name"
              placeholder="e.g. Battle of the Bands 2026"
              hint="Unique name for the competition"
            />
            <Select
              label="Event Category"
              options={[
                { label: "Technical", value: "TECHNICAL" },
                { label: "Cultural", value: "CULTURAL" },
                { label: "Gaming", value: "GAMING" },
                { label: "Sports", value: "SPORTS" },
              ]}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Competition Rules"
                placeholder="Detail eligibility, rounds, and team rules..."
              />
            </div>
            <Input
              label="Input with Error"
              defaultValue="Invalid entry"
              error="Roll number must match your student ID format"
            />
          </Card>
        </section>

        {/* 6. Tabs, Skeletons & Modal */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            6. Interactive Elements & Overlays
          </h2>
          <div className="space-y-4">
            <Tabs
              tabs={[
                { id: "all", label: "All Events", badge: 12 },
                { id: "technical", label: "Technical", badge: 4 },
                { id: "cultural", label: "Cultural", badge: 5 },
                { id: "gaming", label: "Gaming", badge: 3 },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <Card className="space-y-4">
                <CardHeader>
                  <CardTitle>Skeleton Loaders</CardTitle>
                  <CardDescription>Shimmer placeholders for content loading</CardDescription>
                </CardHeader>
                <div className="space-y-2.5">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </Card>

              <Card className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                <CardTitle>Dialog Modal</CardTitle>
                <CardDescription>
                  Click below to preview accessible modal dialog with backdrop blur
                </CardDescription>
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  Open Modal
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* 7. Empty State */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            7. Empty State
          </h2>
          <EmptyState
            icon={<Inbox className="w-8 h-8 text-navy-800" />}
            title="No Registrations Yet"
            description="You have not signed up for any events in Forté Arena yet. Explore our open festival categories!"
            action={<Button variant="gold">Browse Events</Button>}
          />
        </section>

        {/* 8. Admin Top Nav Preview */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-navy-950 border-b border-navy-100 pb-2">
            8. Admin Top Navigation (No Sidebar Layout)
          </h2>
          <div className="rounded-2xl overflow-hidden border border-navy-100 shadow-md">
            <AdminTopNav />
          </div>
        </section>

        {/* Modal Instance */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Registration Confirmation"
          description="Confirm your submission for the Hackathon 2026."
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Once submitted, your registration status will be set to PENDING for organizer review.
            </p>
            <div className="flex justify-end gap-2.5 pt-4 border-t border-navy-100">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="gold" onClick={() => setModalOpen(false)}>
                Confirm & Register
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageShell>
  );
}
