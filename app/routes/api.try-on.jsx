import prisma from "../db.server";
import { generateTryOn, uploadImage } from "../services/try-on.server";
import { cors } from "../utils/cors.server";

// Allow CORS for storefront requests
export const loader = async ({ request }) => {
  return cors(
    request,
    new Response(JSON.stringify({ message: "Use POST to create try-on session" }), {
      headers: { "Content-Type": "application/json" },
    })
  );
};

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return cors(
      request,
      new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      })
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
      return cors(
        request,
        new Response(
          JSON.stringify({
            error: "Missing required fields",
            required: ["shop", "productId", "productImage", "uploadedImage"],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Get shop settings
    const settings = await prisma.shopSettings.findUnique({
      where: { shop },
    });

    if (!settings) {
      return cors(
        request,
        new Response(
          JSON.stringify({ error: "Shop not configured. Please configure settings first." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Check credits
    if (settings.usedCredits >= settings.monthlyCredits) {
      return cors(
        request,
        new Response(
          JSON.stringify({
            error: "Monthly credits limit reached",
            usedCredits: settings.usedCredits,
            monthlyCredits: settings.monthlyCredits,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Use API key from settings or environment variable
    const apiKey = settings.tryOnApiKey || process.env.FASHN_AI_API_KEY;
    
    if (!apiKey) {
      return cors(
        request,
        new Response(
          JSON.stringify({ error: "Virtual try-on API not configured. Please set FASHN_AI_API_KEY in environment or settings." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Create session record
    const session = await prisma.tryOnSession.create({
      data: {
        shop,
        productId,
        productTitle: productTitle || "Unknown Product",
        productImage,
        uploadedImage,
        customerEmail: customerEmail || null,
        templateType,
        status: "processing",
      },
    });

    // Generate virtual try-on (async)
    generateTryOnAsync(session.id, {
      personImageUrl: uploadedImage,
      garmentImageUrl: productImage,
      templateType,
      apiKey: apiKey,
      provider: settings.tryOnApiProvider || "fashn", // Default to Fashn.ai
      customEndpoint: settings.tryOnApiEndpoint,
      shop,
    });

    return cors(
      request,
      new Response(
        JSON.stringify({
          success: true,
          sessionId: session.id,
          status: "processing",
          message: "Virtual try-on is being generated",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("Try-on API error:", error);
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


// Async function to generate try-on and update session
async function generateTryOnAsync(sessionId, config) {
  try {
    const result = await generateTryOn(config);

    if (result.success) {
      // Update session with generated image
      await prisma.tryOnSession.update({
        where: { id: sessionId },
        data: {
          generatedImage: result.imageUrl,
          status: "completed",
        },
      });

      // Increment used credits
      await prisma.shopSettings.update({
        where: { shop: config.shop },
        data: {
          usedCredits: { increment: 1 },
        },
      });
    } else {
      // Mark as failed
      await prisma.tryOnSession.update({
        where: { id: sessionId },
        data: {
          status: "failed",
        },
      });
    }
  } catch (error) {
    console.error("Async try-on generation error:", error);
    await prisma.tryOnSession.update({
      where: { id: sessionId },
      data: {
        status: "failed",
      },
    });
  }
}
