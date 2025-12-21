import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get or create shop settings
  let settings = await prisma.shopSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    // Use default API key from environment variable if available
    const defaultApiKey = process.env.FASHN_AI_API_KEY || null;
    settings = await prisma.shopSettings.create({
      data: { 
        shop,
        tryOnApiKey: defaultApiKey,
        tryOnApiProvider: "fashn",
      },
    });
  } else if (!settings.tryOnApiKey && process.env.FASHN_AI_API_KEY) {
    // If settings exist but no API key, use environment variable
    settings = await prisma.shopSettings.update({
      where: { shop },
      data: { 
        tryOnApiKey: process.env.FASHN_AI_API_KEY,
        tryOnApiProvider: "fashn",
      },
    });
  }

  return { settings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  // Always use environment variable for API key (not from form)
  const apiKey = process.env.FASHN_AI_API_KEY || null;

  const data = {
    buttonText: formData.get("buttonText"),
    buttonStyle: formData.get("buttonStyle"),
    buttonGradientStart: formData.get("buttonGradientStart") || null,
    buttonGradientEnd: formData.get("buttonGradientEnd") || null,
    buttonRadius: formData.get("buttonRadius") || null,
    buttonBorderColor: formData.get("buttonBorderColor") || null,
    modalTitle: formData.get("modalTitle"),
    enableLeadCapture: formData.get("enableLeadCapture") === "true",
    discountCode: formData.get("discountCode") || null,
    tryOnApiKey: apiKey, // Always from environment variable
    tryOnApiProvider: "fashn", // Always use Fashn.ai
    tryOnApiEndpoint: null,
  };

  await prisma.shopSettings.upsert({
    where: { shop },
    update: data,
    create: { ...data, shop },
  });

  return { success: true };
};

export default function Settings() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formData, setFormData] = useState({
    buttonText: settings.buttonText || "Virtual Try-On",
    buttonStyle: settings.buttonStyle || "primary",
    buttonGradientStart: settings.buttonGradientStart || "#667eea",
    buttonGradientEnd: settings.buttonGradientEnd || "#764ba2",
    buttonRadius: settings.buttonRadius || "8px",
    buttonBorderColor: settings.buttonBorderColor || "#d1d5db",
    modalTitle: settings.modalTitle || "Virtual Fitting Room",
    enableLeadCapture: settings.enableLeadCapture || false,
    discountCode: settings.discountCode || "",
  });

  const isLoading = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully");
    }
  }, [fetcher.data?.success, shopify]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });
    fetcher.submit(form, { method: "POST" });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <s-page heading="Settings">
      <form onSubmit={handleSubmit}>
        <s-section heading="Button Customization">
          <s-stack direction="block" gap="base">
            <div style={{
              padding: '12px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#0369a1'
            }}>
              <strong>💡 Note:</strong> These settings control the button appearance on your storefront. 
              Changes will be reflected immediately after saving.
            </div>
            
            <s-text-field
              label="Button Text"
              value={formData.buttonText}
              onChange={(e) => handleChange("buttonText", e.target.value)}
            />

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Button Style
              </label>
              <select
                value={formData.buttonStyle}
                onChange={(e) => handleChange("buttonStyle", e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #c9cccf',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="tertiary">Tertiary</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {formData.buttonStyle === "custom" && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Gradient Start Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={formData.buttonGradientStart}
                        onChange={(e) => handleChange("buttonGradientStart", e.target.value)}
                        style={{
                          width: '50px',
                          height: '40px',
                          border: '1px solid #c9cccf',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={formData.buttonGradientStart}
                        onChange={(e) => handleChange("buttonGradientStart", e.target.value)}
                        placeholder="#667eea"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid #c9cccf',
                          borderRadius: '8px'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Gradient End Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={formData.buttonGradientEnd}
                        onChange={(e) => handleChange("buttonGradientEnd", e.target.value)}
                        style={{
                          width: '50px',
                          height: '40px',
                          border: '1px solid #c9cccf',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={formData.buttonGradientEnd}
                        onChange={(e) => handleChange("buttonGradientEnd", e.target.value)}
                        placeholder="#764ba2"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid #c9cccf',
                          borderRadius: '8px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Border Radius
                    </label>
                    <input
                      type="text"
                      value={formData.buttonRadius}
                      onChange={(e) => handleChange("buttonRadius", e.target.value)}
                      placeholder="8px"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        border: '1px solid #c9cccf',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Border Color
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={formData.buttonBorderColor}
                        onChange={(e) => handleChange("buttonBorderColor", e.target.value)}
                        style={{
                          width: '50px',
                          height: '40px',
                          border: '1px solid #c9cccf',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={formData.buttonBorderColor}
                        onChange={(e) => handleChange("buttonBorderColor", e.target.value)}
                        placeholder="#d1d5db"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid #c9cccf',
                          borderRadius: '8px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, ' + formData.buttonGradientStart + ' 0%, ' + formData.buttonGradientEnd + ' 100%)',
                  borderRadius: formData.buttonRadius,
                  border: '2px solid ' + formData.buttonBorderColor,
                  textAlign: 'center',
                  color: 'white',
                  fontWeight: '600',
                  marginTop: '8px'
                }}>
                  Preview: {formData.buttonText || "Virtual Try-On"}
                </div>
              </>
            )}
          </s-stack>
        </s-section>

        <s-section heading="Modal Customization">
          <s-text-field
            label="Modal Title"
            value={formData.modalTitle}
            onChange={(e) => handleChange("modalTitle", e.target.value)}
          />
        </s-section>

        <s-section heading="Lead Capture">
          <s-stack direction="block" gap="base">
            <s-checkbox
              checked={formData.enableLeadCapture}
              onChange={(e) =>
                handleChange("enableLeadCapture", e.target.checked)
              }
            >
              Enable email capture before virtual try-on
            </s-checkbox>

            {formData.enableLeadCapture && (
              <s-text-field
                label="Discount Code (Optional)"
                value={formData.discountCode}
                onChange={(e) => handleChange("discountCode", e.target.value)}
                details="Offer a discount code after email submission"
              />
            )}
          </s-stack>
        </s-section>

        <s-stack direction="inline" gap="base">
          <s-button type="submit" {...(isLoading ? { loading: true } : {})}>
            Save Settings
          </s-button>
        </s-stack>
      </form>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
