import Anthropic from "@anthropic-ai/sdk";
import Product from "../models/Product.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/ai/recommendations/:productId
// Returns AI-curated product recommendations for a given product
export const getProductRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;

    // Fetch the viewed product and all in-stock products
    const [viewedProduct, allProducts] = await Promise.all([
      Product.findById(productId),
      Product.find({ inStock: true }),
    ]);

    if (!viewedProduct) {
      return res.json({ success: false, message: "Product not found" });
    }

    // Build a compact product catalogue for the prompt (avoid huge payloads)
    const catalogue = allProducts
      .filter((p) => p._id.toString() !== productId)
      .map((p) => ({
        id: p._id.toString(),
        name: p.name,
        category: p.category,
        offerPrice: p.offerPrice,
        description: p.description.slice(0, 2).join(". "),
      }));

    const systemPrompt = `You are an expert grocery shopping assistant for GreenCart, an online grocery store.
Your job is to recommend complementary products that pair well with what the customer is viewing.
Think about meal planning, nutritional balance, common recipe pairings, and lifestyle fit.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

    const userPrompt = `The customer is viewing: "${viewedProduct.name}" (Category: ${viewedProduct.category})
Description: ${viewedProduct.description.join(". ")}

From the catalogue below, pick the 4 best complementary products.
For each, write a SHORT (max 12 words) reason why it pairs well.

Catalogue:
${JSON.stringify(catalogue, null, 2)}

Respond ONLY with this JSON shape:
{
  "headline": "short catchy headline for the recommendations section (max 8 words)",
  "recommendations": [
    { "id": "<product id>", "reason": "<short pairing reason>" }
  ]
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].text.trim();
    const parsed = JSON.parse(raw);

    // Hydrate recommendations with full product data
    const hydratedRecs = parsed.recommendations
      .map((rec) => {
        const product = allProducts.find((p) => p._id.toString() === rec.id);
        if (!product) return null;
        return {
          _id: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          offerPrice: product.offerPrice,
          image: product.image,
          inStock: product.inStock,
          reason: rec.reason,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      headline: parsed.headline,
      recommendations: hydratedRecs,
    });
  } catch (error) {
    console.error("AI Recommendation error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// POST /api/ai/chat
// AI shopping assistant — answers grocery queries and recommends products
export const aiShoppingChat = async (req, res) => {
  try {
    const { message, cartItems = {}, conversationHistory = [] } = req.body;

    // Fetch products for context
    const allProducts = await Product.find({ inStock: true }).select(
      "name category offerPrice description"
    );

    // Build cart context
    let cartContext = "";
    if (Object.keys(cartItems).length > 0) {
      const cartProductIds = Object.keys(cartItems);
      const cartProducts = allProducts.filter((p) =>
        cartProductIds.includes(p._id.toString())
      );
      cartContext = `\nCustomer's current cart: ${cartProducts.map((p) => p.name).join(", ")}`;
    }

    const systemPrompt = `You are Maya, a friendly and knowledgeable AI shopping assistant for GreenCart grocery store.
You help customers find the right products, suggest meal ideas, and make smart shopping decisions.
Keep responses concise (2-4 sentences max) and always end with 2-3 specific product recommendations from the store catalogue when relevant.
Format product suggestions as: **Product Name** - reason why.
Be warm, helpful, and conversational.${cartContext}

Store catalogue:
${allProducts
  .map(
    (p) =>
      `- ${p.name} (${p.category}): ₹${p.offerPrice} — ${p.description
        .slice(0, 1)
        .join("")}`
  )
  .join("\n")}`;

    // Build conversation history for multi-turn context
    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    res.json({
      success: true,
      reply: response.content[0].text,
    });
  } catch (error) {
    console.error("AI Chat error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
