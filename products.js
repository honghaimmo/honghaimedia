
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/products
// Tìm kiếm, lọc và phân trang sản phẩm
router.get("/", async (req, res) => {
  try {
    const {
      q = "",
      category,
      minPrice,
      maxPrice,
      sort = "newest",
      page = "1",
      limit = "24",
      featured,
      inStock,
      sale
    } = req.query;

    const currentPage = Math.max(1, parseNumber(page, 1));
    const pageSize = Math.min(100, Math.max(1, parseNumber(limit, 24)));

    const where = {
      isActive: true
    };

    if (category) {
      where.category = {
        equals: String(category),
        mode: "insensitive"
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = Math.max(0, parseNumber(minPrice, 0));
      }
      if (maxPrice !== undefined) {
        where.price.lte = Math.max(0, parseNumber(maxPrice, 0));
      }
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    if (inStock === "true") {
      where.stock = { gt: 0 };
    }

    if (sale === "true") {
      where.originalPrice = { gt: 0 };
    }

    const orderBy = {
      newest: { createdAt: "desc" },
      oldest: { createdAt: "asc" },
      price_asc: { price: "asc" },
      price_desc: { price: "desc" },
      popular: { soldCount: "desc" },
      rating: { averageRating: "desc" }
    }[sort] || { createdAt: "desc" };

    const search = String(q).trim();
    const products = await prisma.product.findMany({
      where: search
        ? {
            ...where,
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } }
            ]
          }
        : where,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize
    });

    // Bổ sung tìm không dấu trên trang kết quả hiện tại.
    // Tìm không dấu toàn bộ dữ liệu cần thêm cột searchNormalized
    // và migration ở giai đoạn cơ sở dữ liệu.
    const normalizedQuery = normalizeText(search);
    const result = normalizedQuery
      ? products.filter(product =>
          normalizeText([
            product.name,
            product.description,
            product.category,
            product.sku
          ].filter(Boolean).join(" ")).includes(normalizedQuery)
        )
      : products;

    const total = await prisma.product.count({
      where: search
        ? {
            ...where,
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } }
            ]
          }
        : where
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error("Product list error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách sản phẩm"
    });
  }
});

// GET /api/products/:id
// Chi tiết một sản phẩm
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        isActive: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error("Product detail error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết sản phẩm"
    });
  }
});

module.exports = router;
