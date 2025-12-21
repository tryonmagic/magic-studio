import prisma from "../db.server";

/**
 * Public API endpoint for storefront try-on requests
 * Prepares and sends request to Fashn.ai API
 */

export const action = async ({ request }) => {
  // Handle POST - Create try-on session and call Fashn.ai
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const {
        shop,
        productId,
        productTitle,
        productImage,
        uploadedImage,
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
          }
        );
      }

      // Get API key from environment or settings
      const settings = await prisma.shopSettings.findUnique({
        where: { shop },
      });
      const apiKey = settings?.tryOnApiKey || process.env.FASHN_AI_API_KEY;
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ 
            error: "API key not configured. Please set FASHN_AI_API_KEY in environment or settings." 
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Create session in database
      const session = await prisma.tryOnSession.create({
        data: {
          shop,
          productId,
          productTitle: productTitle || "Unknown Product",
          productImage,
          uploadedImage,
          templateType,
          status: "processing",
        },
      });

      // Prepare Fashn.ai API request
      const fashnApiUrl = "https://api.fashn.ai/v1/run";
      
      // Convert base64 image to URL - Fashn.ai requires URLs, not base64
      let modelImageUrl = uploadedImage;
      if (uploadedImage.startsWith('data:image')) {
        // Base64 image - Fashn.ai might accept data URLs, but typically needs actual URLs
        // For now, we'll use the data URL directly (Fashn.ai should handle it)
        // TODO: If Fashn.ai rejects this, upload to a CDN/temp storage first
        modelImageUrl = uploadedImage;
      } else if (!uploadedImage.startsWith('http')) {
        // If it's not http and not base64, prepend https://
        modelImageUrl = uploadedImage.startsWith('//') 
          ? `https:${uploadedImage}` 
          : `https://${uploadedImage}`;
      }
      
      // Ensure product image is a proper URL
      let garmentImageUrl = productImage;
      if (!productImage.startsWith('http')) {
        garmentImageUrl = productImage.startsWith('//')
          ? `https:${productImage}`
          : `https://${productImage}`;
      }

      // Prepare EXACT request body format that Fashn.ai expects
      // DO NOT include shop, productId, productTitle, templateType, etc.
      // ONLY send: model_name and inputs with model_image and garment_image
      const fashnRequestBody = {
        model_name: "tryon-v1.6",
        inputs: {
          model_image: modelImageUrl,
          garment_image: garmentImageUrl,
        },
      };

      // Log to verify correct format (remove in production)
      console.log('[Fashn.ai Request] Sending:', JSON.stringify(fashnRequestBody, null, 2));

      // Send request to Fashn.ai API
      const fashnResponse = await fetch(fashnApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(fashnRequestBody),
      });

      const fashnData = await fashnResponse.json();

      if (!fashnResponse.ok) {
        // Update session as failed
        await prisma.tryOnSession.update({
          where: { id: session.id },
          data: { 
            status: "failed",
          },
        });

        return new Response(
          JSON.stringify({
            error: fashnData.error || "Fashn.ai API request failed",
            details: fashnData,
          }),
          {
            status: fashnResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Fashn.ai returns a prediction ID, store it and poll for results
      const predictionId = fashnData.id || fashnData.prediction_id;
      
      // Update session with prediction ID
      await prisma.tryOnSession.update({
        where: { id: session.id },
        data: {
          status: "processing",
          // Store prediction ID if needed
        },
      });

      // Start polling for results in background
      pollFashnResult(session.id, predictionId, apiKey, shop);

      return new Response(
        JSON.stringify({
          success: true,
          sessionId: session.id,
          status: "processing",
          predictionId: predictionId,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("Try-on error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal error" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const loader = async ({ request }) => {
  // Handle GET - Check session status
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Session ID required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const session = await prisma.tryOnSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        status: session.status,
        generatedImage: session.generatedImage,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

// Poll Fashn.ai for results
async function pollFashnResult(sessionId, predictionId, apiKey, shop) {
  const maxAttempts = 60; // 2 minutes max
  let attempts = 0;

  const pollInterval = setInterval(async () => {
    attempts++;

    if (attempts > maxAttempts) {
      clearInterval(pollInterval);
      await prisma.tryOnSession.update({
        where: { id: sessionId },
        data: { status: "failed" },
      });
      return;
    }

    try {
      // Check status from Fashn.ai
      const statusUrl = `https://api.fashn.ai/v1/status/${predictionId}`;
      const statusResponse = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      const statusData = await statusResponse.json();

      if (statusData.status === "completed" && statusData.output) {
        clearInterval(pollInterval);
        
        // Get the generated image URL
        const generatedImageUrl = statusData.output[0] || statusData.output;

        // Update session with result
        await prisma.tryOnSession.update({
          where: { id: sessionId },
          data: {
            generatedImage: generatedImageUrl,
            status: "completed",
          },
        });

        // Update credits
        await prisma.shopSettings.update({
          where: { shop },
          data: {
            usedCredits: { increment: 1 },
          },
        });
      } else if (statusData.status === "failed") {
        clearInterval(pollInterval);
        await prisma.tryOnSession.update({
          where: { id: sessionId },
          data: { status: "failed" },
        });
      }
      // If still processing, continue polling
    } catch (error) {
      console.error("Polling error:", error);
      // Continue polling on error
    }
  }, 2000); // Poll every 2 seconds
}
