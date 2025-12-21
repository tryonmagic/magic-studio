import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const templates = await prisma.tryOnTemplate.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  // Get default templates if none exist
  const defaultTemplates = [
    {
      type: "upper_body",
      name: "Upper body",
      description:
        "Ideal for showcasing upper-body apparel like t-shirts, hoodies, full-sleeves, tops, blazers, dresses, and jacket.",
    },
    {
      type: "full_body",
      name: "Full body",
      description:
        "Suitable for complete outfits including dresses, jumpsuits, suits, coats, and coordinated sets.",
    },
    {
      type: "bottom_body",
      name: "Bottom body",
      description:
        "Perfect for bottoms such as skirts, pants, jeans, shorts, leggings, long-pants, and trousers.",
    },
  ];

  return { templates, defaultTemplates };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create") {
    const type = formData.get("type");
    const name = formData.get("name");

    await prisma.tryOnTemplate.create({
      data: {
        shop,
        type,
        name,
        isActive: true,
      },
    });

    return { success: true, message: "Template created successfully" };
  }

  if (action === "toggle") {
    const id = formData.get("id");
    const template = await prisma.tryOnTemplate.findUnique({
      where: { id },
    });

    if (template) {
      await prisma.tryOnTemplate.update({
        where: { id },
        data: { isActive: !template.isActive },
      });
    }

    return { success: true, message: "Template updated" };
  }

  if (action === "delete") {
    const id = formData.get("id");
    await prisma.tryOnTemplate.delete({
      where: { id },
    });

    return { success: true, message: "Template deleted" };
  }

  return { success: false };
};

export default function Templates() {
  const { templates, defaultTemplates } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  const handleCreateTemplate = (type, name) => {
    const formData = new FormData();
    formData.append("action", "create");
    formData.append("type", type);
    formData.append("name", name);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleToggleTemplate = (id) => {
    const formData = new FormData();
    formData.append("action", "toggle");
    formData.append("id", id);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleDeleteTemplate = (id) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", id);
      fetcher.submit(formData, { method: "POST" });
    }
  };

  const getTemplateIcon = (type) => {
    switch (type) {
      case "upper_body":
        return "👕";
      case "full_body":
        return "🧥";
      case "bottom_body":
        return "👖";
      default:
        return "👔";
    }
  };

  return (
    <s-page heading="Try-On Templates">
      <s-section>
        <s-paragraph>
          Choose which template types to enable for your virtual try-on feature.
          Templates automatically adapt to the product type.
        </s-paragraph>
      </s-section>

      <s-section heading="Available Templates">
        <s-stack direction="block" gap="large">
          {defaultTemplates.map((template) => {
            const existingTemplate = templates.find(
              (t) => t.type === template.type,
            );
            const isActive = existingTemplate?.isActive || false;
            const hasTemplate = !!existingTemplate;

            return (
              <s-box
                key={template.type}
                padding="large"
                borderWidth="base"
                borderRadius="base"
                background={isActive ? "success-subdued" : "subdued"}
              >
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base" alignment="center">
                    <s-text style={{ fontSize: "2rem" }}>
                      {getTemplateIcon(template.type)}
                    </s-text>
                    <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                      <s-text variant="strong" size="large">
                        {template.name}
                      </s-text>
                      <s-text variant="subdued">{template.description}</s-text>
                    </s-stack>
                    {isActive && (
                      <s-badge variant="success">Active</s-badge>
                    )}
                  </s-stack>

                  <s-stack direction="inline" gap="base">
                    {!hasTemplate ? (
                      <s-button
                        onClick={() =>
                          handleCreateTemplate(template.type, template.name)
                        }
                        {...(fetcher.state === "submitting"
                          ? { loading: true }
                          : {})}
                      >
                        Create funnel
                      </s-button>
                    ) : (
                      <>
                        <s-button
                          onClick={() => handleToggleTemplate(existingTemplate.id)}
                          variant={isActive ? "secondary" : "primary"}
                          {...(fetcher.state === "submitting"
                            ? { loading: true }
                            : {})}
                        >
                          {isActive ? "Disable" : "Enable"}
                        </s-button>
                        <s-button
                          onClick={() => handleDeleteTemplate(existingTemplate.id)}
                          variant="tertiary"
                        >
                          Delete
                        </s-button>
                      </>
                    )}
                  </s-stack>
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-section>

      {templates.length > 0 && (
        <s-section heading="Active Templates">
          <s-stack direction="block" gap="base">
            {templates
              .filter((t) => t.isActive)
              .map((template) => (
                <s-box
                  key={template.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="inline" gap="base" alignment="center">
                    <s-text>{getTemplateIcon(template.type)}</s-text>
                    <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                      <s-text variant="strong">{template.name}</s-text>
                      <s-text variant="subdued" size="small">
                        Type: {template.type.replace("_", " ")}
                      </s-text>
                    </s-stack>
                    <s-badge variant="success">Active</s-badge>
                  </s-stack>
                </s-box>
              ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
