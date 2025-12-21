import prisma from "../db.server";

/**
 * API endpoint to get button settings for storefront
 * This allows the storefront to apply custom button styles
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

    const settings = await prisma.shopSettings.findUnique({
      where: { shop },
      select: {
        buttonStyle: true,
        buttonGradientStart: true,
        buttonGradientEnd: true,
        buttonRadius: true,
        buttonBorderColor: true,
        buttonText: true,
      },
    });

    if (!settings) {
      return new Response(
        JSON.stringify({
          buttonStyle: "primary",
          buttonGradientStart: "#667eea",
          buttonGradientEnd: "#764ba2",
          buttonRadius: "8px",
          buttonBorderColor: "#d1d5db",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching button settings:", error);
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
