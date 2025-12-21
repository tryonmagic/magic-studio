import prisma from "../db.server";
import { cors } from "../utils/cors.server";

/**
 * Check the status of a virtual try-on session
 * GET /api/try-on/status?sessionId=xxx
 */
export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return cors(
        request,
        new Response(JSON.stringify({ error: "Session ID required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    const session = await prisma.tryOnSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return cors(
        request,
        new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    return cors(
      request,
      new Response(
        JSON.stringify({
          sessionId: session.id,
          status: session.status,
          generatedImage: session.generatedImage,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("Status check error:", error);
    return cors(
      request,
      new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
};
