import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      accessToken?: string
      idToken?: string
      hasSalesNavigatorAccess?: boolean
      hasProposalAppAccess?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    email?: string
    accessToken?: string
    idToken?: string
    hasSalesNavigatorAccess?: boolean
    hasProposalAppAccess?: boolean
  }
}
