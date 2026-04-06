import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

import { SUPERADMINS } from "./constants"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({}),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase()

      if (!email || !email.endsWith("@gmail.com")) {
        console.log('[ProposalForge Auth] SignIn Rejected - Not a @gmail.com email:', email);
        return false
      }

      console.log('[ProposalForge Auth] SignIn Callback - Email:', email);
      console.log('[ProposalForge Auth] SUPERADMINS:', SUPERADMINS);

      // Superadmins are always allowed
      if (SUPERADMINS.includes(email)) {
        await supabase
          .from("allowed_users")
          .update({ last_logged_in_at: new Date().toISOString() })
          .eq("email", email)
        return true
      }

      // Check if user is in allowed_users table and active
      const { data: allowedUser } = await supabase
        .from("allowed_users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single()

      if (!allowedUser) {
        return false
      }

      await supabase
        .from("allowed_users")
        .update({ last_logged_in_at: new Date().toISOString() })
        .eq("email", email)

      return true
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        const email = user.email.toLowerCase()
        console.log('[ProposalForge Auth] JWT Callback - Email:', email);

        if (SUPERADMINS.includes(email)) {
          console.log('[ProposalForge Auth] User is Superadmin - Granting all access');
          token.role = "superadmin"
          token.hasSalesNavigatorAccess = true
          token.hasProposalAppAccess = true
        } else {
          const { data: allowedUser } = await supabase
            .from("allowed_users")
            .select("role, has_sales_navigator_access, has_proposal_app_access")
            .eq("email", email)
            .single()

          console.log('[ProposalForge Auth] Fetched user from DB:', allowedUser);
          token.role = allowedUser?.role || "user"
          token.hasSalesNavigatorAccess = allowedUser?.has_sales_navigator_access || false
          token.hasProposalAppAccess = allowedUser?.has_proposal_app_access || false
        }
        token.email = email
      }
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.accessToken = token.accessToken as string
        session.user.idToken = token.idToken as string
        session.user.hasSalesNavigatorAccess = token.hasSalesNavigatorAccess as boolean
        session.user.hasProposalAppAccess = token.hasProposalAppAccess as boolean
      }
      console.log('[ProposalForge Auth] Session Callback - User Access:', {
        email: session.user?.email,
        role: session.user?.role,
        hasSalesNavigator: session.user?.hasSalesNavigatorAccess,
        hasProposalApp: session.user?.hasProposalAppAccess
      });
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
