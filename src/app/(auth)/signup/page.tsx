"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { APP_NAME } from "@/config/app";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  DEPARTMENTS,
  YEARS,
  DEPARTMENT_VALUES,
  YEAR_VALUES,
} from "@/features/profile/academic.config";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    department: z.enum(DEPARTMENT_VALUES, {
      message: "Please select your department",
    }),
    academicYear: z.enum(YEAR_VALUES, {
      message: "Please select your academic year",
    }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "" as unknown as (typeof DEPARTMENT_VALUES)[number],
      academicYear: "" as unknown as (typeof YEAR_VALUES)[number],
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    try {
      const result = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        department: data.department,
        academicYear: data.academicYear,
      } as Parameters<typeof signUp.email>[0] & {
        department?: string;
        academicYear?: string;
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to create account");
      } else {
        toast.success("Account created successfully!");
        router.push(next);
        router.refresh();
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create account"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create Account
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Join {APP_NAME} to register for events
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            disabled={loading}
            {...register("name")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Jane Doe"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            disabled={loading}
            {...register("email")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@college.edu"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="department"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Department
          </label>
          <select
            id="department"
            disabled={loading}
            {...register("department")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">Please select your department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {errors.department && (
            <p className="mt-1 text-xs text-red-500">
              {errors.department.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="academicYear"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Academic Year
          </label>
          <select
            id="academicYear"
            disabled={loading}
            {...register("academicYear")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">Please select your academic year</option>
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
          {errors.academicYear && (
            <p className="mt-1 text-xs text-red-500">
              {errors.academicYear.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            disabled={loading}
            {...register("password")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="At least 6 characters"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            disabled={loading}
            {...register("confirmPassword")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Repeat password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
