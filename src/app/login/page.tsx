"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { BrandLogo } from "@/components/BrandLogo"

const QUOTES = [
  "Great things in business are never done by one person. They're done by a team of people.",
  "The only way to do great work is to love what you do.",
  "Efficiency is doing things right; effectiveness is doing the right things.",
  "Innovation distinguishes between a leader and a follower.",
  "Success is not final; failure is not fatal: It is the courage to continue that counts.",
  "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
  "The secret of change is to focus all of your energy not on fighting the old, but on building the new."
];

function LoginContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (session) {
      router.push("/templates")
    }
    // Set a random quote on mount
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(randomQuote);
  }, [session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-12 h-12 border-4 border-blue-500 rounded-full flex items-center justify-center"
        >
          <div className="w-6 h-6 border-2 border-blue-500/30 rounded-full border-t-blue-500 animate-spin" />
        </motion.div>
      </div>
    )
  }

  if (session) return null

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fbfcfd] overflow-hidden selection:bg-blue-600/10">

      {/* Left Section: Login Form */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full lg:w-[42%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative z-10 bg-white"
      >
        <div className="max-w-md w-full mx-auto">
          {/* Logo Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm mb-8"
            >
              <BrandLogo className="w-8 h-8 text-blue-600" />
            </motion.div>
            <h1 className="text-4xl font-medium text-slate-900 tracking-normal mb-2 leading-[1.3] pb-2 overflow-visible">
              ProposalForge
            </h1>
            <p className="text-slate-500 font-medium tracking-wide">
              Insights. Action. Innovation
            </p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">
                  {error === "AccessDenied"
                    ? "Access restricted to @gmail.com accounts."
                    : "Authentication failed. Please try again."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 text-sm">Sign in to access your proposals and applications.</p>
            </div>

            <Button
              onClick={() => signIn("google", { callbackUrl: "/templates" })}
              className="w-full h-16 bg-slate-900 hover:bg-black text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-4 transition-all duration-300 shadow-xl shadow-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              Enter Workspace
            </Button>
          </motion.div>

          <div className="absolute bottom-20 left-8 sm:left-16 lg:left-24">
            <p className="text-slate-400 text-[10px] font-bold tracking-[0.4em] uppercase">
              &copy; {new Date().getFullYear()} ProposalForge
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right Section: Visual Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block w-[58%] h-screen relative bg-slate-100"
      >
        <img
          src="/login-hero.png"
          alt="ProposalForge Architecture"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Subtle Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10" />
        <div className="absolute inset-0 bg-blue-600/5 mix-blend-overlay" />

        {/* Floating Brand Elements */}
        <div className="absolute bottom-12 right-12 z-20 text-right">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-white/40 backdrop-blur-3xl border border-white/20 p-8 rounded-[2rem] shadow-2xl max-w-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <BrandLogo className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black tracking-[0.2em] text-slate-800 uppercase">ProposalForge</span>
            </div>
            <p className="text-slate-700 text-sm font-semibold leading-relaxed">
              "{quote || QUOTES[0]}"
            </p>
          </motion.div>
        </div>
      </motion.div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
