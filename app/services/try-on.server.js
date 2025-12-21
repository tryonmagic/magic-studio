/**
 * Virtual Try-On API Service
 * Supports multiple providers: Replicate, Fashn.ai, Custom API
 */

/**
 * Generate a virtual try-on image
 * @param {Object} params
 * @param {string} params.personImageUrl - URL of the person's photo
 * @param {string} params.garmentImageUrl - URL of the garment/product image
 * @param {string} params.templateType - Type: upper_body, full_body, bottom_body
 * @param {string} params.apiKey - API key for the provider
 * @param {string} params.provider - Provider: replicate, fashn, custom
 * @param {string} params.customEndpoint - Custom API endpoint (if provider is custom)
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export async function generateTryOn({
  personImageUrl,
  garmentImageUrl,
  templateType,
  apiKey,
  provider = "fashn", // Always use Fashn.ai
  customEndpoint,
}) {
  try {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    // Always use Fashn.ai API
    return await generateWithFashn({
      personImageUrl,
      garmentImageUrl,
      templateType,
      apiKey,
    });
  } catch (error) {
    console.error("Virtual try-on generation error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate virtual try-on",
    };
  }
}

/**
 * Generate using Replicate API (IDM-VTON, Kolors, etc.)
 */
async function generateWithReplicate({
  personImageUrl,
  garmentImageUrl,
  templateType,
  apiKey,
}) {
  // Replicate API endpoint for virtual try-on models
  // Popular models: yisol/idm-vton, cuuupid/idm-vton, etc.
  const modelVersion =
    "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4"; // IDM-VTON

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        human_img: personImageUrl,
        garm_img: garmentImageUrl,
        garment_des: "clothing item",
        category: templateType === "upper_body" ? "upper_body" : "lower_body",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }

  const prediction = await response.json();

  // Poll for completion
  const result = await pollReplicatePrediction(prediction.id, apiKey);

  return {
    success: true,
    imageUrl: result.output,
    predictionId: prediction.id,
  };
}

/**
 * Poll Replicate prediction until complete
 */
async function pollReplicatePrediction(predictionId, apiKey, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${apiKey}`,
        },
      },
    );

    const prediction = await response.json();

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed") {
      throw new Error("Prediction failed: " + prediction.error);
    }
  }

  throw new Error("Prediction timeout");
}

/**
 * Generate using Fashn.ai API
 */
async function generateWithFashn({
  personImageUrl,
  garmentImageUrl,
  templateType,
  apiKey,
}) {
  // Map template types to Fashn.ai categories
  const categoryMap = {
    upper_body: "tops",
    full_body: "one-pieces",
    bottom_body: "bottoms",
  };

  // Step 1: Submit the try-on request
  const response = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: personImageUrl,
        garment_image: garmentImageUrl,
        //category: categoryMap[templateType] || "auto",
        mode: "balanced", // performance | balanced | quality
        num_samples: 1,
        output_format: "jpeg",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fashn.ai API error: ${errorText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`Fashn.ai error: ${result.error}`);
  }

  // Step 2: Poll for the result
  const predictionId = result.id;
  const output = await pollFashnPrediction(predictionId, apiKey);

  return {
    success: true,
    imageUrl: output,
  };
}

/**
 * Poll Fashn.ai prediction until complete
 */
async function pollFashnPrediction(predictionId, apiKey, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const response = await fetch(
      `https://api.fashn.ai/v1/status/${predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fashn.ai status check error: ${errorText}`);
    }

    const prediction = await response.json();

    if (prediction.status === "completed") {
      // Return the first output image URL
      if (prediction.output && prediction.output.length > 0) {
        return prediction.output[0];
      }
      throw new Error("No output image in completed prediction");
    }

    if (prediction.status === "failed") {
      const errorMsg = prediction.error
        ? `${prediction.error.name}: ${prediction.error.message}`
        : "Unknown error";
      throw new Error(`Fashn.ai prediction failed: ${errorMsg}`);
    }

    // Status is still "processing" or "queued", continue polling
  }

  throw new Error("Fashn.ai prediction timeout");
}

/**
 * Generate using Custom API endpoint
 */
async function generateWithCustomAPI({
  personImageUrl,
  garmentImageUrl,
  templateType,
  apiKey,
  endpoint,
}) {
  if (!endpoint) {
    throw new Error("Custom endpoint is required");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      person_image: personImageUrl,
      garment_image: garmentImageUrl,
      template_type: templateType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Custom API error: ${error}`);
  }

  const result = await response.json();

  return {
    success: true,
    imageUrl: result.output_url || result.image_url || result.result,
  };
}

/**
 * Upload image to temporary storage (you can replace with your own storage)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - URL of uploaded image
 */
export async function uploadImage(base64Image) {
  // For now, return the base64 data URL
  // In production, upload to S3, Cloudinary, or Shopify Files API
  return base64Image;
}
