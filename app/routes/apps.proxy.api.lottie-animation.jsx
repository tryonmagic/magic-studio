import { readFile } from "fs/promises";
import { join } from "path";

/**
 * App Proxy endpoint to serve Lottie animation JSON
 * Accessible from storefront via /apps/proxy/api/lottie-animation
 */
export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return new Response(
        JSON.stringify({ error: "Shop parameter required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Read the Lottie animation JSON file from public folder
    const fileName = "Ai loading model.json";
    const filePath = join(process.cwd(), "public", fileName);
    
    try {
      const fileContent = await readFile(filePath, "utf-8");
      const animationData = JSON.parse(fileContent);
      
      // Validate it's a Lottie file
      if (!animationData.v || !animationData.fr) {
        throw new Error("Invalid Lottie animation file");
      }

      return new Response(JSON.stringify(animationData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (fileError) {
      console.error("Error reading Lottie file:", fileError);
      return new Response(
        JSON.stringify({ error: "Animation file not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error serving Lottie animation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
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
