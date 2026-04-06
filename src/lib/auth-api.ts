import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Session } from "next-auth";

export type AuthResult = Session | NextResponse<{ error: string }>;

/**
 * Validates the user session and returns the session if valid,
 * or an unauthorized response if not.
 * 
 * Usage in API routes:
 * ```
 * const authResult = await requireAuth();
 * if (isAuthError(authResult)) return authResult;
 * const session = authResult;
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Unauthorized. Please sign in to access this resource." },
            { status: 401 }
        );
    }

    return session;
}

/**
 * Type guard to check if requireAuth returned an error response
 */
export function isAuthError(result: AuthResult): result is NextResponse<{ error: string }> {
    return result instanceof NextResponse;
}
