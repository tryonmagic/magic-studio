import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await prisma.shopSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await prisma.shopSettings.create({ data: { shop } });
  }

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

  const successRate =
    totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

  return {
    settings,
    stats: { totalSessions, completedSessions, failedSessions, successRate },
    recentSessions,
  };
};

const styles = `
  .db-hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 14px;
    padding: 28px 32px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    box-shadow: 0 4px 20px rgba(102,126,234,0.35);
  }
  .db-hero-text h2 {
    font-size: 21px;
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: -0.3px;
  }
  .db-hero-text p {
    font-size: 14px;
    opacity: 0.88;
    margin: 0;
    max-width: 380px;
    line-height: 1.5;
  }
  .db-hero-metric {
    text-align: right;
    flex-shrink: 0;
    padding-left: 32px;
  }
  .db-hero-num {
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -2px;
  }
  .db-hero-lbl {
    font-size: 13px;
    opacity: 0.85;
    margin-top: 6px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .db-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  @media (max-width: 700px) { .db-stats { grid-template-columns: repeat(1, 1fr); } }

  .db-stat {
    position: relative;
    background: white;
    border-radius: 12px;
    padding: 20px 20px 20px 24px;
    border: 1px solid #e4e5e7;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    overflow: hidden;
  }
  .db-stat::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    border-radius: 0;
  }
  .db-stat.blue::before { background: linear-gradient(180deg, #6366f1, #818cf8); }
  .db-stat.green::before { background: linear-gradient(180deg, #10b981, #34d399); }
  .db-stat.teal::before { background: linear-gradient(180deg, #06b6d4, #22d3ee); }
  .db-stat-icon { font-size: 22px; margin-bottom: 10px; line-height: 1; }
  .db-stat-num {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1.5px;
    line-height: 1;
    color: #1a1a2e;
  }
  .db-stat-lbl {
    font-size: 11px;
    font-weight: 600;
    color: #6d7175;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-top: 6px;
  }

  .db-credit-track {
    background: #f1f2f4;
    border-radius: 100px;
    height: 10px;
    overflow: hidden;
    margin: 10px 0;
  }
  .db-credit-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.5s ease;
  }
  .db-credit-badge {
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .db-sessions-wrap { display: flex; flex-direction: column; gap: 8px; }
  .db-session {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: white;
    border: 1px solid #e4e5e7;
    border-radius: 10px;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .db-session:hover {
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    border-color: #c9cccf;
  }
  .db-session-img {
    width: 52px;
    height: 52px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: #f1f2f4;
  }
  .db-session-info { flex: 1; min-width: 0; }
  .db-session-title {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .db-session-date {
    font-size: 12px;
    color: #8c9196;
    margin-top: 3px;
  }

  .db-empty {
    text-align: center;
    padding: 52px 24px;
    background: #f9fafb;
    border-radius: 12px;
    border: 2px dashed #e4e5e7;
  }
  .db-empty-icon { font-size: 44px; margin-bottom: 14px; }
  .db-empty-title { font-size: 16px; font-weight: 600; color: #4a4a4a; margin-bottom: 6px; }
  .db-empty-desc { font-size: 14px; color: #8c9196; line-height: 1.5; }

  .db-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .db-view-all {
    display: inline-block;
    margin-top: 14px;
    font-size: 14px;
    font-weight: 500;
    color: #667eea;
    text-decoration: none;
  }
  .db-view-all:hover { text-decoration: underline; }
`;

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
      <style>{styles}</style>

      {/* Hero + Stats */}
      <s-section>
        <div className="db-hero">
          <div className="db-hero-text">
            <h2>Welcome to Magic Studio ✨</h2>
            <p>
              AI-powered virtual try-on for your Shopify store. Monitor
              performance and manage your experience below.
            </p>
          </div>
          <div className="db-hero-metric">
            <div className="db-hero-num">{stats.successRate}%</div>
            <div className="db-hero-lbl">Success Rate</div>
          </div>
        </div>

        <div className="db-stats">
          <div className="db-stat blue">
            <div className="db-stat-icon">🎯</div>
            <div className="db-stat-num">{stats.totalSessions}</div>
            <div className="db-stat-lbl">Total Try-Ons</div>
          </div>
          <div className="db-stat green">
            <div className="db-stat-icon">✅</div>
            <div className="db-stat-num">{stats.completedSessions}</div>
            <div className="db-stat-lbl">Completed</div>
          </div>
          <div className="db-stat teal">
            <div className="db-stat-icon">📊</div>
            <div className="db-stat-num">{stats.successRate}%</div>
            <div className="db-stat-lbl">Success Rate</div>
          </div>
        </div>
      </s-section>

      {/* Credits Usage */}
      <s-section heading="Credits Usage">
        <s-stack direction="block" gap="tight">
          <s-stack direction="inline" gap="base" alignment="center">
            <s-stack direction="block" gap="none" style={{ flex: 1 }}>
              <s-text variant="strong">
                {settings.usedCredits} / {settings.monthlyCredits} credits used
              </s-text>
              <s-text variant="subdued" size="small">
                {creditsRemaining} credits remaining this month
              </s-text>
            </s-stack>
            <div
              className="db-credit-badge"
              style={{
                background: creditsPercentage > 80 ? "#fee2e2" : "#d1fae5",
                color: creditsPercentage > 80 ? "#dc2626" : "#059669",
              }}
            >
              {creditsPercentage}%
            </div>
          </s-stack>

          <div className="db-credit-track">
            <div
              className="db-credit-fill"
              style={{
                width: `${creditsPercentage}%`,
                background:
                  creditsPercentage > 80
                    ? "linear-gradient(90deg, #f97316, #ef4444)"
                    : "linear-gradient(90deg, #10b981, #059669)",
              }}
            />
          </div>

          {creditsRemaining < 5 && (
            <s-banner variant="warning">
              You&apos;re running low on credits! Consider upgrading your plan.
            </s-banner>
          )}
        </s-stack>
      </s-section>

      {/* Quick Actions */}
      <s-section heading="Quick Actions">
        <div className="db-actions">
          <s-link href="/app/settings">
            <s-button>Configure Settings</s-button>
          </s-link>
          <s-link href="/app/try-on-feed">
            <s-button variant="secondary">View All Try-Ons</s-button>
          </s-link>
        </div>
      </s-section>

      {/* Recent Try-Ons */}
      <s-section heading="Recent Try-Ons">
        {recentSessions.length === 0 ? (
          <div className="db-empty">
            <div className="db-empty-icon">👗</div>
            <div className="db-empty-title">No try-on sessions yet</div>
            <div className="db-empty-desc">
              Try-on sessions will appear here once customers start using the
              virtual try-on feature
            </div>
          </div>
        ) : (
          <>
            <div className="db-sessions-wrap">
              {recentSessions.map((session) => (
                <div key={session.id} className="db-session">
                  <img
                    src={session.productImage}
                    alt={session.productTitle}
                    className="db-session-img"
                  />
                  <div className="db-session-info">
                    <div className="db-session-title">
                      {session.productTitle}
                    </div>
                    <div className="db-session-date">
                      {formatDate(session.createdAt)}
                    </div>
                  </div>
                  <s-badge variant={getStatusBadge(session.status)}>
                    {session.status}
                  </s-badge>
                </div>
              ))}
            </div>
            <s-link href="/app/try-on-feed">
              <a className="db-view-all">View all try-ons →</a>
            </s-link>
          </>
        )}
      </s-section>

      {/* Setup Banner */}
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
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
