import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get shop settings
  let settings = await prisma.shopSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: { shop },
    });
  }

  // Get statistics
  const [totalSessions, completedSessions, failedSessions, recentSessions] =
    await Promise.all([
      prisma.tryOnSession.count({ where: { shop } }),
      prisma.tryOnSession.count({ where: { shop, status: "completed" } }),
      prisma.tryOnSession.count({ where: { shop, status: "failed" } }),
      prisma.tryOnSession.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  // Get active templates count
  const activeTemplates = await prisma.tryOnTemplate.count({
    where: { shop, isActive: true },
  });

  const successRate =
    totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

  return {
    settings,
    stats: {
      totalSessions,
      completedSessions,
      failedSessions,
      successRate,
      activeTemplates,
    },
    recentSessions,
  };
};

export default function Dashboard() {
  const { settings, stats, recentSessions } = useLoaderData();

  const creditsRemaining = settings.monthlyCredits - settings.usedCredits;
  const creditsPercentage = Math.round(
    (settings.usedCredits / settings.monthlyCredits) * 100,
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "warning",
      processing: "info",
      completed: "success",
      failed: "critical",
    };
    return variants[status] || "default";
  };

  return (
    <s-page heading="Dashboard">
      <s-section>
        <s-paragraph>
          Welcome to your AI Virtual Try-On app! Monitor your usage, view
          statistics, and manage your virtual try-on experience.
        </s-paragraph>
      </s-section>

      {/* Quick Stats */}
      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <s-box
            padding="large"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
            style={{ flex: 1 }}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="subdued">Total Try-Ons</s-text>
              <s-text variant="strong" size="large">
                {stats.totalSessions}
              </s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            borderWidth="base"
            borderRadius="base"
            background="success-subdued"
            style={{ flex: 1 }}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="subdued">Completed</s-text>
              <s-text variant="strong" size="large">
                {stats.completedSessions}
              </s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            borderWidth="base"
            borderRadius="base"
            background="info-subdued"
            style={{ flex: 1 }}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="subdued">Success Rate</s-text>
              <s-text variant="strong" size="large">
                {stats.successRate}%
              </s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            borderWidth="base"
            borderRadius="base"
            background="warning-subdued"
            style={{ flex: 1 }}
          >
            <s-stack direction="block" gap="tight">
              <s-text variant="subdued">Active Templates</s-text>
              <s-text variant="strong" size="large">
                {stats.activeTemplates}
              </s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Credits Usage */}
      <s-section heading="Credits Usage">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignment="center">
            <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
              <s-text variant="strong" size="large">
                {settings.usedCredits} / {settings.monthlyCredits}
              </s-text>
              <s-text variant="subdued">
                {creditsRemaining} credits remaining
              </s-text>
            </s-stack>
            <s-text variant="strong" size="large">
              {creditsPercentage}%
            </s-text>
          </s-stack>

          <s-box
            background="subdued"
            borderRadius="base"
            style={{ height: "8px", width: "100%", overflow: "hidden" }}
          >
            <s-box
              background={creditsPercentage > 80 ? "critical" : "success"}
              style={{
                height: "100%",
                width: `${creditsPercentage}%`,
                transition: "width 0.3s ease",
              }}
            />
          </s-box>

          {creditsRemaining < 5 && (
            <s-banner variant="warning">
              You're running low on credits! Consider upgrading your plan.
            </s-banner>
          )}
        </s-stack>
      </s-section>

      {/* Quick Actions */}
      <s-section heading="Quick Actions">
        <s-stack direction="inline" gap="base">
          <s-link href="/app/templates">
            <s-button>Manage Templates</s-button>
          </s-link>
          <s-link href="/app/settings">
            <s-button variant="secondary">Configure Settings</s-button>
          </s-link>
          <s-link href="/app/try-on-feed">
            <s-button variant="tertiary">View All Try-Ons</s-button>
          </s-link>
        </s-stack>
      </s-section>

      {/* Recent Try-Ons */}
      <s-section heading="Recent Try-Ons">
        {recentSessions.length === 0 ? (
          <s-box padding="large" background="subdued" borderRadius="base">
            <s-stack direction="block" gap="base" alignment="center">
              <s-text variant="subdued">No try-on sessions yet</s-text>
              <s-text variant="subdued" size="small">
                Try-on sessions will appear here once customers start using the
                virtual try-on feature
              </s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {recentSessions.map((session) => (
              <s-box
                key={session.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base" alignment="center">
                  <img
                    src={session.productImage}
                    alt={session.productTitle}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                  <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                    <s-text variant="strong">{session.productTitle}</s-text>
                    <s-text variant="subdued" size="small">
                      {formatDate(session.createdAt)}
                    </s-text>
                  </s-stack>
                  <s-badge variant={getStatusBadge(session.status)}>
                    {session.status}
                  </s-badge>
                </s-stack>
              </s-box>
            ))}
            <s-link href="/app/try-on-feed">View all try-ons →</s-link>
          </s-stack>
        )}
      </s-section>

      {/* Setup Guide */}
      {!settings.tryOnApiKey && (
        <s-section heading="Setup Required">
          <s-banner variant="critical">
            <s-stack direction="block" gap="base">
              <s-text variant="strong">
                Virtual Try-On API not configured
              </s-text>
              <s-text>
                Please configure your API settings to enable virtual try-on
                functionality.
              </s-text>
              <s-link href="/app/settings">
                <s-button>Configure API Settings</s-button>
              </s-link>
            </s-stack>
          </s-banner>
        </s-section>
      )}

      {stats.activeTemplates === 0 && (
        <s-section>
          <s-banner variant="warning">
            <s-stack direction="block" gap="base">
              <s-text variant="strong">No active templates</s-text>
              <s-text>
                Create and activate templates to enable virtual try-on for
                different product types.
              </s-text>
              <s-link href="/app/templates">
                <s-button>Setup Templates</s-button>
              </s-link>
            </s-stack>
          </s-banner>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
