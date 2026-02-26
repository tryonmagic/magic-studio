import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await prisma.shopSettings.findUnique({ where: { shop } });

  if (!settings) {
    const defaultApiKey = process.env.FASHN_AI_API_KEY || null;
    settings = await prisma.shopSettings.create({
      data: { shop, tryOnApiKey: defaultApiKey, tryOnApiProvider: "fashn" },
    });
  } else if (!settings.tryOnApiKey && process.env.FASHN_AI_API_KEY) {
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
    tryOnApiKey: apiKey,
    tryOnApiProvider: "fashn",
    tryOnApiEndpoint: null,
  };

  await prisma.shopSettings.upsert({
    where: { shop },
    update: data,
    create: { ...data, shop },
  });

  return { success: true };
};

const styles = `
  .st-info-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    font-size: 14px;
    color: #1e40af;
    line-height: 1.5;
  }
  .st-info-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }

  .st-field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
    margin-bottom: 8px;
  }
  .st-select {
    width: 100%;
    padding: 9px 36px 9px 12px;
    font-size: 14px;
    border: 1px solid #c9cccf;
    border-radius: 8px;
    background: white;
    color: #1a1a2e;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236d7175' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .st-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
  }

  .st-color-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 600px) { .st-color-grid { grid-template-columns: 1fr; } }

  .st-color-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .st-color-swatch {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 2px solid #e4e5e7;
    cursor: pointer;
    flex-shrink: 0;
    padding: 2px;
    background: white;
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .st-color-swatch:hover { border-color: #8c9196; }
  .st-color-swatch input[type="color"] {
    width: 100%;
    height: 100%;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;
  }
  .st-text-input {
    flex: 1;
    padding: 9px 12px;
    font-size: 14px;
    border: 1px solid #c9cccf;
    border-radius: 8px;
    background: white;
    font-family: monospace;
    color: #1a1a2e;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .st-text-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
  }
  .st-plain-input {
    width: 100%;
    padding: 9px 12px;
    font-size: 14px;
    border: 1px solid #c9cccf;
    border-radius: 8px;
    background: white;
    color: #1a1a2e;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .st-plain-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
  }

  .st-preview-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #6d7175;
    margin-bottom: 10px;
    margin-top: 18px;
  }
  .st-preview-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 24px;
    font-weight: 600;
    font-size: 15px;
    cursor: default;
    width: 100%;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .st-save-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: white;
    border: 1px solid #e4e5e7;
    border-radius: 12px;
    margin-top: 4px;
  }
`;

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

  const getPreviewStyle = () => {
    const { buttonStyle, buttonGradientStart, buttonGradientEnd, buttonRadius, buttonBorderColor } = formData;
    const base = { borderRadius: buttonRadius };

    if (buttonStyle === "custom" || buttonStyle === "primary") {
      return {
        ...base,
        background: buttonGradientEnd
          ? `linear-gradient(135deg, ${buttonGradientStart} 0%, ${buttonGradientEnd} 100%)`
          : buttonGradientStart,
        color: "white",
        border: buttonBorderColor ? `2px solid ${buttonBorderColor}` : "none",
      };
    }
    if (buttonStyle === "secondary") {
      return {
        ...base,
        background: "#f3f4f6",
        color: "#1f2937",
        border: `2px solid ${buttonBorderColor || "#d1d5db"}`,
      };
    }
    if (buttonStyle === "tertiary") {
      return {
        ...base,
        background: "transparent",
        color: buttonGradientStart || "#667eea",
        border: `2px solid ${buttonGradientStart || "#667eea"}`,
      };
    }
    return base;
  };

  return (
    <s-page heading="Settings">
      <style>{styles}</style>
      <form onSubmit={handleSubmit}>
        {/* Button Customization */}
        <s-section heading="Button Customization">
          <s-stack direction="block" gap="base">
            <div className="st-info-box">
              <span className="st-info-icon">💡</span>
              <span>
                <strong>Note:</strong> These settings control the button
                appearance on your storefront. Changes are reflected immediately
                after saving.
              </span>
            </div>

            <s-text-field
              label="Button Text"
              value={formData.buttonText}
              onChange={(e) => handleChange("buttonText", e.target.value)}
            />

            <div>
              <label className="st-field-label">Button Style</label>
              <select
                className="st-select"
                value={formData.buttonStyle}
                onChange={(e) => handleChange("buttonStyle", e.target.value)}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="tertiary">Tertiary</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {(formData.buttonStyle === "custom" ||
              formData.buttonStyle === "primary" ||
              formData.buttonStyle === "tertiary") && (
              <div className="st-color-grid">
                <div>
                  <label className="st-field-label">Gradient Start Color</label>
                  <div className="st-color-row">
                    <div className="st-color-swatch">
                      <input
                        type="color"
                        value={formData.buttonGradientStart}
                        onChange={(e) =>
                          handleChange("buttonGradientStart", e.target.value)
                        }
                      />
                    </div>
                    <input
                      type="text"
                      className="st-text-input"
                      value={formData.buttonGradientStart}
                      onChange={(e) =>
                        handleChange("buttonGradientStart", e.target.value)
                      }
                      placeholder="#667eea"
                    />
                  </div>
                </div>
                <div>
                  <label className="st-field-label">Gradient End Color</label>
                  <div className="st-color-row">
                    <div className="st-color-swatch">
                      <input
                        type="color"
                        value={formData.buttonGradientEnd}
                        onChange={(e) =>
                          handleChange("buttonGradientEnd", e.target.value)
                        }
                      />
                    </div>
                    <input
                      type="text"
                      className="st-text-input"
                      value={formData.buttonGradientEnd}
                      onChange={(e) =>
                        handleChange("buttonGradientEnd", e.target.value)
                      }
                      placeholder="#764ba2"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.buttonStyle === "custom" && (
              <div className="st-color-grid">
                <div>
                  <label className="st-field-label">Border Radius</label>
                  <input
                    type="text"
                    className="st-plain-input"
                    value={formData.buttonRadius}
                    onChange={(e) =>
                      handleChange("buttonRadius", e.target.value)
                    }
                    placeholder="8px"
                  />
                </div>
                <div>
                  <label className="st-field-label">Border Color</label>
                  <div className="st-color-row">
                    <div className="st-color-swatch">
                      <input
                        type="color"
                        value={formData.buttonBorderColor}
                        onChange={(e) =>
                          handleChange("buttonBorderColor", e.target.value)
                        }
                      />
                    </div>
                    <input
                      type="text"
                      className="st-text-input"
                      value={formData.buttonBorderColor}
                      onChange={(e) =>
                        handleChange("buttonBorderColor", e.target.value)
                      }
                      placeholder="#d1d5db"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview */}
            <div>
              <div className="st-preview-label">Live Preview</div>
              <div className="st-preview-btn" style={getPreviewStyle()}>
                ✨ {formData.buttonText || "Virtual Try-On"}
              </div>
            </div>
          </s-stack>
        </s-section>

        {/* Modal Customization */}
        <s-section heading="Modal Customization">
          <s-text-field
            label="Modal Title"
            value={formData.modalTitle}
            onChange={(e) => handleChange("modalTitle", e.target.value)}
          />
        </s-section>

        {/* Lead Capture */}
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
                onChange={(e) =>
                  handleChange("discountCode", e.target.value)
                }
                details="Offer a discount code after email submission"
              />
            )}
          </s-stack>
        </s-section>

        {/* Save Action */}
        <s-section>
          <div className="st-save-bar">
            <s-button type="submit" {...(isLoading ? { loading: true } : {})}>
              {isLoading ? "Saving…" : "Save Settings"}
            </s-button>
            <s-text variant="subdued" size="small">
              Changes apply to your storefront immediately after saving.
            </s-text>
          </div>
        </s-section>
      </form>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
