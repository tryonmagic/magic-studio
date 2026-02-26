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

  const where = {
    shop,
    ...(searchQuery && {
      OR: [
        { productTitle: { contains: searchQuery } },
        { productId: { contains: searchQuery } },
      ],
    }),
  };

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

const styles = `
  .feed-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .feed-count-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f1f2f4;
    color: #6d7175;
    font-size: 13px;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .feed-search-row {
    display: flex;
    gap: 10px;
    flex: 1;
    max-width: 480px;
  }

  .feed-cards { display: flex; flex-direction: column; gap: 10px; }

  .feed-card {
    background: white;
    border: 1px solid #e4e5e7;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .feed-card:hover {
    box-shadow: 0 3px 12px rgba(0,0,0,0.08);
    border-color: #c9cccf;
  }

  .feed-info { flex: 1; min-width: 0; }
  .feed-product-title {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .feed-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-bottom: 12px;
  }
  .feed-meta-item {
    font-size: 12px;
    color: #8c9196;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .feed-meta-icon { font-size: 13px; }

  .feed-images {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    align-items: flex-start;
  }
  .feed-img-wrap { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .feed-img {
    width: 88px;
    height: 108px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #e4e5e7;
    display: block;
    background: #f9fafb;
  }
  .feed-img-label {
    font-size: 11px;
    color: #8c9196;
    font-weight: 500;
    text-align: center;
  }
  .feed-img-placeholder {
    width: 88px;
    height: 108px;
    border-radius: 8px;
    border: 1.5px dashed #d1d5db;
    background: #f9fafb;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 10px;
    color: #b5b5b5;
    text-align: center;
  }
  .feed-img-placeholder-icon { font-size: 22px; opacity: 0.4; }
  .feed-img-generated {
    cursor: zoom-in;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .feed-img-generated:hover {
    transform: scale(1.04);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }

  .feed-empty {
    text-align: center;
    padding: 64px 24px;
    background: #f9fafb;
    border-radius: 12px;
    border: 2px dashed #e4e5e7;
  }
  .feed-empty-icon { font-size: 52px; margin-bottom: 16px; }
  .feed-empty-title { font-size: 16px; font-weight: 600; color: #4a4a4a; margin-bottom: 8px; }
  .feed-empty-desc { font-size: 14px; color: #8c9196; }

  .feed-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px 0 4px;
  }
  .feed-page-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    background: white;
    border: 1px solid #c9cccf;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #1a1a2e;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.12s, border-color 0.12s;
  }
  .feed-page-btn:hover { background: #f1f2f4; border-color: #8c9196; }
  .feed-page-info {
    font-size: 14px;
    color: #6d7175;
    font-weight: 500;
    padding: 0 4px;
  }

  /* Zoom modal */
  .zoom-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.92);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .zoom-image-wrap {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .zoom-controls {
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10000;
  }
  .zoom-btn {
    width: 46px;
    height: 46px;
    background: rgba(255,255,255,0.95);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1a2e;
    transition: transform 0.1s, background 0.1s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  .zoom-btn:hover { transform: scale(1.08); background: white; }
  .zoom-btn.close { background: rgba(239,68,68,0.9); color: white; }
  .zoom-btn.close:hover { background: #ef4444; }
  .zoom-level-pill {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255,255,255,0.95);
    padding: 6px 18px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 10000;
  }
  .zoom-hint {
    position: fixed;
    bottom: 72px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.55);
    font-size: 12px;
    white-space: nowrap;
    z-index: 10000;
  }
`;

export default function TryOnFeed() {
  const { sessions, totalCount, currentPage, totalPages } = useLoaderData();
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  const openZoomModal = (imageUrl) => {
    setZoomedImage(imageUrl);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const closeZoomModal = () => {
    setZoomedImage(null);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    if (!zoomedImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(5, prev + 0.25));
  const handleZoomOut = () =>
    setZoomLevel((prev) => {
      const next = Math.max(0.5, prev - 0.25);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  return (
    <s-page heading="Try-Ons Feed">
      <style>{styles}</style>

      <s-section>
        <div className="feed-toolbar">
          <form onSubmit={handleSearch} className="feed-search-row">
            <s-text-field
              name="search"
              placeholder="Search by product ID or title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <s-button type="submit">Search</s-button>
          </form>
          <div className="feed-count-pill">
            📋 {totalCount} session{totalCount !== 1 ? "s" : ""}
          </div>
        </div>
      </s-section>

      <s-section>
        {sessions.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">🔍</div>
            <div className="feed-empty-title">No try-on sessions found</div>
            <div className="feed-empty-desc">
              {searchQuery
                ? "Try a different search term."
                : "Sessions will appear here once customers use the virtual try-on feature."}
            </div>
            {searchQuery && (
              <div style={{ marginTop: "16px" }}>
                <s-link href="/app/try-on-feed">Clear search</s-link>
              </div>
            )}
          </div>
        ) : (
          <div className="feed-cards">
            {sessions.map((session) => (
              <div key={session.id} className="feed-card">
                {/* Info */}
                <div className="feed-info">
                  <div className="feed-product-title">
                    {session.productTitle}
                  </div>
                  <div className="feed-meta">
                    <span className="feed-meta-item">
                      <span className="feed-meta-icon">📅</span>
                      {formatDate(session.createdAt)}
                    </span>
                    <span className="feed-meta-item">
                      <span className="feed-meta-icon">👔</span>
                      {session.templateType.replace(/_/g, " ")}
                    </span>
                    {session.customerEmail && (
                      <span className="feed-meta-item">
                        <span className="feed-meta-icon">✉️</span>
                        {session.customerEmail}
                      </span>
                    )}
                  </div>
                  <s-badge variant={getStatusBadge(session.status)}>
                    {session.status}
                  </s-badge>
                </div>

                {/* Images */}
                <div className="feed-images">
                  {/* Product */}
                  <div className="feed-img-wrap">
                    {session.productImage ? (
                      <img
                        src={session.productImage}
                        alt="Product"
                        className="feed-img"
                      />
                    ) : (
                      <div className="feed-img-placeholder">
                        <span className="feed-img-placeholder-icon">🛍️</span>
                        No image
                      </div>
                    )}
                    <span className="feed-img-label">Product</span>
                  </div>

                  {/* Uploaded */}
                  <div className="feed-img-wrap">
                    {session.uploadedImage ? (
                      <img
                        src={session.uploadedImage}
                        alt="Uploaded"
                        className="feed-img"
                      />
                    ) : (
                      <div className="feed-img-placeholder">
                        <span className="feed-img-placeholder-icon">📷</span>
                        Not uploaded
                      </div>
                    )}
                    <span className="feed-img-label">Customer</span>
                  </div>

                  {/* Generated */}
                  <div className="feed-img-wrap">
                    {session.generatedImage ? (
                      <img
                        src={session.generatedImage}
                        alt="Generated try-on result"
                        className="feed-img feed-img-generated"
                        onClick={() => openZoomModal(session.generatedImage)}
                        title="Click to zoom"
                      />
                    ) : (
                      <div className="feed-img-placeholder">
                        <span className="feed-img-placeholder-icon">⏳</span>
                        {session.status === "failed" ? "Failed" : "Processing"}
                      </div>
                    )}
                    <span className="feed-img-label">
                      {session.generatedImage ? "Result ↗" : "Result"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="feed-pagination">
            {currentPage > 1 ? (
              <a
                href={`/app/try-on-feed?page=${currentPage - 1}`}
                className="feed-page-btn"
              >
                ← Previous
              </a>
            ) : (
              <span
                className="feed-page-btn"
                style={{ opacity: 0.4, cursor: "default" }}
              >
                ← Previous
              </span>
            )}
            <span className="feed-page-info">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages ? (
              <a
                href={`/app/try-on-feed?page=${currentPage + 1}`}
                className="feed-page-btn"
              >
                Next →
              </a>
            ) : (
              <span
                className="feed-page-btn"
                style={{ opacity: 0.4, cursor: "default" }}
              >
                Next →
              </span>
            )}
          </div>
        )}
      </s-section>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          className="zoom-overlay"
          onClick={closeZoomModal}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          <div
            className="zoom-image-wrap"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
          >
            <img
              src={zoomedImage}
              alt="Zoomed try-on result"
              style={{
                maxWidth: "85vw",
                maxHeight: "85vh",
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                transition: isDragging ? "none" : "transform 0.1s",
                userSelect: "none",
                borderRadius: "4px",
              }}
              draggable={false}
            />
          </div>

          {/* Controls */}
          <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-btn" onClick={handleZoomIn} title="Zoom in">
              +
            </button>
            <button className="zoom-btn" onClick={handleZoomOut} title="Zoom out">
              −
            </button>
            {zoomLevel !== 1 && (
              <button className="zoom-btn" onClick={handleResetZoom} title="Reset zoom" style={{ fontSize: "12px" }}>
                1:1
              </button>
            )}
            <button className="zoom-btn close" onClick={closeZoomModal} title="Close">
              ×
            </button>
          </div>

          <div className="zoom-level-pill" onClick={(e) => e.stopPropagation()}>
            {Math.round(zoomLevel * 100)}%
          </div>
          <div className="zoom-hint" onClick={(e) => e.stopPropagation()}>
            Scroll to zoom · Drag to pan · Click outside to close
          </div>
        </div>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
