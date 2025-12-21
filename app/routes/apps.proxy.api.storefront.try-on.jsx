import prisma from "../db.server";
import { generateTryOn } from "../services/try-on.server";

/**
 * App Proxy endpoint for storefront try-on requests
 * Accessible from storefront via /apps/proxy/api/storefront/try-on
 */

// Handle both GET and POST requests
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "Missing sessionId parameter" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  try {
    const session = await prisma.tryOnSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        status: session.status,
        generatedImage: session.generatedImage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  try {
    const body = await request.json();
    const {
      shop,
      productId,
      productTitle,
      productImage,
      uploadedImage,
      customerEmail,
      templateType = "upper_body",
    } = body;

    // Validate required fields
    if (!shop || !productId || !productImage || !uploadedImage) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["shop", "productId", "productImage", "uploadedImage"],
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Get shop settings
    const settings = await prisma.shopSettings.findUnique({
      where: { shop },
    });

    if (!settings) {
      return new Response(
        JSON.stringify({
          error: "Shop not configured. Please configure the app in admin.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Check credits
    if (settings.usedCredits >= settings.monthlyCredits) {
      return new Response(
        JSON.stringify({
          error: "Monthly credit limit reached. Please upgrade your plan.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Create try-on session
    const session = await prisma.tryOnSession.create({
      data: {
        shop,
        productId,
        productTitle: productTitle || "Unknown Product",
        productImage,
        uploadedImage,
        customerEmail,
        templateType,
        status: "processing",
      },
    });

    // Use API key from settings or environment variable
    const apiKey = settings.tryOnApiKey || process.env.FASHN_AI_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "API key not configured. Please set FASHN_AI_API_KEY in environment or settings.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Start generation in background (don't await)
    generateTryOn({
      sessionId: session.id,
      personImageUrl: uploadedImage,
      garmentImageUrl: productImage,
      templateType,
      apiKey: apiKey,
      provider: settings.tryOnApiProvider || "fashn", // Default to Fashn.ai
      customEndpoint: settings.tryOnApiEndpoint,
    })
      .then(async (result) => {
        // Update session with result
        await prisma.tryOnSession.update({
          where: { id: session.id },
          data: {
            status: result.success ? "completed" : "failed",
            generatedImage: result.imageUrl,
          },
        });

        // Increment used credits
        await prisma.shopSettings.update({
          where: { shop },
          data: {
            usedCredits: { increment: 1 },
          },
        });
      })
      .catch(async (error) => {
        console.error("Generation error:", error);
        await prisma.tryOnSession.update({
          where: { id: session.id },
          data: {
            status: "failed",
          },
        });
      });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        message: "Try-on session created. Polling for results...",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error creating try-on session:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create try-on session",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};
