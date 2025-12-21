import { useState } from "react";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;

  // Build where clause
  const where = {
    shop,
    ...(searchQuery && {
      OR: [
        { productTitle: { contains: searchQuery } },
        { productId: { contains: searchQuery } },
      ],
    }),
  };

  // Get sessions with pagination
  const [sessions, totalCount] = await Promise.all([
    prisma.tryOnSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tryOnSession.count({ where }),
  ]);

  return {
    sessions,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
};

export default function TryOnFeed() {
  const { sessions, totalCount, currentPage, totalPages } = useLoaderData();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const form = e.target;
    const search = new FormData(form).get("search");
    window.location.href = `/app/try-on-feed?search=${encodeURIComponent(search)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
    <s-page heading="Try-Ons Feed">
      <s-section>
        <s-paragraph>
          View all try-on sessions made by your customers
        </s-paragraph>

        <form onSubmit={handleSearch}>
          <s-stack direction="inline" gap="base">
            <s-text-field
              name="search"
              placeholder="Search by product ID or title e.g. T-Shirt"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <s-button type="submit">Search</s-button>
          </s-stack>
        </form>
      </s-section>

      <s-section>
        <s-paragraph>
          <s-text variant="strong">Total sessions: {totalCount}</s-text>
        </s-paragraph>

        {sessions.length === 0 ? (
          <s-box padding="large">
            <s-stack direction="block" gap="base" alignment="center">
              <s-text variant="subdued">No try-on sessions found</s-text>
              {searchQuery && (
                <s-link href="/app/try-on-feed">Clear search</s-link>
              )}
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {sessions.map((session) => (
              <s-box
                key={session.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base" alignment="start">
                  {/* Product Info */}
                  <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                    <s-text variant="strong">{session.productTitle}</s-text>
                    <s-text variant="subdued" size="small">
                      Tried on: {formatDate(session.createdAt)}
                    </s-text>
                    <s-text variant="subdued" size="small">
                      Template: {session.templateType.replace("_", " ")}
                    </s-text>
                    {session.customerEmail && (
                      <s-text variant="subdued" size="small">
                        Email: {session.customerEmail}
                      </s-text>
                    )}
                    <s-badge variant={getStatusBadge(session.status)}>
                      {session.status}
                    </s-badge>
                  </s-stack>

                  {/* Product Image */}
                  <s-box style={{ width: "100px" }}>
                    <img
                      src={session.productImage}
                      alt="Product"
                      style={{
                        width: "100%",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                    <s-text
                      variant="subdued"
                      size="small"
                      style={{ textAlign: "center", display: "block" }}
                    >
                      Product
                    </s-text>
                  </s-box>

                  {/* Uploaded Image */}
                  <s-box style={{ width: "100px" }}>
                    {session.uploadedImage ? (
                      <>
                        <img
                          src={session.uploadedImage}
                          alt="Uploaded"
                          style={{
                            width: "100%",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                        <s-text
                          variant="subdued"
                          size="small"
                          style={{ textAlign: "center", display: "block" }}
                        >
                          Uploaded
                        </s-text>
                      </>
                    ) : (
                      <s-text variant="subdued">No image</s-text>
                    )}
                  </s-box>

                  {/* Generated Image */}
                  <s-box style={{ width: "100px" }}>
                    {session.generatedImage ? (
                      <>
                        <img
                          src={session.generatedImage}
                          alt="Generated"
                          style={{
                            width: "100%",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                        <s-text
                          variant="subdued"
                          size="small"
                          style={{ textAlign: "center", display: "block" }}
                        >
                          Generated
                        </s-text>
                      </>
                    ) : (
                      <s-text variant="subdued">Processing...</s-text>
                    )}
                  </s-box>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <s-stack direction="inline" gap="base" alignment="center">
            {currentPage > 1 && (
              <s-link href={`/app/try-on-feed?page=${currentPage - 1}`}>
                Previous
              </s-link>
            )}
            <s-text>
              Page {currentPage} of {totalPages}
            </s-text>
            {currentPage < totalPages && (
              <s-link href={`/app/try-on-feed?page=${currentPage + 1}`}>
                Next
              </s-link>
            )}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
